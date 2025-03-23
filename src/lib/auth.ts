import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

// Generate JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '2h' } // Token expires after 2 hours
  );
}

// Verify JWT token and return user data
export function getUserFromToken(token: string): UserJwtPayload | null {
  try {
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET) as UserJwtPayload;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

// Middleware to verify auth token from request
export async function verifyAuthToken(req: NextRequest): Promise<AuthResult> {
  try {
    // Extract token from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { isAuthenticated: false, user: null };
    }
    
    const token = authHeader.split(" ")[1];
    const user = getUserFromToken(token);
    
    if (!user) {
      return { isAuthenticated: false, user: null };
    }
    
    return { isAuthenticated: true, user };
  } catch (error) {
    console.error("Auth middleware error:", error);
    return { isAuthenticated: false, user: null };
  }
}

// Helper function to check if a route is allowed
export function isRouteAllowed(user: UserJwtPayload | null): boolean {
  if (!user) return false;
  
  // Admin role has access to everything
  if (user.role === "admin") return true;
  
  // Add more specific permissions as needed
  // For example, regular users can only access certain routes
  
  return true; // By default, authenticated users have access
}

// For backward compatibility with any code using verifyAuth
export const verifyAuth = verifyAuthToken;