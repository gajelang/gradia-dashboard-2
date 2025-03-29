// app/api/expenses/recurring/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

/**
 * GET handler - Fetch recurring expenses
 * Supports optional ID query parameter to get a specific recurring expense
 */
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // Build query conditions
    const whereClause = {
      isRecurringExpense: true,
      isDeleted: false
    };
    
    // If ID is provided, fetch only that specific recurring expense
    if (id) {
      whereClause.id = id;
    }

    // Query for recurring expenses
    const recurringExpenses = await prisma.expense.findMany({
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
        }
      },
      orderBy: [
        { nextBillingDate: 'asc' },
        { date: 'desc' }
      ]
    });
    
    return NextResponse.json(recurringExpenses);
  } catch (error) {
    console.error('Error fetching recurring expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE handler - Cancel a recurring expense
 * This doesn't delete the expense record, just disables the recurring functionality
 */
export async function DELETE(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }

    // Find the expense to ensure it exists and is a recurring expense
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        inventory: {
          select: {
            id: true,
            type: true
          }
        }
      }
    });
    
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    if (!expense.isRecurringExpense) {
      return NextResponse.json({ error: 'Not a recurring expense' }, { status: 400 });
    }

    // Update expense to disable recurring functionality
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        isRecurringExpense: false,
        recurringFrequency: null,
        nextBillingDate: null,
        updatedById: authResult.user?.userId || null,
        updatedAt: new Date()
      },
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
            type: true
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

    return NextResponse.json({
      message: 'Recurring expense cancelled successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Error cancelling recurring expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH handler - Update a recurring expense
 */
export async function PATCH(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }

    // Find the expense to ensure it exists and is a recurring expense
    const expense = await prisma.expense.findUnique({
      where: { id }
    });
    
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    if (!expense.isRecurringExpense) {
      return NextResponse.json({ error: 'Not a recurring expense' }, { status: 400 });
    }

    // Add updater information
    updateData.updatedById = authResult.user?.userId || null;
    updateData.updatedAt = new Date();

    // Convert amount to float if provided
    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount);
    }
    
    // Format dates if provided
    if (updateData.nextBillingDate) {
      updateData.nextBillingDate = new Date(updateData.nextBillingDate);
    }

    // Update recurring expense
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: updateData,
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
            nextBillingDate: true
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

    // If this is connected to a subscription inventory item, update its next billing date
    if (expense.inventoryId && updateData.nextBillingDate) {
      const inventory = await prisma.inventory.findUnique({
        where: { id: expense.inventoryId }
      });
      
      if (inventory && inventory.type === 'SUBSCRIPTION') {
        await prisma.inventory.update({
          where: { id: expense.inventoryId },
          data: {
            nextBillingDate: updateData.nextBillingDate,
            updatedById: authResult.user?.userId || null,
            updatedAt: new Date()
          }
        });
      }
    }

    return NextResponse.json({
      message: 'Recurring expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Error updating recurring expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}