import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";
import { createSafeResponse } from "@/lib/api";

const prisma = new PrismaClient();

export async function PATCH(req) {
  // Verify auth token
  const { isAuthenticated, user } = await verifyAuthToken(req);
  
  if (!isAuthenticated) {
    return createSafeResponse({ error: "Unauthorized" }, 401);
  }
  
  try {
    const data = await req.json();
    
    if (!data.id) {
      return createSafeResponse({ message: "Expense ID is required" }, 400);
    }
    
    // Get original expense data to calculate finance adjustment
    const originalExpense = await prisma.expense.findUnique({
      where: { id: data.id }
    });
    
    if (!originalExpense) {
      return createSafeResponse({ message: "Expense not found" }, 404);
    }
    
    // Create update data with received fields
    const updateData = {};
    
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.paymentProofLink !== undefined) updateData.paymentProofLink = data.paymentProofLink;
    
    // Special handling for amount which affects finances
    let amountDifference = 0;
    if (data.amount !== undefined) {
      updateData.amount = Number(data.amount);
      amountDifference = originalExpense.amount - Number(data.amount);
    }
    
    // Add who updated this expense
    updateData.updatedById = user.userId;
    updateData.updatedAt = new Date();
    
    // Update the expense record
    const updatedExpense = await prisma.expense.update({
      where: { id: data.id },
      data: updateData,
      include: {
        transaction: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Update finances if amount changed
    if (amountDifference !== 0) {
      try {
        // Find company finance
        const finance = await prisma.companyFinance.findFirst();
        
        if (finance) {
          // Update finance (add difference to total funds)
          // If original amount was higher, the difference is positive and we add to funds
          // If new amount is higher, the difference is negative and we subtract from funds
          await prisma.companyFinance.update({
            where: { id: finance.id },
            data: {
              totalFunds: finance.totalFunds + amountDifference
            }
          });
        }
      } catch (financeError) {
        console.error("Error updating finances:", financeError);
        // Continue even if finance update fails
      }
    }
    
    return createSafeResponse({ 
      message: "Expense updated successfully",
      expense: updatedExpense
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    return createSafeResponse({ 
      message: "Failed to update expense", 
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}