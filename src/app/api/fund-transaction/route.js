// Fixed src/app/api/fund-transaction/route.js
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

// Get fund transactions with improved pagination and filtering
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const fundType = searchParams.get('fundType');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100); // Cap max results at 100 for performance
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const transactionType = searchParams.get('transactionType');
    const sourceType = searchParams.get('sourceType');
    
    // Build where clause for filtering
    const whereClause = {};
    
    if (fundType) {
      whereClause.fundType = fundType;
    }
    
    // Add transaction type filter if provided
    if (transactionType) {
      whereClause.transactionType = transactionType;
    }
    
    // Add source type filter if provided
    if (sourceType) {
      whereClause.sourceType = sourceType;
    }
    
    // Add date range filter if provided
    if (startDate || endDate) {
      whereClause.createdAt = {};
      
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      
      if (endDate) {
        // End date should include the entire day, so set to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateTime;
      }
    }
    
    // Get total count for pagination
    const totalCount = await prisma.fundTransaction.count({
      where: whereClause
    });
    
    // Query for fund transactions with pagination
    const transactions = await prisma.fundTransaction.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    return NextResponse.json({
      transactions,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: skip + transactions.length < totalCount,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching fund transactions:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// Create a manual fund transaction (rest of the code is unchanged)
export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      fundType, 
      transactionType, 
      amount, 
      description,
      sourceType = 'manual_entry'
    } = body;
    
    if (!fundType || !transactionType || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate transaction type
    const validTypes = ['income', 'expense', 'transfer_in', 'transfer_out', 'adjustment'];
    if (!validTypes.includes(transactionType)) {
      return NextResponse.json({ 
        error: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}` 
      }, { status: 400 });
    }
    
    // Handle the transaction in a database transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get current fund balance
      const fund = await tx.fundBalance.findUnique({
        where: { fundType }
      });
      
      if (!fund) {
        throw new Error(`Fund type '${fundType}' not found`);
      }
      
      // Calculate new balance based on transaction type
      let newBalance = fund.currentBalance;
      let finalAmount = parseFloat(amount.toString());
      
      // For expense and transfer_out, make sure amount is negative
      if (transactionType === 'expense' || transactionType === 'transfer_out') {
        finalAmount = -Math.abs(finalAmount);
      } 
      // For income and transfer_in, make sure amount is positive
      else if (transactionType === 'income' || transactionType === 'transfer_in') {
        finalAmount = Math.abs(finalAmount);
      }
      // For adjustment, amount can be either positive or negative
      
      // Update the balance
      newBalance += finalAmount;
      
      // Update fund balance
      const updatedFund = await tx.fundBalance.update({
        where: { fundType },
        data: { currentBalance: newBalance }
      });
      
      // Create transaction record
      const transaction = await tx.fundTransaction.create({
        data: {
          fundType,
          transactionType,
          amount: finalAmount,
          balanceAfter: newBalance,
          description: description || `Manual ${transactionType} transaction`,
          sourceType,
          createdById: authResult.user?.userId
        }
      });
      
      // If this is a transfer, handle the corresponding transaction in the other fund
      if (transactionType === 'transfer_out' || transactionType === 'transfer_in') {
        const otherFundType = fundType === 'petty_cash' ? 'profit_bank' : 'petty_cash';
        const otherTransactionType = transactionType === 'transfer_out' ? 'transfer_in' : 'transfer_out';
        
        // Get the other fund
        const otherFund = await tx.fundBalance.findUnique({
          where: { fundType: otherFundType }
        });
        
        if (otherFund) {
          // Calculate new balance for other fund
          const otherNewBalance = otherFund.currentBalance + (transactionType === 'transfer_out' ? Math.abs(finalAmount) : -Math.abs(finalAmount));
          
          // Update other fund balance
          await tx.fundBalance.update({
            where: { fundType: otherFundType },
            data: { currentBalance: otherNewBalance }
          });
          
          // Create corresponding transaction in other fund
          const otherTransaction = await tx.fundTransaction.create({
            data: {
              fundType: otherFundType,
              transactionType: otherTransactionType,
              amount: transactionType === 'transfer_out' ? Math.abs(finalAmount) : -Math.abs(finalAmount),
              balanceAfter: otherNewBalance,
              description: description || `Transfer ${transactionType === 'transfer_out' ? 'from' : 'to'} ${fundType}`,
              sourceType: 'fund_transfer',
              referenceId: transaction.id, // Reference the original transaction
              createdById: authResult.user?.userId
            }
          });
          
          // Update original transaction with reference to the other transaction
          await tx.fundTransaction.update({
            where: { id: transaction.id },
            data: { referenceId: otherTransaction.id }
          });
        }
      }
      
      return { transaction, updatedFund };
    });
    
    return NextResponse.json({
      message: 'Fund transaction created successfully',
      transaction: result.transaction,
      updatedFund: result.updatedFund
    });
  } catch (error) {
    console.error('Error creating fund transaction:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}