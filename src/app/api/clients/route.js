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

    // Check for query parameters
    const { searchParams } = new URL(request.url);
    const fetchDeleted = searchParams.get('deleted') === 'true';

    // Query for clients based on whether we want active or deleted ones
    const clients = await prisma.client.findMany({
      where: {
        isDeleted: fetchDeleted // true for deleted clients, false for active ones
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        deletedBy: fetchDeleted ? {
          select: {
            id: true,
            name: true,
            email: true
          }
        } : undefined
      },
      orderBy: {
        name: 'asc'
      }
    });

    return createSafeResponse(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
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
    if (!data.code || !data.name) {
      return createSafeResponse({ error: 'Client code and name are required' }, 400);
    }

    // Check if client with this code already exists
    const existingClient = await prisma.client.findUnique({
      where: { code: data.code }
    });

    if (existingClient) {
      return createSafeResponse({ error: 'A client with this code already exists' }, 400);
    }

    // Create the client
    const client = await prisma.client.create({
      data: {
        code: data.code,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        description: data.description || null,
        createdById: authResult.user?.userId || null
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return createSafeResponse(client);
  } catch (error) {
    console.error('Error creating client:', error);
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
    if (!data.id || !data.name) {
      return createSafeResponse({ error: 'Client ID and name are required' }, 400);
    }

    // Find the client to ensure it exists
    const client = await prisma.client.findUnique({
      where: { id: data.id }
    });

    if (!client) {
      return createSafeResponse({ error: 'Client not found' }, 404);
    }

    // Update the client
    const updatedClient = await prisma.client.update({
      where: { id: data.id },
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        description: data.description || null,
        updatedById: authResult.user?.userId || null,
        updatedAt: new Date()
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return createSafeResponse(updatedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    return createSafeResponse({ error: 'Internal server error' }, 500);
  }
}