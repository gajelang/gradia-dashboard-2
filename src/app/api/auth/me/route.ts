// File: app/api/auth/me/route.ts
import { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { isAuthenticated, user } = await verifyAuthToken(req);
  
  if (!isAuthenticated || !user) {
    return new Response(JSON.stringify({ 
      message: "Unauthorized" 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}