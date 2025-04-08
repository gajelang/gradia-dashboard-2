import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth/auth";
import { createSafeResponse } from "@/lib/api";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  // Verify auth token
  const { isAuthenticated } = await verifyAuthToken(req);
  
  if (!isAuthenticated) {
    return createSafeResponse({ error: "Unauthorized" }, 401);
  }
  
  try {
    // Get company finances
    const finance = await prisma.companyFinance.findFirst();
    
    if (!finance) {
      // Create initial finance record if none exists
      const newFinance = await prisma.companyFinance.create({
        data: { totalFunds: 0 }
      });
      
      return createSafeResponse(newFinance);
    }
    
    return createSafeResponse(finance);
  } catch (error) {
    console.error("GET finances error:", error);
    return createSafeResponse({ 
      error: "Failed to fetch finances", 
      details: String(error) 
    }, 500);
  }
}