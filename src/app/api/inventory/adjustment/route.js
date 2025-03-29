// app/api/inventory/adjustment/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

// Handler for POST requests - Create new inventory adjustment
export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      inventoryId,
      adjustmentType,
      adjustmentQuantity,
      reason,
      notes
    } = body;

    // Validate required fields
    if (!inventoryId || !adjustmentType || !adjustmentQuantity) {
      return NextResponse.json({ 
        error: 'Missing required fields. Required: inventoryId, adjustmentType, adjustmentQuantity' 
      }, { status: 400 });
    }

    // Find the inventory item
    const item = await prisma.inventory.findUnique({
      where: { id: inventoryId }
    });

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Check if it's a subscription type
    if (item.type === 'SUBSCRIPTION') {
      return NextResponse.json({ 
        error: 'Cannot adjust quantity for subscription items' 
      }, { status: 400 });
    }

    // Calculate new quantity
    let newQuantity;
    if (adjustmentType === 'increase') {
      newQuantity = item.quantity + parseInt(adjustmentQuantity);
    } else if (adjustmentType === 'decrease') {
      if (item.quantity < parseInt(adjustmentQuantity)) {
        return NextResponse.json({ 
          error: 'Cannot decrease by more than current quantity' 
        }, { status: 400 });
      }
      newQuantity = item.quantity - parseInt(adjustmentQuantity);
    } else {
      return NextResponse.json({ 
        error: 'Invalid adjustment type. Must be "increase" or "decrease"'
      }, { status: 400 });
    }

    // Start a transaction to handle both inventory update and adjustment record
    const result = await prisma.$transaction(async (tx) => {
      // Record the adjustment
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          inventoryId,
          adjustmentType,
          quantity: parseInt(adjustmentQuantity),
          previousQuantity: item.quantity,
          newQuantity,
          reason: reason || null,
          notes: notes || null,
          adjustedById: authResult.user?.userId || null
        }
      });

      // Update the inventory item
      const updatedItem = await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          quantity: newQuantity,
          totalValue: newQuantity * parseFloat(item.unitPrice),
          updatedById: authResult.user?.userId || null,
          updatedAt: new Date()
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

      return { adjustment, item: updatedItem };
    });

    return NextResponse.json({
      message: `Inventory quantity ${adjustmentType}d successfully`,
      adjustment: result.adjustment,
      item: result.item
    });
  } catch (error) {
    console.error('Error adjusting inventory quantity:', error);
    return NextResponse.json({ 
      error: 'Failed to adjust inventory quantity',
      details: error.message 
    }, { status: 500 });
  }
}

// Handler for GET requests - Fetch adjustment history for an inventory item
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const inventoryId = searchParams.get('inventoryId');
    
    if (!inventoryId) {
      return NextResponse.json({ error: 'Missing inventoryId parameter' }, { status: 400 });
    }

    // Check if the inventory item exists
    const item = await prisma.inventory.findUnique({
      where: { id: inventoryId }
    });

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Fetch adjustment history
    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: {
        inventoryId
      },
      include: {
        adjustedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        adjustedAt: 'desc'
      }
    });

    return NextResponse.json(adjustments);
  } catch (error) {
    console.error('Error fetching adjustment history:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch adjustment history',
      details: error.message 
    }, { status: 500 });
  }
}