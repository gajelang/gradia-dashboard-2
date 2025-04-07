// app/api/auth/mfa/disable/route.ts
import { NextRequest } from "next/server";
import { verifyAuthToken, createSafeResponse } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { authenticator } from 'otplib';

const prisma = new PrismaClient();

// Disable MFA for a user
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { isAuthenticated, user } = await verifyAuthToken(req);
    
    if (!isAuthenticated || !user) {
      return createSafeResponse({ message: "Unauthorized" }, 401);
    }
    
    // Parse request body
    const { token } = await req.json();
    
    // Validate inputs
    if (!token) {
      return createSafeResponse({ message: "Token is required" }, 400);
    }
    
    // Get the user from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });
    
    if (!dbUser) {
      return createSafeResponse({ message: "User not found" }, 404);
    }
    
    // Parse metadata
    const metadata = dbUser.metadata ? JSON.parse(dbUser.metadata) : {};
    
    // Check if MFA is enabled
    if (!metadata.mfaEnabled || !metadata.mfaSecret) {
      return createSafeResponse({ message: "MFA not enabled for this user" }, 400);
    }
    
    const secret = metadata.mfaSecret;
    
    // Verify the token
    const isValid = authenticator.verify({ token, secret });
    
    if (!isValid) {
      return createSafeResponse({ message: "Invalid token" }, 400);
    }
    
    // Token is valid, disable MFA
    metadata.mfaEnabled = false;
    delete metadata.mfaSecret;
    
    // Update the user
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        metadata: JSON.stringify(metadata),
      },
    });
    
    return createSafeResponse({
      message: "MFA disabled successfully",
      mfaEnabled: false,
    });
  } catch (error) {
    console.error("MFA disable error:", error);
    return createSafeResponse({ 
      message: "Failed to disable MFA", 
      error: (error as Error).message 
    }, 500);
  }
}
