import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Handler for GET requests - Fetch unpaid inventory and subscription items
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'inventory', 'subscription', or null for both

    // Build where clause for query
    const whereClause: any = {
      isDeleted: false,
      paymentStatus: 'BELUM_BAYAR'
    };

    // Add a check to ensure we're not including items that have been paid
    // This is a safeguard in case the paymentStatus wasn't properly updated

    // Add type filter if provided
    if (type === 'subscription') {
      whereClause.type = 'SUBSCRIPTION';
    } else if (type === 'inventory') {
      whereClause.type = {
        in: ['EQUIPMENT', 'OTHER']
      };
    }

    // Query for unpaid items
    const unpaidItems = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            serviceDesc: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        // Include expenses to check if there are any payments
        expenses: {
          where: {
            isDeleted: false
          },
          select: {
            id: true,
            amount: true,
            date: true
          }
        }
      },
      orderBy: [
        {
          type: 'asc'
        },
        {
          nextBillingDate: 'asc'
        },
        {
          createdAt: 'desc'
        }
      ]
    });

    // Filter out items that have expenses (payments) but weren't properly marked as paid
    const filteredUnpaidItems = unpaidItems.filter(item => {
      // If there are no expenses, it's definitely unpaid
      if (!item.expenses || item.expenses.length === 0) {
        return true;
      }

      // Calculate total paid amount
      const totalPaid = item.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

      // If total paid amount is close to the cost, it should be considered paid
      // Using a small epsilon for floating point comparison
      const epsilon = 0.01;
      const itemCost = Number(item.cost);

      // If the difference between cost and total paid is less than epsilon, consider it paid
      return Math.abs(itemCost - totalPaid) > epsilon;
    });

    // Also get partially paid items (DP)
    const partiallyPaidItems = await prisma.inventory.findMany({
      where: {
        ...whereClause,
        paymentStatus: 'DP'
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            serviceDesc: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        // Include expenses to check if there are any payments
        expenses: {
          where: {
            isDeleted: false
          },
          select: {
            id: true,
            amount: true,
            date: true
          }
        }
      },
      orderBy: [
        {
          type: 'asc'
        },
        {
          nextBillingDate: 'asc'
        },
        {
          createdAt: 'desc'
        }
      ]
    });

    // Filter out partially paid items that have been fully paid
    const filteredPartiallyPaidItems = partiallyPaidItems.filter(item => {
      // If there are no expenses, something is wrong (it shouldn't be DP without expenses)
      // but we'll include it anyway
      if (!item.expenses || item.expenses.length === 0) {
        return true;
      }

      // Calculate total paid amount
      const totalPaid = item.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

      // If total paid amount is close to the cost, it should be considered fully paid
      const epsilon = 0.01;
      const itemCost = Number(item.cost);

      // If the difference between cost and total paid is more than epsilon, it's still partially paid
      return Math.abs(itemCost - totalPaid) > epsilon;
    });

    // Remove expenses from the response to keep it clean
    const cleanFilteredUnpaidItems = filteredUnpaidItems.map(item => {
      const { expenses, ...rest } = item;
      return rest;
    });

    const cleanFilteredPartiallyPaidItems = filteredPartiallyPaidItems.map(item => {
      const { expenses, ...rest } = item;
      return rest;
    });

    return NextResponse.json({
      unpaidItems: cleanFilteredUnpaidItems,
      partiallyPaidItems: cleanFilteredPartiallyPaidItems
    });
  } catch (error) {
    console.error('Error fetching unpaid items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
