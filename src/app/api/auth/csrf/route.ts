// app/api/auth/csrf/route.ts
import { NextRequest } from "next/server";
import { verifyAuthToken, createSafeResponse } from "@/lib/auth/auth";
import { v4 as uuidv4 } from 'uuid';

// Add cache control to prevent excessive requests
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const { isAuthenticated, user } = await verifyAuthToken(req);

    if (!isAuthenticated || !user) {
      return createSafeResponse({ message: "Unauthorized" }, 401);
    }

    // Generate a new CSRF token
    const csrfToken = uuidv4();

    // In a production environment, you would store this token in a database or Redis
    // associated with the user's session

    // Add cache control headers to prevent excessive requests
    const response = createSafeResponse({
      csrfToken,
      message: "CSRF token generated successfully"
    });

    // Add cache control headers
    response.headers.set('Cache-Control', 'private, max-age=300'); // Cache for 5 minutes

    return response;
  } catch (error) {
    console.error("CSRF token generation error:", error);
    return createSafeResponse({
      message: "Failed to generate CSRF token",
      error: (error as Error).message
    }, 500);
  }
}
