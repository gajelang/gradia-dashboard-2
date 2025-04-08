// File: app/api/auth/register/route.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { generateToken, setAuthCookie, createSafeResponse } from "@/lib/auth/auth";
import { v4 as uuidv4 } from 'uuid';
import { registrationLimiter, applyRateLimit } from "@/lib/auth/rate-limiter";
import { validateRequest, handleValidationErrors, rules } from "@/lib/validation/input-validation";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(
      req,
      registrationLimiter,
      'Too many registration attempts. Please try again later.'
    );

    // If rate limit is exceeded, return the error response
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Validate request body
    const { data, errors } = await validateRequest(req, {
      name: [rules.required('Name is required'), rules.minLength(2, 'Name must be at least 2 characters')],
      email: [rules.required('Email is required'), rules.email()],
      password: [rules.required('Password is required'), rules.password()],
    });

    // Handle validation errors
    const validationResponse = handleValidationErrors(errors);
    if (validationResponse) {
      return validationResponse;
    }

    // Extract validated data
    const { name, email, password } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return new Response(JSON.stringify({
        message: "User with this email already exists"
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'user' // Default role
      }
    });

    // Generate CSRF token for protection against CSRF attacks
    const csrfToken = uuidv4();

    // Generate JWT token with CSRF token included
    const userForToken = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      csrfToken: csrfToken // Include CSRF token in the JWT
    };

    const token = generateToken(userForToken);

    // Remove the password
    const { password: _, ...userWithoutPassword } = user;

    // Create response with user data and CSRF token (but not the JWT itself)
    const response = createSafeResponse({
      user: userWithoutPassword,
      csrfToken // Send CSRF token to client for inclusion in future requests
    }, 201);

    // Set HttpOnly cookie with the JWT
    return setAuthCookie(response, token);
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(JSON.stringify({
      message: "Registration failed",
      error: (error as Error).message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
}