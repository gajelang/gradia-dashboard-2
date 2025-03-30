// src/app/api/invoices/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Filter invoices by payment status if provided
    const whereClause: any = {};
    if (status) {
      // Map status query param to actual database value
      // In this case, "unpaid" in the query param maps to "Belum Bayar" in the database
      if (status === 'unpaid') {
        whereClause.paymentStatus = 'Belum Bayar';
      } else {
        whereClause.paymentStatus = status;
      }
    }

    // Find all invoices matching the criteria
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      orderBy: {
        dueDate: 'asc',
      },
    });

    // If no invoices found, return empty summary
    if (invoices.length === 0) {
      return NextResponse.json({
        totalValue: 0,
        count: 0,
        aging: {
          current: { value: 0, count: 0 },
          oneToThirty: { value: 0, count: 0 },
          thirtyOneToSixty: { value: 0, count: 0 },
          sixtyPlus: { value: 0, count: 0 },
        },
      });
    }

    // Calculate days overdue for each invoice
    const today = new Date();
    const invoicesWithAging = invoices.map(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...invoice,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
      };
    });

    // Group invoices by aging category
    const currentInvoices = invoicesWithAging.filter(inv => inv.daysOverdue === 0);
    const oneToThirtyInvoices = invoicesWithAging.filter(inv => inv.daysOverdue > 0 && inv.daysOverdue <= 30);
    const thirtyOneToSixtyInvoices = invoicesWithAging.filter(inv => inv.daysOverdue > 30 && inv.daysOverdue <= 60);
    const sixtyPlusInvoices = invoicesWithAging.filter(inv => inv.daysOverdue > 60);

    // Calculate totals for each category
    const currentValue = currentInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const oneToThirtyValue = oneToThirtyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const thirtyOneToSixtyValue = thirtyOneToSixtyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const sixtyPlusValue = sixtyPlusInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Calculate overall total
    const totalValue = currentValue + oneToThirtyValue + thirtyOneToSixtyValue + sixtyPlusValue;

    // Build response
    const summary = {
      totalValue,
      count: invoices.length,
      aging: {
        current: { value: currentValue, count: currentInvoices.length },
        oneToThirty: { value: oneToThirtyValue, count: oneToThirtyInvoices.length },
        thirtyOneToSixty: { value: thirtyOneToSixtyValue, count: thirtyOneToSixtyInvoices.length },
        sixtyPlus: { value: sixtyPlusValue, count: sixtyPlusInvoices.length },
      },
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching invoice summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}