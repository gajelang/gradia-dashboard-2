// File: app/api/auth/register/route.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { generateToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    
    // Validate inputs
    if (!name || !email || !password) {
      return new Response(JSON.stringify({ 
        message: "Name, email and password are required" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
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
    
    // Generate JWT token
    const userForToken = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user'
    };
    
    const token = generateToken(userForToken);
    
    // Remove the password
    const { password: _, ...userWithoutPassword } = user;
    
    return new Response(JSON.stringify({ 
      user: userWithoutPassword,
      token 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
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