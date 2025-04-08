// app/api/auth/login/route.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { generateToken, setAuthCookie, createSafeResponse } from "@/lib/auth/auth";
import { v4 as uuidv4 } from 'uuid';
import { loginLimiter, applyRateLimit } from "@/lib/auth/rate-limiter";
import { validateRequest, handleValidationErrors, rules } from "@/lib/validation/input-validation";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(
      req,
      loginLimiter,
      'Too many login attempts. Please try again later.'
    );

    // If rate limit is exceeded, return the error response
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Validate request body
    const { data, errors } = await validateRequest(req, {
      email: [rules.required('Email is required'), rules.email()],
      password: [rules.required('Password is required')],
    });

    // Handle validation errors
    const validationResponse = handleValidationErrors(errors);
    if (validationResponse) {
      return validationResponse;
    }

    // Extract validated data
    const { email, password } = data;

    // Find user
    console.log(`Login attempt for email: ${email}`);
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true // Include related profile data if you have it
      }
    });

    if (!user) {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`Password validation result: ${isPasswordValid}`);

    if (!isPasswordValid) {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Format user object to match expected structure in AuthContext
    const userResponse = {
      userId: user.id, // Include both id fields as expected by your context
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role || 'user',
      // Include additional profile fields if available
      fullName: user.profile?.fullName || user.name || '',
      phoneNumber: user.profile?.phoneNumber || '',
      position: user.profile?.position || '',
      department: user.profile?.department || '',
      // Include any other fields from user or profile
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString()
    };

    // Generate CSRF token for protection against CSRF attacks
    const csrfToken = uuidv4();

    // Store CSRF token in user session (in a real app, this would be in a session store)
    // For now, we'll include it in the JWT payload
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role || 'user',
      csrfToken: csrfToken // Include CSRF token in the JWT
    });

    // Create response with user data and CSRF token (but not the JWT itself)
    const response = createSafeResponse({
      user: userResponse,
      csrfToken // Send CSRF token to client for inclusion in future requests
    });

    // Set HttpOnly cookie with the JWT
    return setAuthCookie(response, token);
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({
      message: "Login failed",
      error: (error as Error).message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
}