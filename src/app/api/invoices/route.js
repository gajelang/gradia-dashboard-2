import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth/auth";
import { createSafeResponse } from "@/lib/api/api";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const invoiceId = searchParams.get('id');

    // Build where clause for the query
    const whereClause = {};

    // Filter by transactionId if provided
    if (transactionId) {
      whereClause.transactionId = transactionId;
    }

    // Filter by invoiceId if provided
    if (invoiceId) {
      whereClause.id = invoiceId;
    }

    // Query invoices with related data
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
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
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
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

// Add DELETE endpoint to handle invoice deletion
export async function DELETE(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createSafeResponse({ error: "Invoice ID is required" }, 400);
    }

    // Check if invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!invoice) {
      return createSafeResponse({ error: "Invoice not found" }, 404);
    }

    // Delete the invoice
    await prisma.invoice.delete({
      where: { id }
    });

    return createSafeResponse({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error('Error deleting invoice:', error);
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

    // Add all editable fields if they exist
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
    if (data.tax !== undefined) updateData.tax = parseFloat(data.tax);
    if (data.totalAmount !== undefined) updateData.totalAmount = parseFloat(data.totalAmount);
    if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.transactionId !== undefined) updateData.transactionId = data.transactionId;

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