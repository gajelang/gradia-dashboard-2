// src/app/api/clients/search/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth/auth";

const prisma = new PrismaClient();

// Helper function to create safe responses
const createSafeResponse = (data, status = 200) => {
  return NextResponse.json(data, { status });
};

// GET endpoint to search for clients
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    // Get the search query from query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    
    // Search for clients
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } }
        ],
        isDeleted: false
      },
      orderBy: { name: "asc" },
      take: 10 // Limit results
    });

    return createSafeResponse({ clients });
  } catch (error) {
    console.error("Error searching clients:", error);
    return createSafeResponse({ error: "Failed to search clients" }, 500);
  }
}
