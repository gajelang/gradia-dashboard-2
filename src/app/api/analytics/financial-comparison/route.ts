// src/app/api/analytics/financial-comparison/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const months = searchParams.get('months') ? parseInt(searchParams.get('months') as string) : 6;
    
    // Get current date and calculate start date based on number of months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1); // Start from the first day of the month
    
    // Prepare month labels and empty data structure
    const result = [];
    
    // Create a date to iterate through months
    const currentDate = new Date(startDate);
    
    // Generate data for each month
    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Format month label
      const monthLabel = `${currentDate.toLocaleString('default', { month: 'short' })} ${currentDate.getFullYear()}`;
      
      // Query transactions for this month (paid or partially paid)
      const transactions = await prisma.transaction.findMany({
        where: {
          date: {
            gte: monthStart,
            lte: monthEnd
          },
          isDeleted: false,
          paymentStatus: {
            in: ['Lunas', 'DP']
          }
        }
      });
      
      // Query expenses for this month
      const expenses = await prisma.expense.findMany({
        where: {
          date: {
            gte: monthStart,
            lte: monthEnd
          },
          isDeleted: false
        }
      });
      
      // Calculate revenue
      const revenue = transactions.reduce((sum, transaction) => {
        if (transaction.paymentStatus === 'Lunas') {
          return sum + (transaction.projectValue || transaction.amount || 0);
        } else if (transaction.paymentStatus === 'DP') {
          return sum + (transaction.downPaymentAmount || 0);
        }
        return sum;
      }, 0);
      
      // Calculate expenses
      const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Calculate profit and profit margin
      const profit = revenue - expenseTotal;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      // Add data for this month
      result.push({
        month: monthLabel,
        revenue,
        expenses: expenseTotal,
        profit,
        profitMargin
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Calculate average profit margin
    const averageProfitMargin = result.length > 0
      ? result.reduce((sum, month) => sum + month.profitMargin, 0) / result.length
      : 0;
    
    return NextResponse.json({
      data: result,
      averageProfitMargin,
      timeRange: months.toString()
    });
  } catch (error) {
    console.error('Error fetching financial comparison data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}