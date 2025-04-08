import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth/auth";
import { createSafeResponse } from "@/lib/api";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    const { id, restoredById } = await request.json();
    
    if (!id) {
      return createSafeResponse({ error: "Vendor ID is required" }, 400);
    }

    // Find the vendor to ensure it exists
    const vendor = await prisma.vendor.findUnique({
      where: { id }
    });
    
    if (!vendor) {
      return createSafeResponse({ error: "Vendor not found" }, 404);
    }

    // Check if already active
    if (!vendor.isDeleted) {
      return createSafeResponse({ error: "Vendor is already active" }, 400);
    }

    // Restore the vendor
    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
        updatedAt: new Date(),
        updatedById: restoredById || authResult.user?.userId || null
      }
    });

    return createSafeResponse({ 
      message: "Vendor restored successfully",
      vendor: updatedVendor
    });
  } catch (error) {
    console.error("Error restoring vendor:", error);
    return createSafeResponse({ error: "Internal server error" }, 500);
  }
}