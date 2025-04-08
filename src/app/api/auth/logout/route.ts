// app/api/auth/logout/route.ts
import { NextRequest } from "next/server";
import { clearAuthCookie, verifyAuthToken, revokeToken } from "@/lib/auth/auth";

export async function POST(req: NextRequest) {
  try {
    // Get the token from the request
    const authHeader = req.headers.get("authorization");
    const cookies = req.cookies;
    const tokenCookie = cookies.get("gradia_auth_token");

    let token = null;

    // Extract token from authorization header or cookie
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (tokenCookie) {
      token = tokenCookie.value;
    }

    // If we have a token, revoke it
    if (token) {
      revokeToken(token);
    }

    // Create response
    const response = new Response(JSON.stringify({
      message: "Logged out successfully"
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // Clear the auth cookie
    return clearAuthCookie(response);
  } catch (error) {
    console.error("Logout error:", error);

    // Create error response
    const response = new Response(JSON.stringify({
      message: "Logout failed",
      error: (error as Error).message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });

    // Still clear the cookie even if there was an error
    return clearAuthCookie(response);
  }
}
