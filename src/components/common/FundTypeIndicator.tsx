"use client";

import { Wallet, CreditCard } from "lucide-react";

interface FundTypeIndicatorProps {
  fundType: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A reusable component for displaying fund type badges (Petty Cash or Profit Bank)
 */
export default function FundTypeIndicator({ 
  fundType, 
  size = 'md' 
}: FundTypeIndicatorProps) {
  // Determine size classes
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1"
  };
  
  const iconSizes = {
    sm: "h-2.5 w-2.5 mr-0.5",
    md: "h-3 w-3 mr-1",
    lg: "h-4 w-4 mr-1.5"
  };
  
  if (fundType === "petty_cash") {
    return (
      <span className={`inline-flex items-center bg-blue-50 text-blue-700 font-medium rounded-full ${sizeClasses[size]}`}>
        <Wallet className={iconSizes[size]} />
        Petty Cash
      </span>
    );
  } else {
    return (
      <span className={`inline-flex items-center bg-green-50 text-green-700 font-medium rounded-full ${sizeClasses[size]}`}>
        <CreditCard className={iconSizes[size]} />
        Profit Bank
      </span>
    );
  }
}