import { PrismaClient } from "@prisma/client";
import { createSafeResponse } from "@/lib/api";
import { verifyAuthToken } from "@/lib/auth";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  // Verify auth token
  const { isAuthenticated, user } = await verifyAuthToken(req);
  
  if (!isAuthenticated || !user) {
    return createSafeResponse({ message: "Unauthorized" }, 401);
  }
  
  try {
    // Get fresh user data from database
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!userData) {
      return createSafeResponse({ message: "User not found" }, 404);
    }
    
    return createSafeResponse({ user: userData });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return createSafeResponse({ 
      message: "Failed to fetch user data", 
      error: (error as Error).message 
    }, 500);
  }
}