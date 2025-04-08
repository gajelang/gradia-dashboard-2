// file: app/api/transactions/update/route.js

import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth/auth"; // Add auth verification

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
    
    const { id, expenses, updatedById, fundType: newFundType } = data;
    
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
    
    // Handle fund type change
    if (newFundType !== undefined) {
      updateData.fundType = newFundType;
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

    // --- Fund Balance Updates ---
    // Handle payment status changes that affect fund balances
    try {
      const originalStatus = transaction.paymentStatus;
      const newStatus = data.paymentStatus || originalStatus;
      const originalFundType = transaction.fundType || "petty_cash";
      const fundType = newFundType || originalFundType;
      const fundTypeChanged = fundType !== originalFundType;
      const totalValue = transaction.totalProfit || 0;
      
      // Calculate amount that needs to be processed
      let amountToProcess = 0;
      
      // Going from no payment to DP
      if (originalStatus === "Belum Bayar" && newStatus === "DP") {
        amountToProcess = data.downPaymentAmount || 0;
      } 
      // Going from no payment to paid in full
      else if (originalStatus === "Belum Bayar" && newStatus === "Lunas") {
        amountToProcess = totalValue;
      }
      // Going from DP to paid in full
      else if (originalStatus === "DP" && newStatus === "Lunas") {
        // Add the remaining amount (the difference between total value and initial DP)
        amountToProcess = totalValue - (transaction.downPaymentAmount || 0);
      }
      // Adjusting DP amount (could be positive or negative adjustment)
      else if (originalStatus === "DP" && newStatus === "DP" && data.downPaymentAmount !== undefined) {
        amountToProcess = data.downPaymentAmount - (transaction.downPaymentAmount || 0);
      }
      // Reverting from paid to DP
      else if (originalStatus === "Lunas" && newStatus === "DP") {
        // Subtract the difference between total and new DP amount
        amountToProcess = (data.downPaymentAmount || 0) - totalValue;
      }
      // Reverting from paid or DP to no payment
      else if ((originalStatus === "Lunas" || originalStatus === "DP") && newStatus === "Belum Bayar") {
        // Remove all previously added funds
        amountToProcess = originalStatus === "Lunas" ? -totalValue : -(transaction.downPaymentAmount || 0);
      }
      
      // Process fund balance updates if there's an amount to process or fund type changed
      if (amountToProcess !== 0 || fundTypeChanged) {
        console.log(`Processing fund updates: amount=${amountToProcess}, fundTypeChanged=${fundTypeChanged}`);
        
        // If fund type changed, we need to move money between funds
        if (fundTypeChanged) {
          // Calculate amount to move between funds
          let amountToMove = 0;
          
          if (originalStatus === "Lunas") {
            amountToMove = totalValue;
          } else if (originalStatus === "DP") {
            amountToMove = transaction.downPaymentAmount || 0;
          }
          
          if (amountToMove > 0) {
            // Move funds from original fund type to new fund type
            console.log(`Moving ${amountToMove} from ${originalFundType} to ${fundType}`);
            
            // Get original fund
            let originalFund = await prisma.fundBalance.findUnique({
              where: { fundType: originalFundType }
            });
            
            // Create if it doesn't exist
            if (!originalFund) {
              originalFund = await prisma.fundBalance.create({
                data: { fundType: originalFundType, currentBalance: 0 }
              });
            }
            
            // Get new fund
            let newFund = await prisma.fundBalance.findUnique({
              where: { fundType }
            });
            
            // Create if it doesn't exist
            if (!newFund) {
              newFund = await prisma.fundBalance.create({
                data: { fundType, currentBalance: 0 }
              });
            }
            
            // Update balances
            await prisma.fundBalance.update({
              where: { fundType: originalFundType },
              data: { currentBalance: originalFund.currentBalance - amountToMove }
            });
            
            await prisma.fundBalance.update({
              where: { fundType },
              data: { currentBalance: newFund.currentBalance + amountToMove }
            });
            
            // Record fund transactions
            await prisma.fundTransaction.create({
              data: {
                fundType: originalFundType,
                transactionType: "transfer_out",
                amount: -amountToMove,
                balanceAfter: originalFund.currentBalance - amountToMove,
                description: `Fund transfer to ${fundType} - Transaction: ${updatedTransaction.name}`,
                sourceType: "fund_transfer",
                createdById: user?.userId || null
              }
            });
            
            await prisma.fundTransaction.create({
              data: {
                fundType,
                transactionType: "transfer_in",
                amount: amountToMove,
                balanceAfter: newFund.currentBalance + amountToMove,
                description: `Fund transfer from ${originalFundType} - Transaction: ${updatedTransaction.name}`,
                sourceType: "fund_transfer",
                createdById: user?.userId || null
              }
            });
          }
        }
        
        // If there's additional amount to process (status change)
        if (amountToProcess !== 0) {
          // Get the fund to update
          const fundToUpdate = fundType; // Use the new fund type
          
          let fund = await prisma.fundBalance.findUnique({
            where: { fundType: fundToUpdate }
          });
          
          // Create if it doesn't exist
          if (!fund) {
            fund = await prisma.fundBalance.create({
              data: { fundType: fundToUpdate, currentBalance: 0 }
            });
          }
          
          // Update fund balance
          const newBalance = fund.currentBalance + amountToProcess;
          
          await prisma.fundBalance.update({
            where: { fundType: fundToUpdate },
            data: { currentBalance: newBalance }
          });
          
          // Record fund transaction
          await prisma.fundTransaction.create({
            data: {
              fundType: fundToUpdate,
              transactionType: amountToProcess >= 0 ? "income" : "expense",
              amount: amountToProcess,
              balanceAfter: newBalance,
              description: `Payment status update: ${originalStatus} → ${newStatus} - Transaction: ${updatedTransaction.name}`,
              sourceType: "transaction_update",
              sourceId: id,
              createdById: user?.userId || null
            }
          });
        }
      }
    } catch (fundError) {
      console.error("Error updating fund balances:", fundError);
      // Continue even if fund balance update fails
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
            transactionId: id, // Link to the transaction
            fundType: expense.fundType || "petty_cash" // Include fund type for expenses
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
            // Get fund balance for expense's fund type
            let fund = await prisma.fundBalance.findUnique({
              where: { fundType: expenseData.fundType }
            });
            
            // Create fund if it doesn't exist
            if (!fund) {
              fund = await prisma.fundBalance.create({
                data: { fundType: expenseData.fundType, currentBalance: 0 }
              });
            }
            
            // Update fund balance
            const newBalance = fund.currentBalance - Number(expense.amount);
            
            await prisma.fundBalance.update({
              where: { fundType: expenseData.fundType },
              data: { currentBalance: newBalance }
            });
            
            // Create transaction record
            await prisma.fundTransaction.create({
              data: {
                fundType: expenseData.fundType,
                transactionType: "expense",
                amount: -Number(expense.amount),
                balanceAfter: newBalance,
                description: `Expense: ${expense.category} - Transaction: ${updatedTransaction.name}`,
                sourceType: "expense",
                sourceId: createdExpense.id,
                createdById: user?.userId || null
              }
            });
            
            console.log(`Fund ${expenseData.fundType} updated: subtracted ${expense.amount} for expense ID ${createdExpense.id}`);
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