// app/api/cron/subscription-reminders/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * This route handles scheduled generation of subscription reminder notifications.
 * It should be triggered by a cron job or similar scheduler.
 * 
 * Security: This endpoint should be protected by an API key or similar
 * mechanism in production. For now, it checks for a secret in the request.
 */
export async function GET(request) {
  try {
    // Verify that this is a legitimate cron request using a secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find all active subscriptions that need reminders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const subscriptions = await prisma.inventory.findMany({
      where: {
        type: 'SUBSCRIPTION',
        isDeleted: false,
        status: 'ACTIVE',
        nextBillingDate: {
          not: null
        },
        isRecurring: true
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (subscriptions.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions found' });
    }
    
    const subscribedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'admin' },
          { role: 'pic' }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        profile: {
          select: {
            enableEmailNotifications: true
          }
        }
      }
    });
    
    let remindersSent = 0;
    const results = [];
    
    // Process each subscription for reminders
    for (const subscription of subscriptions) {
      try {
        if (!subscription.nextBillingDate || !subscription.reminderDays) {
          continue;
        }
        
        const nextBillingDate = new Date(subscription.nextBillingDate);
        const reminderDate = new Date(nextBillingDate);
        reminderDate.setDate(reminderDate.getDate() - subscription.reminderDays);
        
        // If today is the reminder date, create notifications
        if (
          today.getFullYear() === reminderDate.getFullYear() &&
          today.getMonth() === reminderDate.getMonth() &&
          today.getDate() === reminderDate.getDate()
        ) {
          // For each admin/finance user, create a notification
          for (const user of subscribedUsers) {
            // Skip users who have disabled notifications, if that preference exists
            if (user.profile && user.profile.enableEmailNotifications === false) {
              continue;
            }
            
            // Create notification
            await prisma.notification.create({
              data: {
                type: 'SUBSCRIPTION_REMINDER',
                title: 'Upcoming Subscription Payment',
                message: `Subscription "${subscription.name}" is due for payment in ${subscription.reminderDays} days (${nextBillingDate.toLocaleDateString()}). The cost is ${subscription.cost}.`,
                isRead: false,
                dueDate: nextBillingDate,
                entityId: subscription.id,
                entityType: 'INVENTORY',
                userId: user.id
              }
            });
            
            remindersSent++;
          }
          
          results.push({
            id: subscription.id,
            name: subscription.name,
            nextBillingDate,
            status: 'reminder_sent'
          });
        }
      } catch (error) {
        console.error(`Error processing reminder for subscription ${subscription.id}:`, error);
        
        results.push({
          id: subscription.id,
          name: subscription.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      message: `Sent ${remindersSent} subscription reminders`,
      results
    });
  } catch (error) {
    console.error('Error in subscription reminders processing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}