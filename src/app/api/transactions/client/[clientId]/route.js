// src/app/api/transactions/client/[clientId]/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";

const prisma = new PrismaClient();

// Helper function to create safe responses
const createSafeResponse = (data, status = 200) => {
  return NextResponse.json(data, { status });
};

// GET endpoint to fetch transactions by client ID
export async function GET(request, { params }) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    const { clientId } = params;
    
    if (!clientId) {
      return createSafeResponse({ error: "Client ID is required" }, 400);
    }

    // Fetch transactions for the client
    const transactions = await prisma.transaction.findMany({
      where: {
        clientId: clientId,
        isDeleted: false,
      },
      orderBy: {
        date: "desc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        projectValue: true,
        paymentStatus: true,
        date: true,
        startDate: true,
        endDate: true,
      },
    });

    return createSafeResponse(transactions);
  } catch (error) {
    console.error("Error fetching client transactions:", error);
    return createSafeResponse({ error: "Failed to fetch client transactions" }, 500);
  }
}
