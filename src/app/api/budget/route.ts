import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const budgetData = await prisma.budget.findMany();
    return NextResponse.json(budgetData);
  } catch (error) {
    console.error("Error fetching budget data:", error);
    return NextResponse.json({ message: "Failed to fetch data" }, { status: 500 });
  }
}