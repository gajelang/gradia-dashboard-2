// app/api/auth/mfa/verify/route.ts
import { NextRequest } from "next/server";
import { verifyAuthToken, createSafeResponse } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { authenticator } from 'otplib';

const prisma = new PrismaClient();

// Verify a MFA token
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { isAuthenticated, user } = await verifyAuthToken(req);
    
    if (!isAuthenticated || !user) {
      return createSafeResponse({ message: "Unauthorized" }, 401);
    }
    
    // Parse request body
    const { token, setupId } = await req.json();
    
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
    
    // Check if we're in setup mode or verification mode
    if (setupId) {
      // Setup mode - verify the token against the temporary secret
      if (!metadata.mfaSetup || metadata.mfaSetup.setupId !== setupId) {
        return createSafeResponse({ message: "Invalid setup ID" }, 400);
      }
      
      const secret = metadata.mfaSetup.secret;
      
      // Verify the token
      const isValid = authenticator.verify({ token, secret });
      
      if (!isValid) {
        return createSafeResponse({ message: "Invalid token" }, 400);
      }
      
      // Token is valid, save the secret as the user's MFA secret
      metadata.mfaEnabled = true;
      metadata.mfaSecret = secret;
      delete metadata.mfaSetup; // Remove the temporary setup data
      
      // Update the user
      await prisma.user.update({
        where: { id: user.userId },
        data: {
          metadata: JSON.stringify(metadata),
        },
      });
      
      return createSafeResponse({
        message: "MFA setup completed successfully",
        mfaEnabled: true,
      });
    } else {
      // Verification mode - verify the token against the user's MFA secret
      if (!metadata.mfaEnabled || !metadata.mfaSecret) {
        return createSafeResponse({ message: "MFA not enabled for this user" }, 400);
      }
      
      const secret = metadata.mfaSecret;
      
      // Verify the token
      const isValid = authenticator.verify({ token, secret });
      
      if (!isValid) {
        return createSafeResponse({ message: "Invalid token" }, 400);
      }
      
      return createSafeResponse({
        message: "MFA verification successful",
        verified: true,
      });
    }
  } catch (error) {
    console.error("MFA verification error:", error);
    return createSafeResponse({ 
      message: "Failed to verify MFA token", 
      error: (error as Error).message 
    }, 500);
  }
}
