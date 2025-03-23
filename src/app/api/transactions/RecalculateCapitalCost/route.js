// api/transactions/recalculateCapitalCost/route.js
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

    // Get all active expenses for this transaction
    const activeExpenses = await prisma.expense.findMany({
      where: {
        transactionId: transactionId,
        isDeleted: false
      }
    });

    console.log(`Found ${activeExpenses.length} active expenses for transaction ${transactionId}`);

    // Calculate new capital cost based only on active expenses
    const newCapitalCost = activeExpenses.reduce(
      (sum, exp) => sum + (exp.amount || 0), 
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