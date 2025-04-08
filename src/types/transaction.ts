// src/app/types/transaction.ts

// Base interface with fields your app might send or receive.
// We make description/email optional so that code passing undefined won't break.
export interface TransactionData {
  createdBy: { id: string; name: string; email: string; };
  id: string;
  name: string;
  description?: string;       // <-- made optional
  amount: number;
  date: string;
  email?: string;             // <-- made optional
  status?: string;
  paymentStatus?: string;
  projectValue?: number;
  startDate?: string;
  endDate?: string;
  phone?: string;
  clientId?: string;
  vendorId?: string;
  picId?: string;
}

// Transaction interface that extends TransactionData but ensures
// certain fields (like paymentStatus, description, and email) are
// definitely strings in this final shape.
export interface Transaction {
  fundType(fundType: any): import("react").ReactNode;
  endDate: string | number | Date | null;
  startDate: string | number | Date | null;
  client: any;
  remainingAmount: number;
  isDeleted: boolean;
  projectValue: number;
  downPaymentAmount: number;
  id: string;
  name: string;
  description: string;    // definitely a string here
  amount: number;
  status: string;         // definitely a string
  email: string;          // definitely a string
  date: string;
  paymentStatus: string;  // definitely a string
}

// Helper function to safely convert from TransactionData --> Transaction
// providing fallback defaults for optional fields.
export function convertToTransaction(data: TransactionData): Transaction {
  return {
    id: data.id,
    name: data.name,
    amount: data.amount,
    // If description is missing, use empty string
    description: data.description ?? "",
    // If email is missing, use empty string
    email: data.email ?? "",
    date: data.date,
    // Fallback status is "Pending"
    status: data.status ?? "Pending",
    // Fallback paymentStatus is either paymentStatus, or status, or "Belum Bayar"
    paymentStatus: data.paymentStatus ?? data.status ?? "Belum Bayar",
    // Add missing properties required by Transaction interface
    fundType: () => null,
    endDate: null,
    startDate: null,
    client: null,
    remainingAmount: 0,
    isDeleted: false,
    projectValue: 0,
    downPaymentAmount: 0
  };
}