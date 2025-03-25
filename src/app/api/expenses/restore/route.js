// file: app/api/expenses/restore/route.js
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";
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

    // Find the expense to ensure it exists and is deleted
    const expense = await prisma.expense.findUnique({
      where: { id }
    });
    
    if (!expense) {
      return createSafeResponse({ message: "Expense not found" }, 404);
    }
    
    // Check if the expense is already active
    if (!expense.isDeleted) {
      return createSafeResponse({ message: "Expense is already active" }, 400);
    }

    // Restore the expense
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
        updatedAt: new Date(),
        updatedById: restoredBy || user?.userId
      }
    });
    
    // If the expense is associated with a transaction, recalculate the capital cost
    if (expense.transactionId) {
      try {
        // Check if the transaction exists
        const transaction = await prisma.transaction.findUnique({
          where: { id: expense.transactionId }
        });
        
        if (transaction) {
          // Find all active expenses for this transaction (including the newly restored one)
          const activeExpenses = await prisma.expense.findMany({
            where: {
              transactionId: expense.transactionId,
              isDeleted: false
            }
          });
          
          // Calculate the new total expenses (capital cost)
          const newCapitalCost = activeExpenses.reduce(
            (sum, exp) => sum + (exp.amount || 0), 
            0
          );
          
          // Update the transaction with the new capital cost
          await prisma.transaction.update({
            where: { id: expense.transactionId },
            data: { capitalCost: newCapitalCost }
          });
        }
      } catch (transactionError) {
        console.error("Error updating transaction capital cost:", transactionError);
        // Continue even if transaction update fails - don't block the expense restoration
      }
    }

    return createSafeResponse({ 
      message: "Expense restored successfully",
      expense: updatedExpense
    });
  } catch (error) {
    console.error("Error in expense restore:", error);
    return createSafeResponse({ 
      message: "Failed to restore expense", 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
}