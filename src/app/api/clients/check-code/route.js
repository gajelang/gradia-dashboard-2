// src/app/api/clients/check-code/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";

const prisma = new PrismaClient();

// Helper function to create safe responses
const createSafeResponse = (data, status = 200) => {
  return NextResponse.json(data, { status });
};

// GET endpoint to check if a client code exists
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    // Get the code from query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    
    if (!code) {
      return createSafeResponse({ error: "Client code is required" }, 400);
    }

    // Check if the code exists
    const existingClient = await prisma.client.findUnique({
      where: { code },
      select: { id: true }
    });

    return createSafeResponse({ 
      exists: !!existingClient,
      message: existingClient ? "Kode klien sudah digunakan" : "Kode klien tersedia"
    });
  } catch (error) {
    console.error("Error checking client code:", error);
    return createSafeResponse({ error: "Failed to check client code" }, 500);
  }
}
