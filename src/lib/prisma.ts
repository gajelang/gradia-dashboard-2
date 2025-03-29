import { PrismaClient } from '@prisma/client'
import { ExtendedPrismaClient } from './prisma-extensions'

// Define the global type that includes our extended client
const globalForPrisma = global as unknown as { 
  prisma: ExtendedPrismaClient 
}

// Create the PrismaClient instance or reuse it
export const prisma = globalForPrisma.prisma || 
  new PrismaClient({
    log: ['query'],
  }) as unknown as ExtendedPrismaClient

// Save to global in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma