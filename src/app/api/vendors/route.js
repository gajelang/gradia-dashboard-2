import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth/auth";
import { createSafeResponse } from "@/lib/api";

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
    
    // Query for vendors based on whether we want active or deleted ones
    const vendors = await prisma.vendor.findMany({
      where: {
        isDeleted: fetchDeleted // true for deleted vendors, false for active ones
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

    return createSafeResponse(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
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
    if (!data.name || !data.serviceDesc) {
      return createSafeResponse({ error: 'Vendor name and service description are required' }, 400);
    }

    // Create the vendor
    const vendor = await prisma.vendor.create({
      data: {
        name: data.name,
        serviceDesc: data.serviceDesc,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
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

    return createSafeResponse(vendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
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
    if (!data.id || !data.name || !data.serviceDesc) {
      return createSafeResponse({ error: 'Vendor ID, name and service description are required' }, 400);
    }

    // Find the vendor to ensure it exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: data.id }
    });

    if (!vendor) {
      return createSafeResponse({ error: 'Vendor not found' }, 404);
    }

    // Update the vendor
    const updatedVendor = await prisma.vendor.update({
      where: { id: data.id },
      data: {
        name: data.name,
        serviceDesc: data.serviceDesc,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
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

    return createSafeResponse(updatedVendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    return createSafeResponse({ error: 'Internal server error' }, 500);
  }
}