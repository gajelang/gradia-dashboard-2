// app/api/auth/login/route.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { generateToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    // Validate inputs
    if (!email || !password) {
      return new Response(JSON.stringify({ message: "Email and password are required" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
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
    
    // Generate token with the correct payload structure
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role || 'user'
    });
    
    return new Response(JSON.stringify({ 
      user: userResponse,
      token 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
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