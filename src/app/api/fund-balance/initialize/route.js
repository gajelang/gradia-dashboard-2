// src/app/api/fund-balance/initialize/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from "@/lib/auth/auth";

export async function GET(req) {
  // Verify auth token (optional, remove if causing issues during testing)
  const { isAuthenticated } = await verifyAuthToken(req);
  
  if (!isAuthenticated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Check if fund balances already exist
    const existingFunds = await prisma.fundBalance.findMany();
    
    // Create the records if they don't exist
    if (existingFunds.length === 0) {
      // Create both fund types
      await prisma.fundBalance.createMany({
        data: [
          { 
            fundType: 'petty_cash', 
            currentBalance: 0
          },
          { 
            fundType: 'profit_bank', 
            currentBalance: 0
          }
        ]
      });
      
      return NextResponse.json({ 
        message: "Fund balances initialized successfully",
        initialized: true 
      });
    }
    
    // Report on existing funds
    return NextResponse.json({
      message: "Fund balances already exist",
      initialized: false,
      existingFunds
    });
  } catch (error) {
    console.error("Error initializing fund balances:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}