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
      where: { id }
    });
    
    if (!transaction) {
      return createSafeResponse({ message: "Transaction not found" }, 404);
    }

    // Start a transaction to handle both the transaction and its expenses
    const result = await prisma.$transaction(async (tx) => {
      // 1. Soft delete the transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedById: deletedBy || user.userId
        }
      });
      
      // 2. Find and soft delete all connected expenses
      const relatedExpenses = await tx.expense.findMany({
        where: { transactionId: id }
      });
      
      // Track how many expenses were archived
      let archivedExpensesCount = 0;
      
      // Update each expense if there are any
      if (relatedExpenses.length > 0) {
        const updateResults = await tx.expense.updateMany({
          where: { transactionId: id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedById: deletedBy || user.userId
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