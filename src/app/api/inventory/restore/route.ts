// app/api/inventory/restore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return error since restore functionality has been disabled
    return NextResponse.json({ 
      error: 'Restore functionality has been disabled. Please contact an administrator for assistance.' 
    }, { status: 403 });
  } catch (error) {
    console.error('Error in restore endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}