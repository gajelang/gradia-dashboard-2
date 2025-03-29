// Modified src/app/api/transactions/softDelete/route.js
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
    const { id, deletedBy } = await req.json();
    
    if (!id) {
      return createSafeResponse({ message: "Transaction ID is required" }, 400);
    }

    // Find the transaction to ensure it exists
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        expenses: {
          where: { isDeleted: false } // Only get active expenses
        }
      }
    });
    
    if (!transaction) {
      return createSafeResponse({ message: "Transaction not found" }, 404);
    }

    // Check if transaction is already deleted
    if (transaction.isDeleted) {
      return createSafeResponse({ message: "Transaction is already archived" }, 400);
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
            // Update fund balance (subtract the amount that was added when transaction was created)
            const newBalance = fund.currentBalance - transaction.amount;
            await tx.fundBalance.update({
              where: { fundType: transaction.fundType },
              data: { currentBalance: newBalance }
            });
            
            // Create a fund transaction record for this adjustment
            await tx.fundTransaction.create({
              data: {
                fundType: transaction.fundType,
                transactionType: "adjustment",
                amount: -transaction.amount,
                balanceAfter: newBalance,
                description: `Revenue reversed due to archived transaction: ${transaction.name || 'Unnamed transaction'}`,
                sourceType: "transaction_archive",
                sourceId: transaction.id,
                createdById: deletedBy || user?.userId
              }
            });
            
            console.log(`Adjusted ${transaction.fundType} balance: -${transaction.amount} for archived transaction ${transaction.id}`);
          }
        } catch (fundError) {
          console.error("Fund balance adjustment error:", fundError);
          // Continue even if fund adjustment fails
        }
      }
      
      // 2. Soft delete the transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedById: deletedBy || user?.userId
        }
      });
      
      // 3. Find and soft delete all connected expenses
      const relatedExpenses = await tx.expense.findMany({
        where: { transactionId: id, isDeleted: false }
      });
      
      // Track how many expenses were archived
      let archivedExpensesCount = 0;
      
      // Update each expense if there are any
      for (const expense of relatedExpenses) {
        // Adjust fund balance for each expense being archived
        if (expense.amount > 0 && expense.fundType) {
          try {
            // Get the fund balance
            const fund = await tx.fundBalance.findUnique({
              where: { fundType: expense.fundType }
            });
            
            if (fund) {
              // Add the amount back to the fund (since expense is being removed)
              const newBalance = fund.currentBalance + expense.amount;
              await tx.fundBalance.update({
                where: { fundType: expense.fundType },
                data: { currentBalance: newBalance }
              });
              
              // Create a fund transaction record for this adjustment
              await tx.fundTransaction.create({
                data: {
                  fundType: expense.fundType,
                  transactionType: "adjustment",
                  amount: expense.amount,
                  balanceAfter: newBalance,
                  description: `Expense reversed due to archival: ${expense.category || 'Unnamed expense'}`,
                  sourceType: "expense_archive",
                  sourceId: expense.id,
                  createdById: deletedBy || user?.userId
                }
              });
              
              console.log(`Adjusted ${expense.fundType} balance: +${expense.amount} for archived expense ${expense.id}`);
            }
          } catch (fundError) {
            console.error("Fund balance adjustment error for expense:", fundError);
            // Continue even if fund adjustment fails
          }
        }
      }
      
      // Update all expenses as deleted
      if (relatedExpenses.length > 0) {
        const updateResults = await tx.expense.updateMany({
          where: { transactionId: id, isDeleted: false },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedById: deletedBy || user?.userId
          }
        });
        
        archivedExpensesCount = updateResults.count;
      }
      
      return { 
        transaction: updatedTransaction, 
        archivedExpensesCount 
      };
    });

    return createSafeResponse({ 
      message: `Transaction archived successfully along with ${result.archivedExpensesCount} related expenses`,
      transaction: result.transaction
    });
  } catch (error) {
    console.error("Error in soft delete transaction:", error);
    return createSafeResponse({ 
      message: "Failed to archive transaction", 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
}