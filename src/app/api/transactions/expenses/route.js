// File: app/api/transactions/expenses/route.js
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
    const transactionId = searchParams.get('transactionId');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    console.log(`Fetching expenses for transaction: ${transactionId}, includeArchived: ${includeArchived}`);

    // Fetch active expenses
    const activeExpenses = await prisma.expense.findMany({
      where: {
        transactionId: transactionId,
        isDeleted: false
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Fetch archived expenses if requested
    let archivedExpenses = [];
    if (includeArchived) {
      archivedExpenses = await prisma.expense.findMany({
        where: {
          transactionId: transactionId,
          isDeleted: true
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          },
          deletedBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { date: 'desc' }
      });
    }

    // Calculate total capital cost (sum of active expenses)
    const totalCapitalCost = activeExpenses.reduce(
      (sum, expense) => sum + expense.amount, 
      0
    );

    // Combine all expenses
    const allExpenses = [...activeExpenses, ...archivedExpenses];

    return NextResponse.json({
      expenses: allExpenses,
      activeExpenses: activeExpenses,
      archivedExpenses: archivedExpenses,
      totalCapitalCost: totalCapitalCost
    });
  } catch (error) {
    console.error('Error fetching transaction expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}