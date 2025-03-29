// Modified src/app/api/transactions/restore/route.js
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";
import { createSafeResponse } from "@/lib/api";

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
      where: { id }
    });
    
    if (!transaction) {
      return createSafeResponse({ message: "Transaction not found" }, 404);
    }
    
    if (!transaction.isDeleted) {
      return createSafeResponse({ message: "Transaction is not archived" }, 400);
    }

    // Start a transaction to handle both the transaction and its expenses
    const result = await prisma.$transaction(async (tx) => {
      // 1. Adjust fund balance if this was a revenue transaction
      if (transaction.amount > 0 && transaction.fundType) {
        try {
          // Get the fund balance
          const fund = await tx.fundBalance.findUnique({
            where: { fundType: transaction.fundType }
          });
          
          if (fund) {
            // Update fund balance (add the amount back since transaction is being restored)
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
                description: `Revenue restored from archived transaction: ${transaction.name || 'Unnamed transaction'}`,
                sourceType: "transaction_restore",
                sourceId: transaction.id,
                createdById: restoredBy || user?.userId
              }
            });
            
            console.log(`Adjusted ${transaction.fundType} balance: +${transaction.amount} for restored transaction ${transaction.id}`);
          }
        } catch (fundError) {
          console.error("Fund balance adjustment error:", fundError);
          // Continue even if fund adjustment fails
        }
      }
      
      // 2. Restore the transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedById: null,
          updatedAt: new Date(),
          updatedById: restoredBy || user?.userId
        }
      });
      
      // 3. Find and restore all connected expenses that were deleted at the same time
      // Note: This will only restore expenses that were archived with the transaction
      const transactionDeletedAt = transaction.deletedAt;
      let restoredExpensesCount = 0;
      
      if (transactionDeletedAt) {
        // Get the timestamp minus/plus 1 second to account for slight timing differences
        const minTime = new Date(transactionDeletedAt.getTime() - 1000);
        const maxTime = new Date(transactionDeletedAt.getTime() + 1000);
        
        // Find expenses that were deleted with the transaction
        const expensesToRestore = await tx.expense.findMany({
          where: { 
            transactionId: id,
            isDeleted: true,
            deletedAt: {
              gte: minTime,
              lte: maxTime
            }
          }
        });
        
        // Restore each expense and adjust fund balances
        for (const expense of expensesToRestore) {
          // Adjust fund balance for each expense being restored
          if (expense.amount > 0 && expense.fundType) {
            try {
              // Get the fund balance
              const fund = await tx.fundBalance.findUnique({
                where: { fundType: expense.fundType }
              });
              
              if (fund) {
                // Subtract the amount from fund (since expense is being restored)
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
              console.error("Fund balance adjustment error for expense:", fundError);
              // Continue even if fund adjustment fails
            }
          }
        }
        
        // Update all matching expenses as restored
        const restoredExpenses = await tx.expense.updateMany({
          where: { 
            transactionId: id,
            isDeleted: true,
            deletedAt: {
              gte: minTime,
              lte: maxTime
            }
          },
          data: {
            isDeleted: false,
            deletedAt: null,
            deletedById: null,
            updatedAt: new Date(),
            updatedById: restoredBy || user?.userId
          }
        });
        
        restoredExpensesCount = restoredExpenses.count;
      }
      
      // 4. Recalculate capital cost for the transaction
      const activeExpenses = await tx.expense.findMany({
        where: {
          transactionId: id,
          isDeleted: false
        }
      });
      
      const newCapitalCost = activeExpenses.reduce(
        (sum, exp) => sum + (exp.amount || 0), 
        0
      );
      
      // Update transaction with new capital cost
      await tx.transaction.update({
        where: { id },
        data: { capitalCost: newCapitalCost }
      });
      
      return { 
        transaction: updatedTransaction, 
        restoredExpensesCount 
      };
    });

    return createSafeResponse({ 
      message: `Transaction restored successfully along with ${result.restoredExpensesCount} related expenses`,
      transaction: result.transaction
    });
  } catch (error) {
    console.error("Error in restore transaction:", error);
    return createSafeResponse({ 
      message: "Failed to restore transaction", 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
}