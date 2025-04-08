"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, CreditCard, DollarSign } from "lucide-react";
import { fetchWithAuth } from "@/lib/api/api";
import { formatRupiah } from "@/lib/formatters/formatters";
import FundTypeIndicator from "@/components/common/FundTypeIndicator";

interface FundFieldsProps {
  fundType: string;
  onFundTypeChange: (value: string) => void;
  errors?: Record<string, string>;
  isExpense?: boolean;
  previewAmount?: number;
  originalFundType?: string;
}

/**
 * Reusable component for fund type selection with balance display
 */
export default function FundFields({
  fundType,
  onFundTypeChange,
  errors = {},
  isExpense = false,
  previewAmount = 0,
  originalFundType
}: FundFieldsProps) {
  const [fundBalances, setFundBalances] = useState<{
    petty_cash: number;
    profit_bank: number;
  }>({
    petty_cash: 0,
    profit_bank: 0
  });
  const [loadingFundBalances, setLoadingFundBalances] = useState(false);

  // Fetch fund balances on component mount
  useEffect(() => {
    fetchFundBalances();
  }, []);

  // Fetch fund balances from API
  const fetchFundBalances = async () => {
    try {
      setLoadingFundBalances(true);
      const res = await fetchWithAuth("/api/fund-balance", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const balances = {
          petty_cash: 0,
          profit_bank: 0
        };
        
        data.forEach((fund: any) => {
          if (fund.fundType === "petty_cash") {
            balances.petty_cash = fund.currentBalance;
          } else if (fund.fundType === "profit_bank") {
            balances.profit_bank = fund.currentBalance;
          }
        });
        
        setFundBalances(balances);
      }
    } catch (error) {
      console.error("Error fetching fund balances:", error);
    } finally {
      setLoadingFundBalances(false);
    }
  };

  // Helper to get fund balance display with formatting
  const getFundBalanceDisplay = (fundType: string) => {
    const balance = fundType === "petty_cash" ? fundBalances.petty_cash : fundBalances.profit_bank;
    return `Rp${formatRupiah(balance)}`;
  };

  return (
    <div className="mt-4 p-4 border rounded-md bg-slate-50">
      <h3 className="text-sm font-semibold mb-3 flex items-center">
        <DollarSign className={`h-4 w-4 mr-1 ${isExpense ? "text-red-600" : "text-blue-600"}`} />
        {isExpense ? "Fund Source" : "Fund Destination"}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 flex items-center gap-1">
            <Wallet className="h-4 w-4" />
            Select {isExpense ? "Fund Source" : "Fund Destination"}*
          </label>
          <Select
            value={fundType}
            onValueChange={onFundTypeChange}
          >
            <SelectTrigger className={errors.fundType ? "border-red-500" : ""}>
              <SelectValue placeholder={`Select ${isExpense ? "Fund Source" : "Fund Destination"}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="petty_cash" className="flex items-center">
                <div className="flex items-center">
                  <Wallet className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Petty Cash</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({loadingFundBalances ? "Loading..." : getFundBalanceDisplay("petty_cash")})
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="profit_bank" className="flex items-center">
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                  <span>Profit Bank</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({loadingFundBalances ? "Loading..." : getFundBalanceDisplay("profit_bank")})
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.fundType && (
            <p className="text-red-500 text-xs mt-1">{errors.fundType}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Select which fund this {isExpense ? "expense will be deducted from" : "income will be added to"}
          </p>
        </div>
        
        {/* Current Fund (for editing) */}
        {originalFundType && (
          <div>
            <div className="text-sm mb-2">Current Fund:</div>
            <FundTypeIndicator fundType={originalFundType} />
          </div>
        )}
        
        {/* Fund Impact Preview */}
        {previewAmount > 0 && (
          <div className="bg-white p-3 rounded border">
            <h4 className="text-sm font-medium mb-2">Fund Impact Preview</h4>
            <div className="flex items-center gap-2">
              <FundTypeIndicator fundType={fundType} size="sm" />
              <div className="flex items-center">
                {isExpense ? (
                  <span className="text-red-600 font-medium flex items-center">
                    <span className="transform rotate-45">↗</span>
                    -Rp{formatRupiah(previewAmount)}
                  </span>
                ) : (
                  <span className="text-green-600 font-medium flex items-center">
                    <span className="transform -rotate-45">↗</span>
                    +Rp{formatRupiah(previewAmount)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}