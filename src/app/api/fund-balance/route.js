// src/app/api/fund-balance/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
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
    
    return NextResponse.json(fundBalances);
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