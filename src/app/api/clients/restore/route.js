import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";
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
      return createSafeResponse({ error: "Client ID is required" }, 400);
    }

    // Find the client to ensure it exists
    const client = await prisma.client.findUnique({
      where: { id }
    });
    
    if (!client) {
      return createSafeResponse({ error: "Client not found" }, 404);
    }

    // Check if already active
    if (!client.isDeleted) {
      return createSafeResponse({ error: "Client is already active" }, 400);
    }

    // Restore the client
    const updatedClient = await prisma.client.update({
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
      message: "Client restored successfully",
      client: updatedClient
    });
  } catch (error) {
    console.error("Error restoring client:", error);
    return createSafeResponse({ error: "Internal server error" }, 500);
  }
}