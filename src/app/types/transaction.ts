// src/app/types/transaction.ts

// Base interface with all required properties
export interface TransactionData {
  id: string;
  name: string;
  description: string;
  amount: number;
  date: string;         // Required - was missing
  email: string;        // Required - was missing
  status?: string;      // Optional
  paymentStatus?: string; // Optional here
  projectValue?: number;
  startDate?: string;
  endDate?: string;
  phone?: string;
  clientId?: string;
  vendorId?: string;
  picId?: string;
}

// Transaction interface that extends TransactionData with required paymentStatus
export interface Transaction {
  id: string;
  name: string;
  description: string;
  amount: number;
  status: string;
  email: string;
  date: string;
  paymentStatus: string; // Required in this context
}

// Helper function to safely convert between types
export function convertToTransaction(data: TransactionData): Transaction {
  return {
    id: data.id,
    name: data.name,
    amount: data.amount,
    description: data.description || "",
    email: data.email,
    date: data.date,
    status: data.status || "Pending",
    paymentStatus: data.paymentStatus || data.status || "Belum Bayar"
  };
}