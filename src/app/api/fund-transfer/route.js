// src/app/api/fund-transfer/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from "@/lib/auth/auth";

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

// Handle GET requests
export async function GET(request) {
  // Verify authentication
  const authResult = await verifyAuthToken(request);
  if (!authResult.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Return basic info about this endpoint
    return NextResponse.json({
      endpoint: 'Fund Transfer API',
      description: 'API for transferring funds between fund types',
      methods: {
        POST: {
          description: 'Transfer funds between fund types',
          body: {
            fromFundType: 'Source fund type (petty_cash or profit_bank)',
            toFundType: 'Destination fund type (petty_cash or profit_bank)',
            amount: 'Amount to transfer (positive number)',
            description: 'Optional description of the transfer'
          },
          returns: {
            fromFund: 'Updated source fund balance',
            toFund: 'Updated destination fund balance',
            outTransaction: 'Transaction record for outgoing transfer',
            inTransaction: 'Transaction record for incoming transfer'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error processing GET request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle POST requests for fund transfers
export async function POST(request) {
  // Verify authentication
  const authResult = await verifyAuthToken(request);
  if (!authResult.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { fromFundType, toFundType, amount, description } = body;
    
    if (!fromFundType || !toFundType || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Missing required fields or invalid amount' }, { status: 400 });
    }
    
    if (fromFundType === toFundType) {
      return NextResponse.json({ error: 'Cannot transfer to the same fund type' }, { status: 400 });
    }
    
    // Process fund transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get current fund balances
      const fromFund = await tx.fundBalance.findUnique({
        where: { fundType: fromFundType }
      });
      
      const toFund = await tx.fundBalance.findUnique({
        where: { fundType: toFundType }
      });
      
      if (!fromFund || !toFund) {
        throw new Error('One or both fund types not found');
      }
      
      if (fromFund.currentBalance < amount) {
        throw new Error(`Insufficient balance in ${fromFundType}`);
      }
      
      // Calculate new balances
      const newFromBalance = fromFund.currentBalance - amount;
      const newToBalance = toFund.currentBalance + amount;
      
      // Update fund balances
      await tx.fundBalance.update({
        where: { fundType: fromFundType },
        data: { currentBalance: newFromBalance }
      });
      
      await tx.fundBalance.update({
        where: { fundType: toFundType },
        data: { currentBalance: newToBalance }
      });
      
      // Create transaction records for both sides of the transfer
      const outTransaction = await tx.fundTransaction.create({
        data: {
          fundType: fromFundType,
          transactionType: 'transfer_out',
          amount: -amount, // Negative amount for outgoing transfer
          balanceAfter: newFromBalance,
          description: description || `Transfer to ${toFundType}`,
          sourceType: 'fund_transfer',
          createdById: authResult.user?.userId
        }
      });
      
      const inTransaction = await tx.fundTransaction.create({
        data: {
          fundType: toFundType,
          transactionType: 'transfer_in',
          amount: amount,
          balanceAfter: newToBalance,
          description: description || `Transfer from ${fromFundType}`,
          sourceType: 'fund_transfer',
          createdById: authResult.user?.userId,
          referenceId: outTransaction.id // Link to the outgoing transaction
        }
      });
      
      // Update the outgoing transaction with the reference to the incoming transaction
      await tx.fundTransaction.update({
        where: { id: outTransaction.id },
        data: { referenceId: inTransaction.id }
      });
      
      return { 
        fromFund: { ...fromFund, currentBalance: newFromBalance },
        toFund: { ...toFund, currentBalance: newToBalance },
        outTransaction,
        inTransaction
      };
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error transferring funds:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}