// api/expenses/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

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
    
    console.log(`Fetching expenses with isDeleted=${fetchDeleted}`);

    // Query for expenses based on whether we want active or deleted ones
    const expenses = await prisma.expense.findMany({
      where: {
        isDeleted: fetchDeleted // true for deleted expenses, false for active ones
      },
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

// Handler for creating expenses
// Modified app/api/expenses/route.js (extending existing route)
// Add inventory integration to the expenses POST handler

// Add to the existing POST handler
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
      inventoryId, // New field for connecting to inventory
      fundType
    } = body;

    if (!category || !amount || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create expense with possible inventory connection
    const expense = await prisma.expense.create({
      data: {
        category,
        amount: parseFloat(amount),
        description: description || null,
        date: new Date(date),
        paymentProofLink: paymentProofLink || null,
        fundType: fundType || undefined,
        isDeleted: false,
        transactionId: transactionId || null,
        inventoryId: inventoryId || null, // Link to inventory if provided
        createdById: authResult.user?.userId || null
      }
    });
    
    // If connected to inventory, update inventory payment status if needed
    if (inventoryId) {
      try {
        const inventory = await prisma.inventory.findUnique({
          where: { id: inventoryId }
        });
        
        if (inventory) {
          // Update inventory if this was a payment
          if (inventory.paymentStatus === "BELUM_BAYAR") {
            // If this is a first payment, check if it's the full amount
            if (Math.abs(parseFloat(amount) - inventory.cost) < 0.01) {
              await prisma.inventory.update({
                where: { id: inventoryId },
                data: {
                  paymentStatus: "LUNAS",
                  updatedById: authResult.user?.userId || null
                }
              });
            } else if (parseFloat(amount) > 0) {
              // It's a partial payment
              await prisma.inventory.update({
                where: { id: inventoryId },
                data: {
                  paymentStatus: "DP",
                  downPaymentAmount: parseFloat(amount),
                  remainingAmount: inventory.cost - parseFloat(amount),
                  updatedById: authResult.user?.userId || null
                }
              });
            }
          } else if (inventory.paymentStatus === "DP") {
            // Check if this payment completes the total
            const totalPaid = (inventory.downPaymentAmount || 0) + parseFloat(amount);
            
            if (Math.abs(totalPaid - inventory.cost) < 0.01) {
              await prisma.inventory.update({
                where: { id: inventoryId },
                data: {
                  paymentStatus: "LUNAS",
                  remainingAmount: 0,
                  updatedById: authResult.user?.userId || null
                }
              });
            } else {
              // Update the remaining amount
              await prisma.inventory.update({
                where: { id: inventoryId },
                data: {
                  remainingAmount: inventory.cost - totalPaid,
                  updatedById: authResult.user?.userId || null
                }
              });
            }
          }
        }
      } catch (inventoryError) {
        console.error("Error updating inventory payment status:", inventoryError);
        // Continue even if inventory update fails
      }
    }

    return NextResponse.json({
      message: 'Expense created successfully',
      expense
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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