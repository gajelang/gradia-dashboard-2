// api/expenses/restore/route.js
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
    const { id, restoredBy } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    console.log(`Restoring expense ${id}, restoredBy=${restoredBy}`);

    // Find expense to get the transactionId if it exists
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { transactionId: true, amount: true }
    });

    console.log(`Expense info: ${JSON.stringify(expense)}`);

    // Perform restore in a transaction
    const restoredExpense = await prisma.$transaction(async (prisma) => {
      // Restore the expense
      const restored = await prisma.expense.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedById: null,
          updatedAt: new Date(),
          updatedById: restoredBy || null
        }
      });

      console.log(`Restored expense ${id}`);

      // If expense is linked to a transaction, update the transaction's capitalCost
      if (expense?.transactionId) {
        console.log(`Expense ${id} is linked to transaction ${expense.transactionId}`);
        
        // Get all active expenses for this transaction (including the just-restored one)
        const activeExpenses = await prisma.expense.findMany({
          where: {
            transactionId: expense.transactionId,
            isDeleted: false
          }
        });

        console.log(`Found ${activeExpenses.length} active expenses for transaction ${expense.transactionId}`);

        // Calculate new capital cost including the restored expense
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

      return restored;
    });

    return NextResponse.json({
      message: 'Expense restored successfully',
      expense: restoredExpense
    });
  } catch (error) {
    console.error('Error restoring expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}