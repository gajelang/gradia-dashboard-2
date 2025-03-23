// file: app/api/transactions/update/route.js

import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth"; // Add auth verification

const prisma = new PrismaClient();

// Safe response creation
function createSafeResponse(data, status = 200) {
  const responseBody = JSON.stringify(data || {});
  return new Response(responseBody, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function PATCH(req) {
  try {
    console.log("Incoming PATCH /api/transactions/update");
    
    // Verify the auth token first
    const { isAuthenticated, user } = await verifyAuthToken(req);
    
    if (!isAuthenticated) {
      return createSafeResponse({ message: "Unauthorized" }, 401);
    }
    
    // Parse request safely
    let data;
    try {
      data = await req.json();
      console.log("Update transaction data received:", data);
    } catch (parseError) {
      console.error("Error parsing transaction update request:", parseError);
      return createSafeResponse({ message: "Invalid request format" }, 400);
    }
    
    const { id, expenses, updatedById } = data;
    
    if (!id) {
      return createSafeResponse({ message: "Transaction ID is required" }, 400);
    }

    // Find the transaction first to get current values
    const transaction = await prisma.transaction.findUnique({
      where: { id }
    }).catch(err => {
      console.error("Error finding transaction:", err);
      return null;
    });
    
    if (!transaction) {
      return createSafeResponse({ message: "Transaction not found" }, 404);
    }

    // Prepare update data with only the fields included in the request
    const updateData = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.paymentProofLink !== undefined) updateData.paymentProofLink = data.paymentProofLink;
    
    // Handle dates
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    
    // Handle numeric fields
    if (data.projectValue !== undefined) updateData.projectValue = Number(data.projectValue);
    if (data.totalProfit !== undefined) updateData.totalProfit = Number(data.totalProfit);
    if (data.downPaymentAmount !== undefined) updateData.downPaymentAmount = Number(data.downPaymentAmount);
    if (data.remainingAmount !== undefined) updateData.remainingAmount = Number(data.remainingAmount);
    
    // Handle payment status fields
    if (data.paymentStatus !== undefined) {
      updateData.paymentStatus = data.paymentStatus;
      updateData.status = data.paymentStatus; // Update both for backward compatibility
    }
    
    // Add updater information
    if (updatedById) {
      updateData.updatedById = updatedById;
    } else if (user) {
      updateData.updatedById = user.userId;
    }
    
    // Update the transaction
    console.log("Updating transaction with data:", updateData);
    
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: updateData
    }).catch(dbError => {
      console.error("Error updating transaction:", dbError);
      return null;
    });
    
    if (!updatedTransaction) {
      return createSafeResponse({ message: "Failed to update transaction" }, 500);
    }

    // Handle expenses if provided
    let createdExpenses = [];
    if (expenses && Array.isArray(expenses) && expenses.length > 0) {
      try {
        // Create each expense
        const expensePromises = expenses.map(async (expense) => {
          // Create the expense with proper user tracking
          const expenseData = {
            category: expense.category,
            amount: Number(expense.amount),
            description: expense.description || null,
            date: new Date(expense.date),
            paymentProofLink: expense.paymentProofLink || null,
            transactionId: id // Link to the transaction
          };
          
          // Add creator info if provided
          if (expense.createdById) {
            expenseData.createdById = expense.createdById;
            expenseData.updatedById = expense.createdById; // The creator is also the first updater
          } else if (user) {
            expenseData.createdById = user.userId;
            expenseData.updatedById = user.userId;
          }
          
          const createdExpense = await prisma.expense.create({
            data: expenseData
          });
          
          // Update company finances to subtract the expense amount
          try {
            let finance = await prisma.companyFinance.findFirst();
            if (finance) {
              await prisma.companyFinance.update({
                where: { id: finance.id },
                data: {
                  totalFunds: finance.totalFunds - Number(expense.amount),
                }
              });
              console.log(`Finance updated: subtracted ${expense.amount} for expense ID ${createdExpense.id}`);
            }
          } catch (financeError) {
            console.error("Finance update error during expense creation:", financeError);
            // Continue even if finance update fails
          }
          
          return createdExpense;
        });
        
        createdExpenses = await Promise.all(expensePromises);
        console.log(`Created ${createdExpenses.length} expenses for transaction ID ${id}`);
      } catch (expenseError) {
        console.error("Error creating expenses:", expenseError);
        // Continue even if expenses creation fails
        // But return an error message
        return createSafeResponse({ 
          message: "Transaction updated, but failed to create some expenses",
          transaction: updatedTransaction,
          error: String(expenseError)
        }, 207); // 207 Multi-Status
      }
    }

    return createSafeResponse({ 
      message: "Transaction updated successfully",
      transaction: updatedTransaction,
      expenses: createdExpenses
    });
  } catch (error) {
    console.error("PATCH transaction error:", error);
    return createSafeResponse({ message: "Server error", error: String(error) }, 500);
  }
}