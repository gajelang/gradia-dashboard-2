// app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from "@/lib/auth/auth";
import { authorizeRequest } from '@/lib/auth/authorization';

// Handler for GET requests - Fetch inventory items
export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const authResponse = await authorizeRequest(request, 'inventory:read');
    if (authResponse) {
      return authResponse;
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const fetchDeleted = searchParams.get('deleted') === 'true';
    const category = searchParams.get('category');

    // Build where clause for query
    const whereClause: any = {
      isDeleted: fetchDeleted
    };

    // Add category filter if provided
    if (category) {
      whereClause.category = category;
    }

    // Query for inventory items
    const inventoryItems = await prisma.inventory.findMany({
      where: whereClause,
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
        },
        deletedBy: fetchDeleted ? {
          select: {
            id: true,
            name: true,
            email: true
          }
        } : undefined
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(inventoryItems);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for POST requests - Create new inventory item
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authResponse = await authorizeRequest(request, 'inventory:write');
    if (authResponse) {
      return authResponse;
    }

    // Get user information
    const { user } = await verifyAuthToken(request);

    const body = await request.json();
    const {
      name,
      type,
      description,
      status,
      purchaseDate,
      expiryDate,
      expiryType,
      cost,
      currentValue,
      paymentStatus,
      downPaymentAmount,
      remainingAmount,
      vendorId,
      isRecurring,
      recurringType,
      nextBillingDate,
      reminderDays,
      category,
      quantity = 0,
      unitPrice = 0,
      location,
      minimumStock,
      supplier
    } = body;

    // Validate required fields
    if (!name || !type || !status || !purchaseDate || cost === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate total value
    const calculatedUnitPrice = unitPrice || cost;
    const totalValue = (quantity || 0) * Number(calculatedUnitPrice);

    // Create inventory item
    const inventoryItem = await prisma.inventory.create({
      data: {
        name,
        type,
        description: description || null,
        status,
        purchaseDate: new Date(purchaseDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        expiryType: expiryType || null,
        cost: parseFloat(cost),
        currentValue: currentValue ? parseFloat(currentValue) : null,
        paymentStatus,
        downPaymentAmount: downPaymentAmount ? parseFloat(downPaymentAmount) : null,
        remainingAmount: remainingAmount ? parseFloat(remainingAmount) : null,
        vendorId: vendorId || null,
        isRecurring: isRecurring || false,
        recurringType: recurringType || null,
        nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : null,
        reminderDays: reminderDays ? parseInt(reminderDays) : null,
        category: category || null,
        quantity: quantity || 0,
        unitPrice: parseFloat(calculatedUnitPrice),
        totalValue,
        location: location || null,
        minimumStock: minimumStock ? parseInt(minimumStock) : null,
        supplier: supplier || null,
        isDeleted: false,
        createdById: user?.id || null
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
        }
      }
    });

    return NextResponse.json({
      message: 'Inventory item created successfully',
      item: inventoryItem
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for PATCH requests - Update inventory item
export async function PATCH(request: NextRequest) {
  try {
    // Check authorization
    const authResponse = await authorizeRequest(request, 'inventory:write');
    if (authResponse) {
      return authResponse;
    }

    // Get user information
    const { user } = await verifyAuthToken(request);

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Inventory item ID is required' }, { status: 400 });
    }

    // Find the original item to check if quantities or other critical fields have changed
    const originalItem = await prisma.inventory.findUnique({
      where: { id },
      select: {
        id: true,
        quantity: true,
        unitPrice: true
      }
    });

    if (!originalItem) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Prepare update data
    const data = {
      ...updateData,
      updatedById: user?.id || null,
      updatedAt: new Date()
    };

    // Parse dates if they exist
    if (data.purchaseDate) {
      data.purchaseDate = new Date(data.purchaseDate);
    }

    if (data.expiryDate) {
      data.expiryDate = new Date(data.expiryDate);
    }

    if (data.nextBillingDate) {
      data.nextBillingDate = new Date(data.nextBillingDate);
    }

    // Recalculate total value if quantity or unit price has changed
    if ((data.quantity !== undefined || data.unitPrice !== undefined)) {
      const newQuantity = data.quantity !== undefined ? data.quantity : originalItem.quantity;
      const newUnitPrice = data.unitPrice !== undefined ? data.unitPrice : originalItem.unitPrice;
      data.totalValue = newQuantity * newUnitPrice;
    }

    // Update inventory item
    const updatedItem = await prisma.inventory.update({
      where: { id },
      data,
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

    return NextResponse.json({
      message: 'Inventory item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}