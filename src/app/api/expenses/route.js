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
      fundType  // NEW field
    } = body;

    if (!category || !amount || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        amount: parseFloat(amount),
        description: description || null,
        date: new Date(date),
        paymentProofLink: paymentProofLink || null,
        fundType: fundType || undefined,  // if not provided, default in schema is used
        isDeleted: false,
        transactionId: transactionId || null,
        createdById: authResult.user?.userId || null
      }
    });
    
    if (transactionId) {
      const transactionExpenses = await prisma.expense.findMany({
        where: {
          transactionId: transactionId,
          isDeleted: false
        }
      });
      
      const totalExpenses = transactionExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { capitalCost: totalExpenses }
      });
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