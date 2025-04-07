// File: lib/auth.ts
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

// Get JWT secret from environment with strict validation
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET is not defined in production environment");
  } else {
    console.error("WARNING: JWT_SECRET is not defined. Using a temporary secret for development only.");
  }
}

// In production, we require a proper secret. In development, we generate a random one per server start
const SECRET_KEY = JWT_SECRET || require('crypto').randomBytes(64).toString('hex');

// Store when the secret was generated (for development only)
const SECRET_GENERATED_AT = JWT_SECRET ? null : new Date();

export interface UserJwtPayload {
  jti?: string;       // JWT ID for token revocation
  userId: string;     // User ID
  id?: string;        // Legacy ID field for compatibility
  email: string;      // User email
  name: string;       // User name
  role: string;       // User role
  iat?: number;       // Issued at timestamp
  exp?: number;       // Expiration timestamp
  nbf?: number;       // Not before timestamp
  aud?: string;       // Audience
  iss?: string;       // Issuer
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
  // Generate a unique token ID for potential revocation
  const tokenId = require('crypto').randomBytes(16).toString('hex');

  return jwt.sign(
    {
      jti: tokenId, // JWT ID for token revocation
      userId: user.id, // Ensure userId is included for compatibility
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role || 'user',
      iat: Math.floor(Date.now() / 1000) // Issued at time
    },
    SECRET_KEY,
    {
      expiresIn: '12h', // Reduced from 24h for better security
      algorithm: 'HS256', // Explicitly set algorithm
      notBefore: 0, // Token is valid immediately
      audience: process.env.JWT_AUDIENCE || 'gradia-dashboard', // Intended audience
      issuer: process.env.JWT_ISSUER || 'gradia-api' // Token issuer
    }
  );
}

// Blacklist for revoked tokens (in-memory for now, should be moved to Redis/DB in production)
const REVOKED_TOKENS = new Set<string>();

// Function to revoke a token
export function revokeToken(token: string): void {
  try {
    // Extract the jti (JWT ID) from the token
    const decoded = jwt.decode(token) as UserJwtPayload;
    if (decoded && decoded.jti) {
      REVOKED_TOKENS.add(decoded.jti);
      console.log(`Token with jti ${decoded.jti} has been revoked`);
    }
  } catch (error) {
    console.error("Error revoking token:", error);
  }
}

// Verify JWT token and return user data with enhanced security
export function getUserFromToken(token: string): UserJwtPayload | null {
  try {
    if (!token) return null;

    // Verify the token with strict options
    const decoded = jwt.verify(token, SECRET_KEY, {
      algorithms: ['HS256'], // Only accept HS256 algorithm
      audience: process.env.JWT_AUDIENCE || 'gradia-dashboard',
      issuer: process.env.JWT_ISSUER || 'gradia-api',
    }) as unknown as UserJwtPayload;

    // Check if token has been revoked
    if (decoded.jti && REVOKED_TOKENS.has(decoded.jti)) {
      console.log(`Token with jti ${decoded.jti} has been revoked`);
      return null;
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log("Token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log("Invalid token");
    } else if (error instanceof jwt.NotBeforeError) {
      console.log("Token not yet valid");
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
      const tokenCookie = cookies.get(AUTH_COOKIE_NAME);

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

// Cookie management functions
export const AUTH_COOKIE_NAME = 'gradia_auth_token';

// Set auth cookie in response
export function setAuthCookie(response: Response, token: string): Response {
  // Calculate expiry date (12 hours from now)
  const expiryDate = new Date();
  expiryDate.setTime(expiryDate.getTime() + 12 * 60 * 60 * 1000);

  // Set secure flag based on environment
  const isSecure = process.env.NODE_ENV === 'production';

  // Set the cookie with HttpOnly and other security flags
  response.headers.append('Set-Cookie', `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Expires=${expiryDate.toUTCString()}`);

  return response;
}

// Clear auth cookie in response
export function clearAuthCookie(response: Response): Response {
  // Set the cookie with an expired date
  response.headers.append('Set-Cookie', `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);

  return response;
}

// For backward compatibility with any code using verifyAuth
export const verifyAuth = verifyAuthToken;

// Create a safe response with proper headers
export function createSafeResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}