import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createSafeResponse } from "@/lib/api";
import { generateToken } from "@/lib/auth";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    // Validate inputs
    if (!email || !password) {
      return createSafeResponse({ message: "Email and password are required" }, 400);
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return createSafeResponse({ message: "Invalid credentials" }, 401);
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return createSafeResponse({ message: "Invalid credentials" }, 401);
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Remove the password using object destructuring
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: passwordField, ...userWithoutPassword } = user;
    
    return createSafeResponse({ 
      user: userWithoutPassword,
      token 
    });
  } catch (error) {
    console.error("Login error:", error);
    return createSafeResponse({ 
      message: "Login failed", 
      error: (error as Error).message 
    }, 500);
  }
}