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
      // 1. Restore the transaction
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
      
      // 2. Find and restore all connected expenses that were deleted at the same time
      // Note: This will only restore expenses that were archived with the transaction
      const transactionDeletedAt = transaction.deletedAt;
      
      if (transactionDeletedAt) {
        // Get the timestamp minus/plus 1 second to account for slight timing differences
        const minTime = new Date(transactionDeletedAt.getTime() - 1000);
        const maxTime = new Date(transactionDeletedAt.getTime() + 1000);
        
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
        
        return { 
          transaction: updatedTransaction, 
          restoredExpensesCount: restoredExpenses.count 
        };
      }
      
      return { 
        transaction: updatedTransaction, 
        restoredExpensesCount: 0 
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