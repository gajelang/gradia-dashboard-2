// src/app/api/invoices/[id]/route.js
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";
import { createSafeResponse } from "@/lib/api";

const prisma = new PrismaClient();

// GET specific invoice by ID
export async function GET(request, context) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    // Get the id from context.params, not params directly
    const { id } = context.params;
    
    // Get the specific invoice with related data
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        transaction: {
          select: {
            id: true,
            name: true,
            description: true,
            projectValue: true,
            totalProfit: true,
            paymentStatus: true
          }
        },
        client: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            phone: true,
            address: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!invoice) {
      return createSafeResponse({ error: "Invoice not found" }, 404);
    }

    return createSafeResponse(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return createSafeResponse({ error: 'Internal server error' }, 500);
  }
}

// DELETE specific invoice
export async function DELETE(request, context) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ error: "Unauthorized" }, 401);
    }

    // Get the id from context.params, not params directly
    const { id } = context.params;
    
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