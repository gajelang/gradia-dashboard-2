// src/app/api/subscriptions/softDelete/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth/auth";

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    // Find the subscription to ensure it exists
    const subscription = await prisma.inventory.findUnique({
      where: { 
        id,
        type: "SUBSCRIPTION"
      }
    });
    
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }
    
    // Check if the subscription is already deleted
    if (subscription.isDeleted) {
      return NextResponse.json({ error: "Subscription is already archived" }, { status: 400 });
    }

    // Soft delete the subscription
    const updatedSubscription = await prisma.inventory.update({
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
        deletedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      message: "Subscription archived successfully",
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error("Error archiving subscription:", error);
    return NextResponse.json({ error: "Failed to archive subscription" }, { status: 500 });
  }
}