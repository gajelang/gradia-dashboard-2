// Modified API endpoint to exclude soft-deleted items in fund calculations
// File: src/app/api/fund-balance/route.js

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

// Handle GET requests to retrieve fund balances
export async function GET(request) {
  // Verify authentication
  const authResult = await verifyAuthToken(request);
  if (!authResult.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all fund balances
    const fundBalances = await prisma.fundBalance.findMany();
    
    // If no fund records exist, create default ones
    if (fundBalances.length === 0) {
      await prisma.fundBalance.createMany({
        data: [
          { fundType: 'petty_cash', currentBalance: 0 },
          { fundType: 'profit_bank', currentBalance: 0 }
        ]
      });
      
      // Fetch the newly created records
      const newBalances = await prisma.fundBalance.findMany();
      return NextResponse.json(newBalances);
    }

    // Calculate correct balances by excluding soft-deleted transactions and expenses
    const recalculatedBalances = await Promise.all(fundBalances.map(async (fundBalance) => {
      // Get fund type
      const fundType = fundBalance.fundType;
      
      // Find all active transactions for this fund
      const transactions = await prisma.transaction.findMany({
        where: {
          fundType,
          isDeleted: false // Only include non-deleted transactions
        }
      });
      
      // Find all active expenses for this fund
      const expenses = await prisma.expense.findMany({
        where: {
          fundType,
          isDeleted: false // Only include non-deleted expenses
        }
      });
      
      // Calculate correct balance based on transaction amounts and expenses
      let recalculatedBalance = 0;
      
      // Add income from transactions (only consider paid amounts)
      transactions.forEach(transaction => {
        if (transaction.paymentStatus === "Lunas") {
          recalculatedBalance += transaction.totalProfit || transaction.projectValue || 0;
        } else if (transaction.paymentStatus === "DP") {
          recalculatedBalance += transaction.downPaymentAmount || 0;
        }
      });
      
      // Subtract expenses
      expenses.forEach(expense => {
        recalculatedBalance -= expense.amount || 0;
      });
      
      // Get the fund transactions to reconcile the difference if needed
      const fundTransactions = await prisma.fundTransaction.findMany({
        where: { fundType },
        orderBy: { createdAt: 'desc' }
      });
      
      // Find the latest balance after a reconciliation, if exists
      const latestReconciliation = fundTransactions.find(tx => tx.transactionType === 'adjustment');
      
      // If a reconciliation exists, use its balance as the starting point
      if (latestReconciliation) {
        // Get all transactions after the reconciliation
        const laterTransactions = fundTransactions.filter(tx => 
          new Date(tx.createdAt) > new Date(latestReconciliation.createdAt)
        );
        
        // Start with the reconciled balance
        recalculatedBalance = latestReconciliation.balanceAfter;
        
        // Apply all transactions that happened after the reconciliation
        laterTransactions.forEach(tx => {
          recalculatedBalance += tx.amount;
        });
      }
      
      // Return the fund with corrected balance
      return {
        ...fundBalance,
        // Keep the original balance, but add the corrected one for reference
        calculatedBalance: recalculatedBalance
      };
    }));
    
    return NextResponse.json(recalculatedBalances);
  } catch (error) {
    console.error('Error fetching fund balances:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Reconcile fund balance (manually adjust to match actual balance)
export async function POST(request) {
  // Verify authentication
  const authResult = await verifyAuthToken(request);
  if (!authResult.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { fundType, actualBalance, description } = body;
    
    if (!fundType || actualBalance === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Find the fund record
    const fund = await prisma.fundBalance.findUnique({
      where: { fundType }
    });
    
    if (!fund) {
      return NextResponse.json({ error: 'Fund type not found' }, { status: 404 });
    }
    
    // Calculate the adjustment amount
    const adjustmentAmount = actualBalance - fund.currentBalance;
    
    // Update in a transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update the fund balance
      const updatedFund = await tx.fundBalance.update({
        where: { fundType },
        data: {
          currentBalance: actualBalance,
          lastReconciledBalance: actualBalance,
          lastReconciledAt: new Date()
        }
      });
      
      // Create a transaction record for this reconciliation
      const transaction = await tx.fundTransaction.create({
        data: {
          fundType,
          transactionType: 'adjustment',
          amount: adjustmentAmount,
          balanceAfter: actualBalance,
          description: description || `Manual reconciliation: ${adjustmentAmount >= 0 ? 'added' : 'removed'} ${Math.abs(adjustmentAmount)}`,
          sourceType: 'manual_adjustment',
          createdById: authResult.user?.userId
        }
      });
      
      return { updatedFund, transaction };
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reconciling fund balance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}