// api/expenses/softDelete/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { id, deletedBy } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    console.log(`Archiving expense ${id}, deletedBy=${deletedBy}`);

    // Find expense to get the transactionId if it exists
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { transactionId: true, amount: true }
    });

    console.log(`Expense info: ${JSON.stringify(expense)}`);

    // Perform soft delete in a transaction
    const updatedExpense = await prisma.$transaction(async (prisma) => {
      // Soft delete the expense
      const deletedExpense = await prisma.expense.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedById: deletedBy || null
        }
      });

      console.log(`Soft deleted expense ${id}`);

      // If expense is linked to a transaction, update the transaction's capitalCost
      if (expense?.transactionId) {
        console.log(`Expense ${id} is linked to transaction ${expense.transactionId}`);
        
        // Get all active expenses for this transaction
        const activeExpenses = await prisma.expense.findMany({
          where: {
            transactionId: expense.transactionId,
            isDeleted: false
          }
        });

        console.log(`Found ${activeExpenses.length} active expenses for transaction ${expense.transactionId}`);

        // Calculate new capital cost based only on active expenses
        const newCapitalCost = activeExpenses.reduce(
          (sum, exp) => sum + (exp.amount || 0), 
          0
        );

        console.log(`New capital cost for transaction ${expense.transactionId}: ${newCapitalCost}`);

        // Update the transaction with new capital cost
        await prisma.transaction.update({
          where: { id: expense.transactionId },
          data: { capitalCost: newCapitalCost }
        });

        console.log(`Updated transaction ${expense.transactionId} capital cost`);
      }

      return deletedExpense;
    });

    return NextResponse.json({
      message: 'Expense archived successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Error archiving expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}