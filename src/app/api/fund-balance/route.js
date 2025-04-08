// Fixed src/app/api/fund-balance/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from "@/lib/auth/auth";

// Helper function to calculate correct balance from transactions and expenses
async function calculateActualBalanceForFund(fundType) {
  // Get initial fund balance - assume 0 if none found
  let balance = 0;
  
  // Find all transactions for this fund that are not deleted
  const transactions = await prisma.transaction.findMany({
    where: {
      fundType,
      isDeleted: false
    }
  });
  
  // Add income from transactions (only consider paid amounts)
  for (const transaction of transactions) {
    if (transaction.paymentStatus === "Lunas") {
      balance += transaction.totalProfit || transaction.projectValue || 0;
    } else if (transaction.paymentStatus === "DP") {
      balance += transaction.downPaymentAmount || 0;
    }
  }
  
  // Find all expenses for this fund that are not deleted
  const expenses = await prisma.expense.findMany({
    where: {
      fundType,
      isDeleted: false
    }
  });
  
  // Subtract expenses
  for (const expense of expenses) {
    balance -= expense.amount || 0;
  }
  
  // Find all fund transactions to account for other adjustments
  // like transfers, manual adjustments, etc.
  const fundTransactions = await prisma.fundTransaction.findMany({
    where: { fundType },
    orderBy: { createdAt: 'asc' }
  });
  
  // Process fund transactions to adjust balance
  // We'll use a smarter approach: find the earliest adjustment transaction as a starting point,
  // then apply all later transactions
  let startingAdjustmentTx = null;
  
  // Find the most recent reconciliation transaction
  for (const tx of fundTransactions) {
    if (tx.transactionType === 'adjustment' && tx.sourceType === 'manual_adjustment') {
      startingAdjustmentTx = tx;
    }
  }
  
  if (startingAdjustmentTx) {
    // Start with the balance after reconciliation
    balance = startingAdjustmentTx.balanceAfter;
    
    // Apply all transactions after this reconciliation
    const laterTransactions = fundTransactions.filter(tx => 
      new Date(tx.createdAt) > new Date(startingAdjustmentTx.createdAt)
    );
    
    for (const tx of laterTransactions) {
      balance += tx.amount;
    }
  } else {
    // If no reconciliation found, just use the calculated balance from revenue and expenses
    // Plus any transfers or other adjustments
    for (const tx of fundTransactions) {
      if (
        tx.sourceType !== 'transaction' && 
        tx.sourceType !== 'expense' && 
        tx.transactionType !== 'adjustment'
      ) {
        balance += tx.amount;
      }
    }
  }
  
  return balance;
}

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

    // Calculate correct balances for each fund
    const enhancedBalances = await Promise.all(fundBalances.map(async (fundBalance) => {
      // Calculate the actual balance based on transactions and expenses
      const calculatedBalance = await calculateActualBalanceForFund(fundBalance.fundType);
      
      // Return the fund with both the database balance and calculated balance
      return {
        ...fundBalance,
        calculatedBalance
      };
    }));
    
    return NextResponse.json(enhancedBalances);
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