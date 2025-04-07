// app/api/expenses/route.js - Enhanced with subscription handling and fund management integration
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken, createSafeResponse } from '@/lib/auth';
import { authorizeRequest } from '@/lib/authorization';

// Handler for GET requests - Fetch expenses
export async function GET(request) {
  try {
    // Check authorization
    const authResponse = await authorizeRequest(request, 'expenses:read');
    if (authResponse) {
      return authResponse;
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const fetchDeleted = searchParams.get('deleted') === 'true';
    const inventoryId = searchParams.get('inventoryId');

    // Build the where clause
    const whereClause = {
      isDeleted: fetchDeleted // true for deleted expenses, false for active ones
    };

    // Filter by inventory ID if provided
    if (inventoryId) {
      whereClause.inventoryId = inventoryId;
    }

    // Query for expenses with the built where clause
    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        transaction: {
          select: {
            id: true,
            name: true
          }
        },
        inventory: {
          select: {
            id: true,
            name: true,
            type: true,
            recurringType: true,
            nextBillingDate: true,
            isRecurring: true
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
        },
        deletedBy: fetchDeleted ? {
          select: {
            id: true,
            name: true,
            email: true
          }
        } : undefined
      },
      orderBy: {
        date: 'desc'
      }
    });

    console.log(`Found ${expenses.length} expenses with isDeleted=${fetchDeleted}`);

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for creating expenses with enhanced subscription handling
export async function POST(request) {
  try {
    // Check authorization
    const authResponse = await authorizeRequest(request, 'expenses:write');
    if (authResponse) {
      return authResponse;
    }

    // Get user from auth token
    const authResult = await verifyAuthToken(request);

    const body = await request.json();
    const {
      category,
      amount,
      description,
      date,
      paymentProofLink,
      transactionId,
      inventoryId,
      fundType, // Added to specify which fund to use
      // Recurring expense fields
      isRecurringExpense,
      recurringFrequency,
      nextBillingDate
    } = body;

    if (!category || !amount || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create basic expense data
    const expenseData = {
      category,
      amount: parseFloat(amount),
      description: description || null,
      date: new Date(date),
      paymentProofLink: paymentProofLink || null,
      fundType: fundType || "petty_cash", // Default to petty cash if not specified
      isDeleted: false,
      transactionId: transactionId || null,
      inventoryId: inventoryId || null,
      createdById: authResult.user?.userId || null,
      // Add recurring expense fields if provided
      isRecurringExpense: isRecurringExpense || false,
      recurringFrequency: isRecurringExpense ? recurringFrequency : null,
      nextBillingDate: isRecurringExpense && nextBillingDate ? new Date(nextBillingDate) : null
    };

    // Start a transaction to handle related updates
    const result = await prisma.$transaction(async (tx) => {
      // Create the expense
      const expense = await tx.expense.create({
        data: expenseData,
        include: {
          transaction: {
            select: {
              id: true,
              name: true
            }
          },
          inventory: {
            select: {
              id: true,
              name: true,
              type: true,
              recurringType: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      let updatedInventory = null;

      // If connected to inventory, update inventory payment status as needed
      if (inventoryId) {
        const inventory = await tx.inventory.findUnique({
          where: { id: inventoryId }
        });

        if (inventory) {
          const updateData = {
            updatedById: authResult.user?.userId || null
          };

          // Get all previous expenses for this inventory item
          const previousExpenses = await tx.expense.findMany({
            where: {
              inventoryId: inventoryId,
              isDeleted: false,
              id: { not: expense.id } // Exclude the current expense
            },
            select: {
              amount: true
            }
          });

          // Calculate total amount paid including this payment
          const previousTotal = previousExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
          const totalPaid = previousTotal + parseFloat(amount);
          const itemCost = parseFloat(inventory.cost);

          // Handle payment status update for all inventory types
          if (Math.abs(totalPaid - itemCost) < 0.01) {
            // If total paid is approximately equal to the cost, mark as fully paid
            updateData.paymentStatus = "LUNAS";
            updateData.downPaymentAmount = totalPaid;
            updateData.remainingAmount = 0;
          } else if (totalPaid > 0 && totalPaid < itemCost) {
            // It's a partial payment
            updateData.paymentStatus = "DP";
            updateData.downPaymentAmount = totalPaid;
            updateData.remainingAmount = itemCost - totalPaid;
          }

          console.log(`Inventory payment update: Item ${inventory.name}, Cost: ${itemCost}, Total Paid: ${totalPaid}, New Status: ${updateData.paymentStatus}`);

          // Handle subscription specific logic
          if (inventory.type === 'SUBSCRIPTION') {
            // Update nextBillingDate if this is a subscription payment
            if (isRecurringExpense && nextBillingDate) {
              updateData.nextBillingDate = new Date(nextBillingDate);
            } else if (!isRecurringExpense && inventory.isRecurring) {
              // For one-time payments on recurring subscriptions, calculate next billing date
              const newBillingDate = calculateNextBillingDate(
                new Date(),
                inventory.recurringType || 'MONTHLY'
              );
              updateData.nextBillingDate = newBillingDate;
            }
          }

          // Update the inventory item
          updatedInventory = await tx.inventory.update({
            where: { id: inventoryId },
            data: updateData,
            include: {
              vendor: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });
        }
      }

      // Update transaction capital cost if needed
      let updatedTransaction = null;
      if (transactionId) {
        const transactionExpenses = await tx.expense.findMany({
          where: {
            transactionId,
            isDeleted: false
          }
        });

        const totalExpenses = transactionExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        updatedTransaction = await tx.transaction.update({
          where: { id: transactionId },
          data: { capitalCost: totalExpenses }
        });
      }

      // Update fund balance based on specified fund type
      let fundBalanceUpdated = false;
      try {
        // Find the fund or create it if it doesn't exist
        let fund = await tx.fundBalance.findUnique({
          where: { fundType: expenseData.fundType }
        });

        // If fund doesn't exist, create it
        if (!fund) {
          fund = await tx.fundBalance.create({
            data: {
              fundType: expenseData.fundType,
              currentBalance: 0
            }
          });
        }

        // Calculate new balance after expense deduction
        const newBalance = fund.currentBalance - parseFloat(amount);

        // Update fund balance
        await tx.fundBalance.update({
          where: { fundType: expenseData.fundType },
          data: { currentBalance: newBalance }
        });

        // Create fund transaction record
        await tx.fundTransaction.create({
          data: {
            fundType: expenseData.fundType,
            transactionType: "expense",
            amount: -parseFloat(amount),
            balanceAfter: newBalance,
            description: `Expense: ${category}${transactionId ? ` for transaction ${updatedTransaction?.name || transactionId}` : ''}`,
            sourceType: "expense",
            sourceId: expense.id,
            createdById: authResult.user?.userId || null
          }
        });

        fundBalanceUpdated = true;
      } catch (fundError) {
        console.error("Error updating fund balance:", fundError);
        // Continue even if fund update fails
      }

      return {
        expense,
        inventory: updatedInventory,
        transaction: updatedTransaction,
        fundBalanceUpdated
      };
    });

    return NextResponse.json({
      message: 'Expense created successfully',
      expense: result.expense,
      inventory: result.inventory,
      fundBalanceUpdated: result.fundBalanceUpdated
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate next billing date
function calculateNextBillingDate(currentDate, frequency) {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'ANNUALLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      // Default to monthly if frequency is not recognized
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
}

// Update expense handler
export async function PATCH(request) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const originalExpense = await prisma.expense.findUnique({
      where: { id },
      select: {
        transactionId: true,
        amount: true,
        fundType: true
      }
    });

    if (!originalExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    updateData.updatedById = authResult.user?.userId || null;
    updateData.updatedAt = new Date();

    let newAmount = undefined;
    if (updateData.amount !== undefined) {
      newAmount = parseFloat(updateData.amount);
      updateData.amount = newAmount;
    }

    const newFundType = updateData.fundType || originalExpense.fundType;

    // Perform expense update and related operations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the expense
      const updatedExpense = await tx.expense.update({
        where: { id },
        data: updateData,
        include: {
          transaction: {
            select: { id: true, name: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Update transaction capital cost if needed
      let updatedTransaction = null;
      if (originalExpense?.transactionId) {
        const transactionExpenses = await tx.expense.findMany({
          where: {
            transactionId: originalExpense.transactionId,
            isDeleted: false
          }
        });

        const totalExpenses = transactionExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        updatedTransaction = await tx.transaction.update({
          where: { id: originalExpense.transactionId },
          data: { capitalCost: totalExpenses }
        });
      }

      // Handle fund balance updates if amount changed or fund type changed
      let fundUpdates = { success: false, oldFund: null, newFund: null };

      if (newAmount !== undefined || (updateData.fundType && updateData.fundType !== originalExpense.fundType)) {
        try {
          // Amount difference to apply
          const amountDiff = newAmount !== undefined ?
            originalExpense.amount - newAmount : 0;

          // If fund type changed
          if (updateData.fundType && updateData.fundType !== originalExpense.fundType) {
            // Handle old fund (add the amount back)
            const oldFund = await tx.fundBalance.findUnique({
              where: { fundType: originalExpense.fundType }
            });

            if (oldFund) {
              const oldFundNewBalance = oldFund.currentBalance + originalExpense.amount;

              // Update old fund balance
              await tx.fundBalance.update({
                where: { fundType: originalExpense.fundType },
                data: { currentBalance: oldFundNewBalance }
              });

              // Record the reversion
              await tx.fundTransaction.create({
                data: {
                  fundType: originalExpense.fundType,
                  transactionType: "adjustment",
                  amount: originalExpense.amount,
                  balanceAfter: oldFundNewBalance,
                  description: `Expense moved to ${updateData.fundType}: ${updatedExpense.category}`,
                  sourceType: "expense_update",
                  sourceId: id,
                  createdById: authResult.user?.userId || null
                }
              });

              fundUpdates.oldFund = {
                fundType: originalExpense.fundType,
                newBalance: oldFundNewBalance
              };
            }

            // Handle new fund (subtract new amount)
            let newFund = await tx.fundBalance.findUnique({
              where: { fundType: updateData.fundType }
            });

            // Create fund if it doesn't exist
            if (!newFund) {
              newFund = await tx.fundBalance.create({
                data: {
                  fundType: updateData.fundType,
                  currentBalance: 0
                }
              });
            }

            const finalAmount = newAmount !== undefined ? newAmount : originalExpense.amount;
            const newFundNewBalance = newFund.currentBalance - finalAmount;

            // Update new fund balance
            await tx.fundBalance.update({
              where: { fundType: updateData.fundType },
              data: { currentBalance: newFundNewBalance }
            });

            // Record the new expense in the new fund
            await tx.fundTransaction.create({
              data: {
                fundType: updateData.fundType,
                transactionType: "expense",
                amount: -finalAmount,
                balanceAfter: newFundNewBalance,
                description: `Expense moved from ${originalExpense.fundType}: ${updatedExpense.category}`,
                sourceType: "expense_update",
                sourceId: id,
                createdById: authResult.user?.userId || null
              }
            });

            fundUpdates.newFund = {
              fundType: updateData.fundType,
              newBalance: newFundNewBalance
            };
          }
          // If only amount changed (no fund type change)
          else if (amountDiff !== 0) {
            // Find the fund
            const fund = await tx.fundBalance.findUnique({
              where: { fundType: originalExpense.fundType }
            });

            if (fund) {
              // Add the difference to the fund (if new amount is less, add positive value)
              const newBalance = fund.currentBalance + amountDiff;

              // Update fund balance
              await tx.fundBalance.update({
                where: { fundType: originalExpense.fundType },
                data: { currentBalance: newBalance }
              });

              // Record the adjustment
              await tx.fundTransaction.create({
                data: {
                  fundType: originalExpense.fundType,
                  transactionType: "adjustment",
                  amount: amountDiff,
                  balanceAfter: newBalance,
                  description: `Expense amount adjusted: ${updatedExpense.category}`,
                  sourceType: "expense_update",
                  sourceId: id,
                  createdById: authResult.user?.userId || null
                }
              });

              fundUpdates.oldFund = {
                fundType: originalExpense.fundType,
                newBalance: newBalance
              };
            }
          }

          fundUpdates.success = true;
        } catch (fundError) {
          console.error("Error updating fund balances:", fundError);
          fundUpdates.error = fundError.message;
        }
      }

      return {
        expense: updatedExpense,
        transaction: updatedTransaction,
        fundUpdates
      };
    });

    return NextResponse.json({
      message: 'Expense updated successfully',
      expense: result.expense,
      transaction: result.transaction,
      fundUpdates: result.fundUpdates
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}