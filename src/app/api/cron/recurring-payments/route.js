// app/api/cron/recurring-payments/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * This route handles scheduled processing of recurring payments.
 * It should be triggered by a cron job or similar scheduler.
 */
export async function GET(request) {
  try {
    // Verify that this is a legitimate cron request using a secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find all active recurring expenses that need processing
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueBillings = await prisma.expense.findMany({
      where: {
        isRecurringExpense: true,
        isActive: true,
        isDeleted: false,
        nextBillingDate: {
          lte: today
        }
      },
      include: {
        inventory: {
          select: {
            id: true,
            name: true,
            type: true,
            recurringType: true,
            cost: true,
            autoRenew: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (dueBillings.length === 0) {
      return NextResponse.json({ message: 'No recurring payments to process today' });
    }
    
    let processed = 0;
    let failed = 0;
    const results = [];
    
    // Process each recurring payment
    for (const expense of dueBillings) {
      try {
        // Skip if subscription is not set to auto-renew
        if (expense.inventory && expense.inventory.type === 'SUBSCRIPTION' && !expense.inventory.autoRenew) {
          results.push({
            id: expense.id,
            status: 'skipped',
            reason: 'Subscription auto-renew is disabled'
          });
          continue;
        }
        
        // Create a new expense record for this billing cycle
        const newExpense = await prisma.expense.create({
          data: {
            category: expense.category,
            amount: expense.amount,
            description: `${expense.description || ''} (Automatic recurring payment for ${expense.inventory?.name || 'subscription'})`,
            date: new Date(),
            paymentProofLink: null,
            transactionId: expense.transactionId,
            inventoryId: expense.inventoryId,
            fundType: expense.fundType,
            isRecurringExpense: false, // This is a single payment, not recurring
            createdById: expense.createdById
          }
        });
        
        // Calculate the next billing date based on the frequency
        let nextBillingDate = new Date();
        switch (expense.recurringFrequency) {
          case 'MONTHLY':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            break;
          case 'QUARTERLY':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
            break;
          case 'ANNUALLY':
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
            break;
          default:
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }
        
        // Update the recurring expense with the new next billing date
        await prisma.expense.update({
          where: { id: expense.id },
          data: {
            lastProcessedDate: new Date(),
            nextBillingDate
          }
        });
        
        // If this is a subscription inventory item, update its billing date too
        if (expense.inventoryId) {
          await prisma.inventory.update({
            where: { id: expense.inventoryId },
            data: {
              lastBillingDate: new Date(),
              nextBillingDate
            }
          });
        }
        
        // Create a notification for admins/finance team
        await prisma.notification.create({
          data: {
            type: 'SUBSCRIPTION_PAYMENT',
            title: 'Automatic Subscription Payment',
            message: `An automatic payment of ${expense.amount} was processed for ${expense.inventory?.name || 'subscription'}.`,
            isRead: false,
            dueDate: null,
            entityId: expense.id,
            entityType: 'EXPENSE',
            userId: expense.createdById || '1', // Fallback to a default admin ID if needed
          }
        });
        
        results.push({
          id: expense.id,
          status: 'success',
          newExpenseId: newExpense.id,
          nextBillingDate
        });
        
        processed++;
      } catch (error) {
        console.error(`Error processing recurring payment ${expense.id}:`, error);
        
        results.push({
          id: expense.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        failed++;
      }
    }
    
    return NextResponse.json({
      message: `Processed ${processed} recurring payments, ${failed} failed`,
      results
    });
  } catch (error) {
    console.error('Error in recurring payments processing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler for manual trigger of the recurring payment process
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get IDs of expenses to process from the request
    const { expenseIds } = await request.json();
    
    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return NextResponse.json({ error: 'No expense IDs provided' }, { status: 400 });
    }
    
    // Rest of implementation...
    // Continue with your existing code but without TypeScript annotations
  } catch (error) {
    console.error('Error in manual recurring payments processing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}