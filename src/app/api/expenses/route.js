
// app/api/expenses/route.js - Enhanced with subscription handling
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

// Handler for GET requests - Fetch expenses
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      category, 
      amount, 
      description, 
      date, 
      paymentProofLink,
      transactionId,
      inventoryId,
      fundType,
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
      fundType: fundType || "petty_cash",
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
          
          // Handle subscription specific logic
          if (inventory.type === 'SUBSCRIPTION') {
            if (inventory.paymentStatus === "BELUM_BAYAR") {
              // If this is a first payment, check if it's the full amount
              if (Math.abs(parseFloat(amount) - parseFloat(inventory.cost)) < 0.01) {
                updateData.paymentStatus = "LUNAS";
              } else if (parseFloat(amount) > 0) {
                // It's a partial payment
                updateData.paymentStatus = "DP";
                updateData.downPaymentAmount = parseFloat(amount);
                updateData.remainingAmount = parseFloat(inventory.cost) - parseFloat(amount);
              }
            } else if (inventory.paymentStatus === "DP") {
              // Check if this payment completes the total
              const totalPaid = (parseFloat(inventory.downPaymentAmount) || 0) + parseFloat(amount);
              
              if (Math.abs(totalPaid - parseFloat(inventory.cost)) < 0.01) {
                updateData.paymentStatus = "LUNAS";
                updateData.remainingAmount = 0;
              } else {
                // Update the remaining amount
                updateData.remainingAmount = parseFloat(inventory.cost) - totalPaid;
              }
            }
            
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
      
      // Update company finances
      let updatedFinance = null;
      try {
        const finance = await tx.companyFinance.findFirst();
        
        if (finance) {
          updatedFinance = await tx.companyFinance.update({
            where: { id: finance.id },
            data: {
              totalFunds: {
                decrement: parseFloat(amount)
              }
            }
          });
        }
      } catch (financeError) {
        console.error("Error updating company finances:", financeError);
        // Continue even if finance update fails
      }
      
      return { 
        expense, 
        inventory: updatedInventory, 
        transaction: updatedTransaction, 
        finance: updatedFinance 
      };
    });

    return NextResponse.json({
      message: 'Expense created successfully',
      expense: result.expense,
      inventory: result.inventory
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
      select: { transactionId: true, amount: true }
    });

    updateData.updatedById = authResult.user?.userId || null;
    updateData.updatedAt = new Date();

    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount);
    }
    
    if (updateData.fundType !== undefined) {
      updateData.fundType = updateData.fundType;
    }

    const updatedExpense = await prisma.expense.update({
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
    
    if (originalExpense?.transactionId) {
      const transactionExpenses = await prisma.expense.findMany({
        where: {
          transactionId: originalExpense.transactionId,
          isDeleted: false
        }
      });
      
      const totalExpenses = transactionExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
      await prisma.transaction.update({
        where: { id: originalExpense.transactionId },
        data: { capitalCost: totalExpenses }
      });
    }

    return NextResponse.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}