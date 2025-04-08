// app/api/auth/mfa/setup/route.ts
import { NextRequest } from "next/server";
import { verifyAuthToken, createSafeResponse } from "@/lib/auth/auth";
import { PrismaClient } from "@prisma/client";
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Generate a new MFA secret for a user
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { isAuthenticated, user } = await verifyAuthToken(req);

    if (!isAuthenticated || !user) {
      return createSafeResponse({ message: "Unauthorized" }, 401);
    }

    // Generate a new secret
    const secret = authenticator.generateSecret();

    // Create a unique identifier for this MFA setup
    const setupId = uuidv4();

    // Store the secret temporarily (in a real app, this would be in Redis with expiration)
    // For now, we'll store it in the user's metadata
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!dbUser) {
      return createSafeResponse({ message: "User not found" }, 404);
    }

    // Parse existing metadata or create new
    const metadata = dbUser.metadata ? JSON.parse(dbUser.metadata) : {};

    // Store the secret in metadata with the setup ID
    metadata.mfaSetup = {
      secret,
      setupId,
      createdAt: new Date().toISOString(),
    };

    // Update the user with the new metadata
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        metadata: JSON.stringify(metadata),
      },
    });

    // Generate the OTP auth URL
    const otpauth = authenticator.keyuri(
      user.email,
      'Gradia Dashboard',
      secret
    );

    return createSafeResponse({
      setupId,
      otpauth,
      message: "MFA setup initiated",
    });
  } catch (error) {
    console.error("MFA setup error:", error);
    return createSafeResponse({
      message: "Failed to setup MFA",
      error: (error as Error).message
    }, 500);
  }
}
