// app/api/inventory/softDelete/route.ts
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
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Inventory item ID is required' }, { status: 400 });
    }

    // Find the inventory item to ensure it exists
    const inventoryItem = await prisma.inventory.findUnique({
      where: { id }
    });
    
    if (!inventoryItem) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }
    
    // Check if the item is already deleted
    if (inventoryItem.isDeleted) {
      return NextResponse.json({ error: 'Inventory item is already archived' }, { status: 400 });
    }

    // Soft delete the inventory item
    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: authResult.user?.userId || null
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
        },
        deletedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({
      message: 'Inventory item archived successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('Error archiving inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}