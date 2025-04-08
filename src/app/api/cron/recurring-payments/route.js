// app/api/cron/recurring-payments/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from "@/lib/auth/auth";

/**
 * This API route handles processing of recurring payments.
 * It can be triggered by:
 * 1. A cron job for automatic daily processing
 * 2. Manual trigger from the UI for immediate processing
 */
export async function POST(request) {
  try {
    // Optional authentication check - if coming from UI, require auth
    // If coming from a cron job with secret key, bypass auth
    const isAuthorized = await checkAuthorization(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let expenseIds = [];
    let userId = null;
    
    // Check if this is a specific request for certain expenses
    try {
      const body = await request.json();
      expenseIds = body.expenseIds || [];
      userId = body.userId || null;
    } catch (error) {
      // No body or invalid JSON, continue with all expenses
      console.log("No specific expenses requested, processing all due expenses");
    }

    const result = await processRecurringPayments(expenseIds, userId);
    
    return NextResponse.json({
      message: 'Recurring payments processed successfully',
      results: result
    });
  } catch (error) {
    console.error('Error processing recurring payments:', error);
    return NextResponse.json({ 
      error: 'Failed to process recurring payments',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Check if the request is authorized
 * - Either from a logged in user
 * - Or from a cron job with the correct secret
 */
async function checkAuthorization(request) {
  // Check for auth token first (for UI requests)
  const authResult = await verifyAuthToken(request);
  if (authResult.isAuthenticated) {
    return true;
  }
  
  // Then check for cron secret (for automated jobs)
  const apiSecret = process.env.CRON_API_SECRET;
  if (!apiSecret) {
    console.warn("CRON_API_SECRET is not set in environment variables");
    return false;
  }
  
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader === `Bearer ${apiSecret}`) {
    return true;
  }
  
  return false;
}

/**
 * Process recurring payments that are due
 * @param {string[]} specificExpenseIds - Optional array of specific expense IDs to process
 * @param {string} userId - Optional user ID to attribute the processing to
 */
async function processRecurringPayments(specificExpenseIds = [], userId = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Query for recurring expenses that are due
  const whereClause = {
    isRecurringExpense: true,
    isActive: true,
    nextBillingDate: {
      lt: tomorrow,
    },
    isDeleted: false
  };
  
  // If specific expenses were requested, only process those
  if (specificExpenseIds.length > 0) {
    whereClause.id = {
      in: specificExpenseIds
    };
  }
  
  const dueExpenses = await prisma.expense.findMany({
    where: whereClause,
    include: {
      inventory: true
    }
  });
  
  console.log(`Found ${dueExpenses.length} recurring expenses due for processing`);
  
  const results = [];
  
  // Process each due expense
  for (const expense of dueExpenses) {
    try {
      // Calculate the next billing date based on the frequency
      const nextBillingDate = calculateNextBillingDate(
        expense.nextBillingDate || new Date(),
        expense.recurringFrequency
      );
      
      // Create a new expense for this period
      const newExpense = await prisma.expense.create({
        data: {
          category: expense.category,
          amount: expense.amount,
          description: `${expense.description || 'Recurring payment'} - ${new Date().toLocaleDateString()}`,
          date: new Date(),
          paymentProofLink: null,
          transactionId: expense.transactionId,
          fundType: expense.fundType || 'petty_cash',
          inventoryId: expense.inventoryId,
          createdById: userId || expense.createdById,
          isRecurringExpense: false, // This is an instance, not the recurring template
        }
      });
      
      // Update the original recurring expense with the new next billing date
      const updatedExpense = await prisma.expense.update({
        where: { id: expense.id },
        data: {
          lastProcessedDate: new Date(),
          nextBillingDate: nextBillingDate,
          updatedById: userId || expense.createdById,
        }
      });
      
      // If this is a subscription payment, update the subscription
      if (expense.inventoryId && expense.inventory?.type === 'SUBSCRIPTION') {
        await prisma.inventory.update({
          where: { id: expense.inventoryId },
          data: {
            lastBillingDate: new Date(),
            nextBillingDate: nextBillingDate,
            updatedById: userId || expense.createdById,
            // Mark subscription as paid
            paymentStatus: 'LUNAS'
          }
        });
      }
      
      // If the payment affects company finances, update them
      try {
        const finance = await prisma.companyFinance.findFirst();
        
        if (finance) {
          await prisma.companyFinance.update({
            where: { id: finance.id },
            data: {
              totalFunds: {
                decrement: expense.amount
              }
            }
          });
        }
      } catch (financeError) {
        console.error("Error updating company finances:", financeError);
        // Continue even if finance update fails
      }
      
      results.push({
        expenseId: expense.id,
        newExpenseId: newExpense.id,
        status: 'success',
        nextBillingDate
      });
      
    } catch (error) {
      console.error(`Error processing expense ${expense.id}:`, error);
      results.push({
        expenseId: expense.id,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Calculate the next billing date based on frequency
 * @param {Date} currentDate - The current billing date
 * @param {string} frequency - MONTHLY, QUARTERLY, or ANNUALLY
 * @returns {Date} The next billing date
 */
function calculateNextBillingDate(currentDate, frequency) {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'ANNUALLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      // Default to monthly if frequency is not recognized
      nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return nextDate;
}