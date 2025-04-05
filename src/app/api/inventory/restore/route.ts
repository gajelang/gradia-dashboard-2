// Fixed src/app/api/inventory/restore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, restoredBy } = body;

    if (!id) {
      return NextResponse.json({ error: 'Inventory item ID is required' }, { status: 400 });
    }

    // Find the inventory item to ensure it exists and is archived
    const inventoryItem = await prisma.inventory.findUnique({
      where: { id }
    });
    
    if (!inventoryItem) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }
    
    if (!inventoryItem.isDeleted) {
      return NextResponse.json({ error: 'Inventory item is not archived' }, { status: 400 });
    }

    // Handle restoration based on inventory type
    if (inventoryItem.type === 'SUBSCRIPTION') {
      // Handle subscription restoration
      const restoredSubscription = await prisma.inventory.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedById: null,
          updatedAt: new Date(),
          updatedById: restoredBy || authResult.user?.userId || null
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              serviceDesc: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          updatedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return NextResponse.json({
        message: 'Subscription restored successfully',
        subscription: restoredSubscription
      });
    } else {
      // Handle regular inventory restoration
      // For regular inventory, we need to handle quantity adjustments
      const updatedItem = await prisma.inventory.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedById: null,
          updatedAt: new Date(),
          updatedById: restoredBy || authResult.user?.userId || null
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              serviceDesc: true
            }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // If this was a deletion that had a quantity adjustment, it would be good to
      // create an inventory adjustment record showing the restoration
      if (updatedItem.quantity > 0) {
        await prisma.inventoryAdjustment.create({
          data: {
            inventoryId: id,
            adjustmentType: 'increase',
            quantity: updatedItem.quantity,
            previousQuantity: 0,
            newQuantity: updatedItem.quantity,
            reason: 'Inventory item restored from archive',
            adjustedById: restoredBy || authResult.user?.userId || null
          }
        });
      }

      return NextResponse.json({
        message: 'Inventory item restored successfully',
        item: updatedItem
      });
    }
  } catch (error) {
    console.error('Error restoring inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}