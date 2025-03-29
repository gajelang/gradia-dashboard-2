// src/app/api/subscriptions/route.js

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(request) {
  try {
    // Verify JWT token
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (id) {
      // Get single subscription by ID
      const subscription = await prisma.inventory.findUnique({
        where: {
          id,
          type: "SUBSCRIPTION",
          isDeleted: false
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
      
      if (!subscription) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }
      
      return NextResponse.json(subscription);
    }
    
    // Get all subscriptions
    const subscriptions = await prisma.inventory.findMany({
      where: {
        type: "SUBSCRIPTION",
        isDeleted: false
      },
      orderBy: {
        createdAt: 'desc'
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
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Verify JWT token
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Format dates to ISO-8601 DateTime format
    const formattedPurchaseDate = formatDateToISODateTime(body.purchaseDate);
    const formattedNextBillingDate = body.nextBillingDate ? formatDateToISODateTime(body.nextBillingDate) : null;
    const formattedExpiryDate = body.expiryDate ? formatDateToISODateTime(body.expiryDate) : null;
    
    // Prepare data for creation
    const data = {
      name: body.name,
      type: "SUBSCRIPTION",
      description: body.description || null,
      status: body.status || "ACTIVE",
      purchaseDate: formattedPurchaseDate,
      expiryDate: formattedExpiryDate,
      expiryType: body.expiryType || "continuous",
      cost: parseFloat(body.cost),
      currentValue: parseFloat(body.cost),
      paymentStatus: body.paymentStatus || "BELUM_BAYAR",
      downPaymentAmount: body.downPaymentAmount ? parseFloat(body.downPaymentAmount) : null,
      isRecurring: body.isRecurring === undefined ? true : body.isRecurring,
      recurringType: body.recurringType || null,
      nextBillingDate: formattedNextBillingDate,
      reminderDays: body.reminderDays ? parseInt(body.reminderDays) : null,
      autoRenew: body.autoRenew === undefined ? true : body.autoRenew,
      category: body.category || "Langganan",
      quantity: 1,
      unitPrice: parseFloat(body.cost),
      totalValue: parseFloat(body.cost),
      location: body.location || null,
      minimumStock: 0,
      supplier: body.supplier || null,
      vendorId: body.vendorId || null,
      createdById: authResult.user?.userId || null
    };

    // Create subscription as inventory item
    const subscription = await prisma.inventory.create({
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
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json({ 
      message: "Subscription created successfully", 
      subscription 
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json({ error: `Error creating subscription: ${error.message}` }, { status: 500 });
  }
}

/**
 * Formats a date string to ISO-8601 DateTime format
 * @param {string} dateString - Date string in format "YYYY-MM-DD"
 * @returns {string} Date in ISO-8601 format
 */
function formatDateToISODateTime(dateString) {
  if (!dateString) return null;
  
  // If already in ISO format, return as is
  if (dateString.includes('T')) return dateString;
  
  // Add time component to make it a valid ISO DateTime
  // This sets the time to midnight UTC
  return `${dateString}T00:00:00.000Z`;
}

export async function PATCH(request) {
  try {
    // Verify JWT token
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }
    
    // Format dates to ISO-8601 DateTime format
    if (updateData.purchaseDate) {
      updateData.purchaseDate = formatDateToISODateTime(updateData.purchaseDate);
    }
    
    if (updateData.nextBillingDate) {
      updateData.nextBillingDate = formatDateToISODateTime(updateData.nextBillingDate);
    }
    
    if (updateData.expiryDate) {
      updateData.expiryDate = formatDateToISODateTime(updateData.expiryDate);
    }
    
    // Parse numeric values
    if (updateData.cost) {
      updateData.cost = parseFloat(updateData.cost);
      updateData.currentValue = parseFloat(updateData.cost);
      updateData.unitPrice = parseFloat(updateData.cost);
      updateData.totalValue = parseFloat(updateData.cost);
    }
    
    if (updateData.downPaymentAmount) {
      updateData.downPaymentAmount = parseFloat(updateData.downPaymentAmount);
    }
    
    if (updateData.reminderDays) {
      updateData.reminderDays = parseInt(updateData.reminderDays);
    }
    
    // Update the subscription
    const updatedSubscription = await prisma.inventory.update({
      where: { id },
      data: {
        ...updateData,
        updatedById: authResult.user?.userId || null
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            serviceDesc: true
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
      message: "Subscription updated successfully", 
      subscription: updatedSubscription 
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}