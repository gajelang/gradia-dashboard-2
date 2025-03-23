import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";
import { createSafeResponse } from "@/lib/api";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    // Query invoices with related data
    const invoices = await prisma.invoice.findMany({
      include: {
        transaction: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        client: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return createSafeResponse(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return createSafeResponse({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.invoiceNumber || !data.date || !data.dueDate || !data.amount) {
      return createSafeResponse({ 
        error: 'Invoice number, date, due date, and amount are required' 
      }, 400);
    }

    // Check if invoice with this number already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: data.invoiceNumber }
    });

    if (existingInvoice) {
      return createSafeResponse({ 
        error: 'An invoice with this number already exists' 
      }, 400);
    }

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        date: new Date(data.date),
        dueDate: new Date(data.dueDate),
        amount: parseFloat(data.amount),
        tax: data.tax ? parseFloat(data.tax) : null,
        totalAmount: parseFloat(data.totalAmount),
        paymentStatus: data.paymentStatus || "Belum Bayar",
        description: data.description || null,
        transactionId: data.transactionId || null,
        clientId: data.clientId || null,
        createdById: authResult.user?.userId || null
      },
      include: {
        transaction: {
          select: {
            id: true,
            name: true
          }
        },
        client: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      }
    });

    return createSafeResponse({
      message: 'Invoice created successfully',
      invoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return createSafeResponse({ error: 'Internal server error' }, 500);
  }
}

export async function PATCH(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.id) {
      return createSafeResponse({ error: 'Invoice ID is required' }, 400);
    }

    // Find the invoice to ensure it exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.id }
    });

    if (!invoice) {
      return createSafeResponse({ error: 'Invoice not found' }, 404);
    }

    // Update the invoice
    const updateData = {
      updatedAt: new Date()
    };

    // Add optional fields if they exist
    if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);

    const updatedInvoice = await prisma.invoice.update({
      where: { id: data.id },
      data: updateData,
      include: {
        transaction: {
          select: {
            id: true,
            name: true
          }
        },
        client: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      }
    });

    return createSafeResponse({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return createSafeResponse({ error: 'Internal server error' }, 500);
  }
}