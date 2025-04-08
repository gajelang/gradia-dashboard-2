// Fixed src/app/api/transactions/restore/route.js
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth/auth";
import { createSafeResponse } from "@/lib/api/api";

const prisma = new PrismaClient();

export async function POST(req) {
  // Verify auth token
  const { isAuthenticated, user } = await verifyAuthToken(req);
  
  if (!isAuthenticated) {
    return createSafeResponse({ message: "Unauthorized" }, 401);
  }
  
  try {
    const { id, restoredBy } = await req.json();
    
    if (!id) {
      return createSafeResponse({ message: "Transaction ID is required" }, 400);
    }

    // Find the transaction to ensure it exists and is deleted
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        expenses: {
          where: { isDeleted: true } // Get deleted expenses
        }
      }
    });
    
    if (!transaction) {
      return createSafeResponse({ message: "Transaction not found" }, 404);
    }

    if (!transaction.isDeleted) {
      return createSafeResponse({ message: "Transaction is not archived" }, 400);
    }

    // Start a transaction to handle both the transaction and fund balance updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Restore the transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedById: null,
          updatedAt: new Date(),
          updatedById: restoredBy || user?.userId || null
        }
      });
      
      // 2. Adjust fund balance if this was a revenue transaction
      if (transaction.amount > 0 && transaction.fundType) {
        try {
          // Get the fund balance
          const fund = await tx.fundBalance.findUnique({
            where: { fundType: transaction.fundType }
          });
          
          if (fund) {
            // Update fund balance (add the amount back since the transaction is being restored)
            const newBalance = fund.currentBalance + transaction.amount;
            await tx.fundBalance.update({
              where: { fundType: transaction.fundType },
              data: { currentBalance: newBalance }
            });
            
            // Create a fund transaction record for this adjustment
            await tx.fundTransaction.create({
              data: {
                fundType: transaction.fundType,
                transactionType: "adjustment",
                amount: transaction.amount,
                balanceAfter: newBalance,
                description: `Reversal of archive: restored transaction ${transaction.name || 'Unnamed transaction'}`,
                sourceType: "transaction_restore",
                sourceId: transaction.id,
                createdById: restoredBy || user?.userId || null
              }
            });
          }
        } catch (fundError) {
          console.error("Fund balance adjustment error:", fundError);
          // Continue even if fund adjustment fails - but log it
        }
      }
      
      // 3. Restore associated expenses if they exist
      const relatedExpenses = transaction.expenses;
      let restoredExpensesCount = 0;
      
      if (relatedExpenses && relatedExpenses.length > 0) {
        for (const expense of relatedExpenses) {
          // Restore each expense
          await tx.expense.update({
            where: { id: expense.id },
            data: {
              isDeleted: false,
              deletedAt: null,
              deletedById: null,
              updatedAt: new Date(),
              updatedById: restoredBy || user?.userId || null
            }
          });
          
          // Adjust fund balance for each expense
          if (expense.amount > 0 && expense.fundType) {
            try {
              // Get the fund balance
              const fund = await tx.fundBalance.findUnique({
                where: { fundType: expense.fundType }
              });
              
              if (fund) {
                // Subtract the amount again (since expense is being restored)
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
                    description: `Expense restored with transaction: ${expense.category || 'Unnamed expense'}`,
                    sourceType: "expense_restore",
                    sourceId: expense.id,
                    createdById: restoredBy || user?.userId || null
                  }
                });
              }
            } catch (fundError) {
              console.error("Fund balance adjustment error for expense:", fundError);
              // Continue even if fund adjustment fails - but log it
            }
          }
          
          restoredExpensesCount++;
        }
      }
      
      // 4. Recalculate capital cost for the transaction
      const activeExpenses = await tx.expense.findMany({
        where: {
          transactionId: id,
          isDeleted: false
        }
      });
      
      const newCapitalCost = activeExpenses.reduce(
        (sum, exp) => sum + (typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0), 
        0
      );
      
      // Update transaction with new capital cost
      const finalTransaction = await tx.transaction.update({
        where: { id },
        data: { capitalCost: newCapitalCost }
      });
      
      return { 
        transaction: finalTransaction, 
        restoredExpensesCount 
      };
    });

    return createSafeResponse({ 
      message: `Transaction restored successfully along with ${result.restoredExpensesCount} related expenses`,
      transaction: result.transaction
    });
  } catch (error) {
    console.error("Error in transaction restore:", error);
    return createSafeResponse({ 
      message: "Failed to restore transaction", 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
}