// src/app/api/projects/profitability/route.ts
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
    
    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    
    // Determine date range based on period
    let startDate = new Date();
    const endDate = new Date();
    
    switch (period) {
      case 'month':
        startDate.setDate(1); // First day of current month
        break;
      case 'quarter':
        startDate.setMonth(Math.floor(startDate.getMonth() / 3) * 3, 1); // First day of current quarter
        break;
      case 'ytd':
        startDate = new Date(startDate.getFullYear(), 0, 1); // January 1st of current year
        break;
      case 'all':
        startDate = new Date(2000, 0, 1); // Far back in past for "all time"
        break;
      default:
        startDate.setDate(1); // Default to current month
    }
    
    // Find transactions for the period
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        isDeleted: false,
        paymentStatus: {
          in: ['Lunas', 'DP'] // Only include paid or partially paid transactions
        }
      },
      include: {
        expenses: {
          where: {
            isDeleted: false
          }
        }
      }
    });
    
    // Process transactions to calculate profitability
    const projects = transactions.map(transaction => {
      // Calculate total expenses for this transaction
      const totalExpenses = transaction.expenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Calculate revenue based on payment status
      let revenue = 0;
      if (transaction.paymentStatus === 'Lunas') {
        revenue = transaction.projectValue || transaction.amount || 0;
      } else if (transaction.paymentStatus === 'DP') {
        revenue = transaction.downPaymentAmount || 0;
      }
      
      // Calculate profit
      const profit = revenue - totalExpenses;
      
      // Calculate profit margin
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      // Determine if project is in progress
      const isInProgress = transaction.paymentStatus === 'DP' || 
        (transaction.endDate && transaction.endDate > new Date());
      
      return {
        name: transaction.name,
        profitMargin,
        profit,
        inProgress: isInProgress
      };
    });
    
    return NextResponse.json({
      projects,
      period
    });
  } catch (error) {
    console.error('Error fetching project profitability data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}