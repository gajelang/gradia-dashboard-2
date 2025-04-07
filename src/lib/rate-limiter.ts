// src/lib/rate-limiter.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { NextRequest, NextResponse } from 'next/server';
import { createSafeResponse } from './auth';

// Create different rate limiters for different purposes
// General API rate limiter - 100 requests per minute
export const apiLimiter = new RateLimiterMemory({
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
});

// Login rate limiter - 5 attempts per minute per IP
export const loginLimiter = new RateLimiterMemory({
  points: 5, // Number of points
  duration: 60, // Per 60 seconds
  blockDuration: 300, // Block for 5 minutes if exceeded
});

// Registration rate limiter - 3 attempts per hour per IP
export const registrationLimiter = new RateLimiterMemory({
  points: 3, // Number of points
  duration: 3600, // Per hour
  blockDuration: 3600, // Block for an hour if exceeded
});

// Middleware function to apply rate limiting
export async function applyRateLimit(
  req: NextRequest,
  limiter: RateLimiterMemory,
  errorMessage = 'Too many requests, please try again later.'
): Promise<NextResponse | null> {
  // Get IP address from request
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  try {
    // Consume points
    await limiter.consume(ip);
    return null; // No rate limit exceeded, continue
  } catch (error) {
    // Rate limit exceeded
    console.warn(`Rate limit exceeded for IP: ${ip}`);

    // Return error response
    return createSafeResponse(
      {
        error: errorMessage,
        retryAfter: Math.ceil((error as any).msBeforeNext / 1000) || 60
      },
      429, // Too Many Requests
    ) as NextResponse;
  }
}
