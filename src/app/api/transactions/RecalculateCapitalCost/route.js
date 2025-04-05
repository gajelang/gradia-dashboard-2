// Fixed src/app/api/transactions/recalculateCapitalCost/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    console.log(`Recalculating capital cost for transaction ${transactionId}`);

    // Check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Get all active expenses for this transaction
    const activeExpenses = await prisma.expense.findMany({
      where: {
        transactionId: transactionId,
        isDeleted: false
      }
    });

    console.log(`Found ${activeExpenses.length} active expenses for transaction ${transactionId}`);

    // Calculate new capital cost based only on active expenses
    // Type-safe summation that handles different types of amount values
    const newCapitalCost = activeExpenses.reduce(
      (sum, exp) => {
        const expAmount = typeof exp.amount === 'number' 
          ? exp.amount 
          : parseFloat(exp.amount || '0');
        return sum + (isNaN(expAmount) ? 0 : expAmount);
      }, 
      0
    );

    console.log(`New capital cost for transaction ${transactionId}: ${newCapitalCost}`);

    // Update the transaction with new capital cost
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { capitalCost: newCapitalCost }
    });

    console.log(`Updated transaction ${transactionId} capital cost to ${newCapitalCost}`);

    return NextResponse.json({
      message: 'Capital cost updated successfully',
      capitalCost: newCapitalCost
    });
  } catch (error) {
    console.error('Error recalculating capital cost:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}