// app/api/inventory/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

// Handler for getting inventory categories
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active inventory items with their categories
    const inventoryItems = await prisma.inventory.findMany({
      where: {
        isDeleted: false
      },
      select: {
        category: true
      }
    });

    // Extract and deduplicate categories
    const categories = [...new Set(
      inventoryItems
        .map((item: { category: any; }) => item.category)
        .filter((category: string | null) => category !== null && category !== '')
    )].sort();

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching inventory categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}