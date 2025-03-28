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

    // Fetch subscriptions (Inventory items of type SUBSCRIPTION)
    const subscriptions = await prisma.inventory.findMany({
      where: {
        type: 'SUBSCRIPTION',
        isDeleted: false,
      },
      orderBy: {
        nextBillingDate: 'asc'
      },
      include: {
        vendor: {
          select: { 
            id: true, 
            name: true, 
            serviceDesc: true 
          }
        }
      }
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}