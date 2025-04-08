// src/app/api/analytics/revenue/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from "@/lib/auth/auth";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current and previous month data
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get start and end dates for current month
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    // Get start and end dates for previous month
    const previousMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const previousMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // Query for current month revenue (all transactions, including both partially and fully paid)
    const currentMonthTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        },
        isDeleted: false,
        paymentStatus: {
          in: ['Lunas', 'DP']
        }
      }
    });
    
    // Query for previous month revenue
    const previousMonthTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: previousMonthStart,
          lte: previousMonthEnd
        },
        isDeleted: false,
        paymentStatus: {
          in: ['Lunas', 'DP']
        }
      }
    });

    // Calculate current month revenue
    let currentAmount = currentMonthTransactions.reduce((sum, transaction) => {
      if (transaction.paymentStatus === 'Lunas') {
        // For fully paid transactions, use the full project value or amount
        return sum + (transaction.projectValue || transaction.amount || 0);
      } else if (transaction.paymentStatus === 'DP') {
        // For down payments, use the down payment amount
        return sum + (transaction.downPaymentAmount || 0);
      }
      return sum;
    }, 0);

    // Calculate previous month revenue
    let previousAmount = previousMonthTransactions.reduce((sum, transaction) => {
      if (transaction.paymentStatus === 'Lunas') {
        return sum + (transaction.projectValue || transaction.amount || 0);
      } else if (transaction.paymentStatus === 'DP') {
        return sum + (transaction.downPaymentAmount || 0);
      }
      return sum;
    }, 0);

    // Calculate percentage change
    const percentageChange = previousAmount === 0 
      ? 100 // If previous month was 0, then we consider it a 100% increase
      : ((currentAmount - previousAmount) / previousAmount) * 100;
    
    // Get month name
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return NextResponse.json({
      currentAmount,
      previousAmount,
      percentageChange,
      month: monthNames[currentMonth],
      year: currentYear
    });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}