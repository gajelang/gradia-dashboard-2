// src/lib/prisma-extensions.ts
import { PrismaClient } from '@prisma/client';

// Define model interfaces that match your schema
export interface FundBalance {
  id: string;
  fundType: string;
  currentBalance: number;
  lastReconciledBalance?: number | null;
  lastReconciledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FundTransaction {
  id: string;
  fundType: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  description?: string | null;
  sourceId?: string | null;
  sourceType?: string | null;
  referenceId?: string | null;
  createdById?: string | null;
  createdAt: Date;
}

// Define the extension of PrismaClient with your new models
export interface ExtendedPrismaClient extends PrismaClient {
  fundBalance: {
    findMany: (args?: any) => Promise<FundBalance[]>;
    findUnique: (args: { where: { fundType: string } }) => Promise<FundBalance | null>;
    create: (args: { data: any }) => Promise<FundBalance>;
    createMany: (args: { data: any[] }) => Promise<{ count: number }>;
    update: (args: { where: { fundType: string }; data: any }) => Promise<FundBalance>;
  };
  
  fundTransaction: {
    findMany: (args?: any) => Promise<FundTransaction[]>;
    count: (args?: any) => Promise<number>;
    create: (args: { data: any }) => Promise<FundTransaction>;
    update: (args: { where: { id: string }; data: any }) => Promise<FundTransaction>;
  };
}