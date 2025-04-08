// Fixed src/app/api/expenses/restore/route.js
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth/auth";
import { createSafeResponse } from "@/lib/api";

const prisma = new PrismaClient();

export async function POST(request) {
  // Verify the auth token
  const { isAuthenticated, user } = await verifyAuthToken(request);
  
  if (!isAuthenticated) {
    return createSafeResponse({ message: "Unauthorized" }, 401);
  }
  
  try {
    const { id, restoredBy } = await request.json();
    
    if (!id) {
      return createSafeResponse({ message: "Expense ID is required" }, 400);
    }

    // Find the expense to ensure it exists and is archived
    const expense = await prisma.expense.findUnique({
      where: { id }
    });
    
    if (!expense) {
      return createSafeResponse({ message: "Expense not found" }, 404);
    }
    
    if (!expense.isDeleted) {
      return createSafeResponse({ message: "Expense is not archived" }, 400);
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Adjust fund balance if this expense had a fund association
      if (expense.amount > 0 && expense.fundType) {
        try {
          // Get the fund balance
          const fund = await tx.fundBalance.findUnique({
            where: { fundType: expense.fundType }
          });
          
          if (fund) {
            // Update fund balance (subtract the amount back since expense is being restored)
            const newBalance = fund.currentBalance - expense.amount;
            await tx.fundBalance.update({
              where: { fundType: expense.fundType },
              data: { currentBalance: newBalance }
            });
            
            // Create a fund transaction record for this adjustment
            await tx.fundTransaction.create({
              data: {
                fundType: expense.fundType,
                transactionType: "adjustment",
                amount: -expense.amount,
                balanceAfter: newBalance,
                description: `Expense restored from archive: ${expense.category || 'Unnamed expense'}`,
                sourceType: "expense_restore",
                sourceId: expense.id,
                createdById: restoredBy || user?.userId
              }
            });
            
            console.log(`Adjusted ${expense.fundType} balance: -${expense.amount} for restored expense ${expense.id}`);
          }
        } catch (fundError) {
          console.error("Fund balance adjustment error:", fundError);
          // Continue even if fund adjustment fails
        }
      }

      // 2. Restore the expense
      const updatedExpense = await tx.expense.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedById: null,
          updatedAt: new Date(),
          updatedById: restoredBy || user?.userId
        }
      });
      
      // 3. If the expense is associated with a transaction, recalculate the capital cost
      if (expense.transactionId) {
        try {
          // Find all active expenses for this transaction
          const activeExpenses = await tx.expense.findMany({
            where: {
              transactionId: expense.transactionId,
              isDeleted: false
            }
          });
          
          // Calculate the new total expenses (capital cost)
          const newCapitalCost = activeExpenses.reduce(
            (sum, exp) => sum + (typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0),
            0
          );
          
          // Update the transaction with the new capital cost
          await tx.transaction.update({
            where: { id: expense.transactionId },
            data: { capitalCost: newCapitalCost }
          });
          
          console.log(`Updated transaction ${expense.transactionId} capital cost to ${newCapitalCost}`);
        } catch (transactionError) {
          console.error("Error updating transaction capital cost:", transactionError);
          // Continue even if transaction update fails - don't block the expense restoration
        }
      }

      return { expense: updatedExpense };
    });

    return createSafeResponse({ 
      message: "Expense restored successfully",
      expense: result.expense
    });
  } catch (error) {
    console.error("Error in expense restore:", error);
    return createSafeResponse({ 
      message: "Failed to restore expense", 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
}