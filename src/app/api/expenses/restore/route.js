// file: app/api/expenses/restore/route.js
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";
import { createSafeResponse } from "@/lib/api";

const prisma = new PrismaClient();

export async function POST(request) {
  // Verify the auth token
  const { isAuthenticated, user } = await verifyAuthToken(request);
  
  if (!isAuthenticated) {
    return createSafeResponse({ message: "Unauthorized" }, 401);
  }
  
  try {
    // Return error since restore functionality has been disabled
    return createSafeResponse({ 
      message: "Restore functionality has been disabled. Please contact an administrator for assistance." 
    }, 403);
  } catch (error) {
    console.error("Error in expense restore endpoint:", error);
    return createSafeResponse({ 
      message: "Failed to process request", 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
}