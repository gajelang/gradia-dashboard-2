// File: lib/auth.ts
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

// Get JWT secret from environment with better error handling
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error("WARNING: JWT_SECRET is not defined in production environment");
}
const SECRET_KEY = JWT_SECRET || "development-secret-key";

export interface UserJwtPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResult {
  isAuthenticated: boolean;
  user: UserJwtPayload | null;
}

export function generateToken(user: any): string {
  return jwt.sign(
    { 
      userId: user.id, // Ensure userId is included for compatibility
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role || 'user' 
    },
    process.env.JWT_SECRET || 'your-fallback-secret',
    { expiresIn: '24h' } 
  );
}

// Verify JWT token and return user data
export function getUserFromToken(token: string): UserJwtPayload | null {
  try {
    if (!token) return null;
    return jwt.verify(token, SECRET_KEY) as UserJwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log("Token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log("Invalid token");
    } else {
      console.error("Token verification error:", error);
    }
    return null;
  }
}

// Middleware to verify auth token from request
export async function verifyAuthToken(req: NextRequest): Promise<AuthResult> {
  try {
    // Extract token from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Also check for token in cookies as fallback
      const cookies = req.cookies;
      const tokenCookie = cookies.get("auth-token");
      
      if (!tokenCookie) {
        return { isAuthenticated: false, user: null };
      }
      
      const user = getUserFromToken(tokenCookie.value);
      return { isAuthenticated: !!user, user };
    }
    
    const token = authHeader.split(" ")[1];
    const user = getUserFromToken(token);
    
    return { isAuthenticated: !!user, user };
  } catch (error) {
    console.error("Auth middleware error:", error);
    return { isAuthenticated: false, user: null };
  }
}

// Function to check if a route is allowed
export function isRouteAllowed(user: UserJwtPayload | null, requiredRole?: string): boolean {
  if (!user) return false;
  
  // Admin role has access to everything
  if (user.role === "admin") return true;
  
  // If a specific role is required
  if (requiredRole && user.role !== requiredRole) return false;
  
  return true; // By default, authenticated users have access
}

// For backward compatibility with any code using verifyAuth
export const verifyAuth = verifyAuthToken;

// File: lib/api.ts
export function createSafeResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}