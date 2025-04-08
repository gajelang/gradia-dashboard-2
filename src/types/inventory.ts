// src/app/types/inventory.ts
// Add these extensions to your existing types file

export interface Vendor {
  id: string;
  name: string;
  serviceDesc: string;
  email?: string;
  phone?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
  paymentProofLink?: string;
  fundType?: string;
}

export type InventoryType = 'EQUIPMENT' | 'SUBSCRIPTION' | 'OTHER';
export type InventoryStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type PaymentStatus = 'LUNAS' | 'DP' | 'BELUM_BAYAR';
export type RecurringType = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | null;

// Extended Inventory interface with component-specific fields
export interface Inventory {
  id: string;
  name: string;
  type: InventoryType;
  description?: string;
  status: InventoryStatus;
  purchaseDate: string;
  expiryDate?: string;
  cost: number;
  currentValue?: number;
  paymentStatus: PaymentStatus;
  downPaymentAmount?: number;
  remainingAmount?: number;
  
  // Subscription fields
  isRecurring: boolean;
  recurringType?: RecurringType;
  nextBillingDate?: string;
  reminderDays?: number;
  
  // Relationships
  vendorId?: string;
  vendor?: Vendor;
  expenses?: Expense[];
  
  // Tracking information
  createdBy?: User;
  updatedBy?: User;
  deletedBy?: User;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  // Component-specific fields (added for compatibility)
  quantity?: number;
  unitPrice?: number;
  totalValue?: number;
  category?: string;
  location?: string;
  minimumStock?: number;
  supplier?: string; // In addition to vendorId/vendor
}

export interface InventoryFormData {
  name: string;
  type: InventoryType;
  description: string;
  status: InventoryStatus;
  purchaseDate: string;
  expiryDate?: string;
  cost: string;
  currentValue?: string;
  paymentStatus: PaymentStatus;
  downPaymentAmount?: string;
  remainingAmount?: string;
  vendorId?: string;
  
  // Subscription fields
  isRecurring: boolean;
  recurringType?: RecurringType;
  nextBillingDate?: string;
  reminderDays?: string;
}

export interface InventoryApiPayload extends Omit<InventoryFormData, 'cost' | 'currentValue' | 'downPaymentAmount' | 'remainingAmount' | 'reminderDays'> {
  cost: number;
  currentValue?: number;
  downPaymentAmount?: number;
  reminderDays?: number;
}