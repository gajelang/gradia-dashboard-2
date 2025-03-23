import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createSafeResponse } from "@/lib/api";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    
    // Extract required fields
    const { 
      name, 
      email, 
      password,
      // Extract additional fields without using them directly in Prisma
      fullName,
      phoneNumber,
      position,
      department,
      address,
      bio,
      skills,
      experience,
      role = 'guest', // Default role
    } = body;
    
    // Validate required inputs
    if (!name || !email || !password) {
      return createSafeResponse({ message: "All fields are required" }, 400);
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return createSafeResponse({ message: "User already exists" }, 400);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with only the fields that exist in your schema
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "guest", // Default role
        // Remove metadata field from here
      },
    });
    
    // Don't return the password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: passwordField, ...userWithoutPassword } = user;
    
    // Store additional data somewhere else if needed
    // For now we'll just log it
    console.log("Additional user data:", {
      fullName: fullName || name,
      phoneNumber,
      position,
      department,
      address,
      bio,
      skills,
      experience,
      preferredRole: role
    });
    
    return createSafeResponse({ 
      message: "Registration successful", 
      user: userWithoutPassword 
    }, 201);
  } catch (error) {
    console.error("Registration error:", error);
    return createSafeResponse({ 
      message: "Registration failed", 
      error: (error as Error).message 
    }, 500);
  }
}