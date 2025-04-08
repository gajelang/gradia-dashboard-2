import { NextRequest } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth/auth";
import { createSafeResponse } from "@/lib/api";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isAuthenticated) {
      return createSafeResponse({ message: "Unauthorized" }, 401);
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    
    // Construct the where clause based on parameters
    const whereClause: Prisma.UserWhereInput = {};
    
    // Filter by role if provided
    if (role) {
      // Handle multiple roles (comma-separated)
      if (role.includes(',')) {
        const roles = role.split(',');
        whereClause.role = { in: roles };
      } else if (role === 'pic') {
        // Special case: "pic" role should include users with role "pic", "admin", or "staff"
        whereClause.role = { in: ['pic', 'admin', 'staff'] };
      } else {
        whereClause.role = role;
      }
    }

    // Query for users based on the constructed where clause
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return createSafeResponse(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return createSafeResponse({ error: 'Internal server error' }, 500);
  }
}