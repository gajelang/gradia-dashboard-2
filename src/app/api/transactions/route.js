// Improved /api/transactions GET method that properly filters out deleted expenses
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken, createSafeResponse } from "@/lib/auth/auth";
import { authorizeRequest } from "@/lib/auth/authorization";

const prisma = new PrismaClient();

// Function to handle GET requests
export async function GET(req) {
  // Check authorization
  const authResponse = await authorizeRequest(req, 'transactions:read');
  if (authResponse) {
    return authResponse;
  }

  try {
    // Parse URL to get query parameters
    const { searchParams } = new URL(req.url);
    const fetchDeleted = searchParams.get('deleted') === 'true';

    // Build where clause
    const whereClause = {
      isDeleted: fetchDeleted
    };

    // Fetch transactions with appropriate where clause
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        // Only include active expenses (not deleted ones)
        expenses: {
          where: {
            isDeleted: false // This is the key filter - only include non-deleted expenses
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        deletedBy: fetchDeleted ? {
          select: {
            id: true,
            name: true,
            email: true
          }
        } : undefined
      }
    });

    // Modify data to correctly calculate capitalCost only from active expenses
    const transactionsWithCapitalCost = transactions.map(transaction => {
      // Calculate capital cost based on active expenses only
      const capitalCost = transaction.expenses.reduce(
        (total, expense) => total + (expense.amount || 0),
        0
      );

      // Create a clean transaction object without the expenses array
      // (since we don't need to send all expense details)
      const { expenses, ...transactionData } = transaction;

      // Return transaction with correct capital cost
      return {
        ...transactionData,
        capitalCost
      };
    });

    return createSafeResponse(transactionsWithCapitalCost);
  } catch (error) {
    console.log("GET error:", String(error));
    return createSafeResponse({ error: "Failed to fetch transactions" }, 500);
  }
}

// Function to handle POST requests (creating a transaction)
export async function POST(req) {
  // Check authorization
  const authResponse = await authorizeRequest(req, 'transactions:write');
  if (authResponse) {
    return authResponse;
  }

  // Get user from auth token
  const { user } = await verifyAuthToken(req);

  try {
    console.log("Incoming POST /api/transactions");

    // Parse request safely
    let data;
    try {
      data = await req.json();
      console.log("Data received:", data);
    } catch {
      return createSafeResponse({ message: "Invalid request data" }, 400);
    }

    if (!data || !data.name) {
      return createSafeResponse({ message: "Missing required fields" }, 400);
    }

    // Create transaction with enhanced payment fields and user tracking
    let transaction;
    try {
      // Start with basic required fields
      const transactionData = {
        name: data.name,
        amount: Number(data.amount) || 0, // This is the amount that affects revenue
        status: data.paymentStatus || "Belum Bayar",
        paymentStatus: data.paymentStatus || "Belum Bayar",
        description: data.description || "",
        date: data.date ? new Date(data.date) : new Date(),
        // Add user tracking data
        createdById: user.userId,
        updatedById: user.userId,
        // Add fund type for transaction
        fundType: data.fundType || "petty_cash" // Default to petty cash if not specified
      };

      // Add new financial fields if provided
      if (data.projectValue !== undefined) {
        transactionData.projectValue = Number(data.projectValue) || 0;
      }

      if (data.totalProfit !== undefined) {
        transactionData.totalProfit = Number(data.totalProfit) || 0;
      }

      if (data.downPaymentAmount !== undefined) {
        transactionData.downPaymentAmount = Number(data.downPaymentAmount) || 0;
      }

      if (data.remainingAmount !== undefined) {
        transactionData.remainingAmount = Number(data.remainingAmount) || 0;
      }

      // Add optional contact fields if provided
      if (data.email) {
        transactionData.email = data.email;
      }

      if (data.phone) {
        transactionData.phone = data.phone;
      }

      // Add optional broadcast date fields if provided
      if (data.startDate) {
        transactionData.startDate = new Date(data.startDate);
      }

      if (data.endDate) {
        transactionData.endDate = new Date(data.endDate);
      }

      // Add payment proof link if provided
      if (data.paymentProofLink) {
        transactionData.paymentProofLink = data.paymentProofLink;
      }

      console.log("Creating transaction with data:", transactionData);

      // Create transaction using prisma
      transaction = await prisma.transaction.create({ data: transactionData });
      console.log("Transaction created successfully:", transaction.id);
    } catch (dbError) {
      console.log("Database error:", String(dbError));
      return createSafeResponse({
        message: "Failed to create transaction",
        details: String(dbError)
      }, 500);
    }

    // Update finances - add the actual paid amount to the specified fund
    try {
      const amountToAdd = Number(data.amount) || 0;
      const fundType = data.fundType || "petty_cash"; // Use specified fund or default

      // Find the fund record
      let fund = await prisma.fundBalance.findUnique({
        where: { fundType }
      });

      // If fund doesn't exist, create it
      if (!fund) {
        fund = await prisma.fundBalance.create({
          data: {
            fundType,
            currentBalance: 0
          }
        });
      }

      // Update fund balance
      await prisma.fundBalance.update({
        where: { fundType },
        data: {
          currentBalance: fund.currentBalance + amountToAdd
        }
      });

      // Create fund transaction record
      await prisma.fundTransaction.create({
        data: {
          fundType,
          transactionType: "income",
          amount: amountToAdd,
          balanceAfter: fund.currentBalance + amountToAdd,
          description: `Income from transaction: ${data.name}`,
          sourceType: "transaction",
          sourceId: transaction.id,
          createdById: user.userId
        }
      });

      console.log(`Fund ${fundType} updated successfully, added:`, amountToAdd);
    } catch (financeError) {
      console.log("Finance update issue:", String(financeError));
      // Continue even if finance update fails
    }

    return createSafeResponse({ transaction });
  } catch (error) {
    console.log("Unhandled error:", String(error));
    return createSafeResponse({ message: "Server error" }, 500);
  }
}

export async function PATCH(req) {
  // Verify auth token
  const { isAuthenticated, user } = await verifyAuthToken(req);

  if (!isAuthenticated) {
    return createSafeResponse({ error: "Unauthorized" }, 401);
  }

  try {
    let data = await req.json();
    const { id, paymentStatus, expenses, updatedById, fundType: newFundType } = data || {};

    if (!id) {
      return createSafeResponse({ message: "Missing transaction ID" }, 400);
    }

    // Get the existing transaction to check for fund changes
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!existingTransaction) {
      return createSafeResponse({ message: "Transaction not found" }, 404);
    }

    let transaction;
    try {
      // Prepare update data
      const updateData = {
        status: paymentStatus || data.status || "Belum Bayar",
        paymentStatus: paymentStatus || data.status || "Belum Bayar",
        updatedById: updatedById || user.userId // Track who updated
      };

      // Add other fields to update if provided
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.projectValue !== undefined) updateData.projectValue = Number(data.projectValue);
      if (data.totalProfit !== undefined) updateData.totalProfit = Number(data.totalProfit);
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
      if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
      if (data.paymentProofLink !== undefined) updateData.paymentProofLink = data.paymentProofLink;
      if (newFundType !== undefined) updateData.fundType = newFundType;

      // Update the transaction
      transaction = await prisma.transaction.update({
        where: { id },
        data: updateData
      });

      // Handle fund transfers if fund type changed
      if (newFundType && existingTransaction.fundType !== newFundType && existingTransaction.amount > 0) {
        try {
          // Get both funds
          const oldFund = await prisma.fundBalance.findUnique({
            where: { fundType: existingTransaction.fundType }
          });

          const newFund = await prisma.fundBalance.findUnique({
            where: { fundType: newFundType }
          });

          if (oldFund && newFund) {
            // Update old fund (subtract amount)
            await prisma.fundBalance.update({
              where: { fundType: existingTransaction.fundType },
              data: { currentBalance: oldFund.currentBalance - existingTransaction.amount }
            });

            // Create transaction record for subtraction
            await prisma.fundTransaction.create({
              data: {
                fundType: existingTransaction.fundType,
                transactionType: "transfer_out",
                amount: -existingTransaction.amount,
                balanceAfter: oldFund.currentBalance - existingTransaction.amount,
                description: `Fund transfer to ${newFundType} for transaction: ${transaction.name}`,
                sourceType: "transaction_edit",
                sourceId: transaction.id,
                createdById: user.userId
              }
            });

            // Update new fund (add amount)
            await prisma.fundBalance.update({
              where: { fundType: newFundType },
              data: { currentBalance: newFund.currentBalance + existingTransaction.amount }
            });

            // Create transaction record for addition
            await prisma.fundTransaction.create({
              data: {
                fundType: newFundType,
                transactionType: "transfer_in",
                amount: existingTransaction.amount,
                balanceAfter: newFund.currentBalance + existingTransaction.amount,
                description: `Fund transfer from ${existingTransaction.fundType} for transaction: ${transaction.name}`,
                sourceType: "transaction_edit",
                sourceId: transaction.id,
                createdById: user.userId
              }
            });
          }
        } catch (fundTransferError) {
          console.log("Fund transfer error:", String(fundTransferError));
          // Continue even if fund transfer fails
        }
      }

      // Handle expenses if provided
      let createdExpenses = [];
      if (expenses && Array.isArray(expenses) && expenses.length > 0) {
        try {
          // Create each expense
          for (const expense of expenses) {
            // Create the expense data with creator tracking
            const expenseData = {
              category: expense.category,
              amount: Number(expense.amount),
              description: expense.description || null,
              date: new Date(expense.date),
              paymentProofLink: expense.paymentProofLink || null,
              transactionId: id, // Link to the transaction
              fundType: expense.fundType || "petty_cash" // Use specified fund type or default
            };

            // Add creator information
            if (expense.createdById) {
              expenseData.createdById = expense.createdById;
              expenseData.updatedById = expense.createdById;
            } else {
              expenseData.createdById = user.userId;
              expenseData.updatedById = user.userId;
            }

            // Create the expense with user tracking
            const createdExpense = await prisma.expense.create({
              data: expenseData
            });

            createdExpenses.push(createdExpense);

            // Update company finances
            try {
              // Get the fund
              let fund = await prisma.fundBalance.findUnique({
                where: { fundType: expenseData.fundType }
              });

              // If fund doesn't exist, create it
              if (!fund) {
                fund = await prisma.fundBalance.create({
                  data: {
                    fundType: expenseData.fundType,
                    currentBalance: 0
                  }
                });
              }

              // Update fund balance
              await prisma.fundBalance.update({
                where: { fundType: expenseData.fundType },
                data: {
                  currentBalance: fund.currentBalance - Number(expense.amount),
                }
              });

              // Create fund transaction record
              await prisma.fundTransaction.create({
                data: {
                  fundType: expenseData.fundType,
                  transactionType: "expense",
                  amount: -Number(expense.amount),
                  balanceAfter: fund.currentBalance - Number(expense.amount),
                  description: `Expense for transaction: ${transaction.name} - ${expense.category}`,
                  sourceType: "expense",
                  sourceId: createdExpense.id,
                  createdById: user.userId
                }
              });

              console.log(`Fund ${expenseData.fundType} updated: subtracted ${expense.amount} for expense ID ${createdExpense.id}`);
            } catch (financeError) {
              console.log("Finance update error during expense creation:", String(financeError));
              // Continue even if finance update fails
            }
          }

          console.log(`Created ${createdExpenses.length} expenses for transaction ID ${id}`);
        } catch (expenseError) {
          console.log("Error creating expenses:", String(expenseError));
          // Continue even if expenses creation fails
        }
      }

      return createSafeResponse({
        transaction,
        expenses: createdExpenses
      });
    } catch (error) {
      console.log("Update error:", String(error));
      return createSafeResponse({ message: "Failed to update transaction" }, 500);
    }
  } catch (error) {
    console.log("PATCH error:", String(error));
    return createSafeResponse({ message: "Server error" }, 500);
  }
}

export async function DELETE(req) {
  // Verify auth token
  const { isAuthenticated, user } = await verifyAuthToken(req);

  if (!isAuthenticated) {
    return createSafeResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return createSafeResponse({ message: "Transaction ID required" }, 400);
    }

    let transaction;
    try {
      transaction = await prisma.transaction.findUnique({ where: { id } });

      if (!transaction) {
        return createSafeResponse({ message: "Transaction not found" }, 404);
      }

      // Find all related expenses to update finances
      const relatedExpenses = await prisma.expense.findMany({
        where: { transactionId: id }
      });

      // Delete related expenses first
      if (relatedExpenses.length > 0) {
        await prisma.expense.deleteMany({
          where: { transactionId: id }
        });
        console.log(`Deleted ${relatedExpenses.length} expenses for transaction ID ${id}`);
      }

      // Then delete the transaction
      await prisma.transaction.delete({ where: { id } });
    } catch (error) {
      console.log("Delete error:", String(error));
      return createSafeResponse({ message: "Failed to delete transaction" }, 500);
    }

    // Update finances - subtract the amount from the associated fund
    try {
      const fundType = transaction.fundType || "petty_cash";
      const fund = await prisma.fundBalance.findUnique({
        where: { fundType }
      });

      if (fund) {
        const amountToSubtract = transaction.amount || 0;
        await prisma.fundBalance.update({
          where: { fundType },
          data: { currentBalance: fund.currentBalance - amountToSubtract }
        });

        // Create fund transaction record for the deletion
        await prisma.fundTransaction.create({
          data: {
            fundType,
            transactionType: "adjustment",
            amount: -amountToSubtract,
            balanceAfter: fund.currentBalance - amountToSubtract,
            description: `Transaction deleted: ${transaction.name}`,
            sourceType: "transaction_delete",
            createdById: user.userId
          }
        });
      }
    } catch (error) {
      // Continue even if finance update fails
      console.log("Finance update error during deletion:", error);
    }

    return createSafeResponse({ message: "Transaction deleted" });
  } catch (error) {
    console.log("DELETE error:", String(error));
    return createSafeResponse({ message: "Server error" }, 500);
  }
}