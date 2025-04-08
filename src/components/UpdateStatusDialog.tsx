"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Wallet, CreditCard } from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api/api"; // Import the authentication utility
import { formatRupiah } from "@/lib/formatters/formatters";
import { useAuth } from "@/contexts/AuthContext";

// Define a proper Transaction interface
interface Transaction {
  id: string;
  paymentStatus: string;
  downPaymentAmount?: number;
  totalProfit?: number;
  fundType?: string;
}

interface UpdateStatusDialogProps {
  transaction: Transaction;
  onStatusUpdated: (updatedTransaction: Transaction) => void;
}

// Define the payload interface for the update request
interface StatusUpdatePayload {
  id: string;
  paymentStatus: string;
  downPaymentAmount?: number;
  amount?: number;
  remainingAmount?: number;
  fundType?: string;
}

export default function UpdateStatusDialog({ transaction, onStatusUpdated }: UpdateStatusDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(transaction.paymentStatus);
  const [downPaymentAmount, setDownPaymentAmount] = useState(transaction.downPaymentAmount?.toString() || "");
  const [confirmText, setConfirmText] = useState("");
  const [fundType, setFundType] = useState(transaction.fundType || "petty_cash");
  const [fundBalances, setFundBalances] = useState<{
    petty_cash: number;
    profit_bank: number;
  }>({
    petty_cash: 0,
    profit_bank: 0
  });
  const [loadingFundBalances, setLoadingFundBalances] = useState(false);
  
  const paymentStatusOptions = ["Belum Bayar", "DP", "Lunas"];

  // Fetch fund balances when dialog opens
  useEffect(() => {
    if (open) {
      fetchFundBalances();
      setStatus(transaction.paymentStatus);
      setDownPaymentAmount(transaction.downPaymentAmount?.toString() || "");
      setFundType(transaction.fundType || "petty_cash");
      setConfirmText("");
    }
  }, [open, transaction]);

  // Helper to get fund balance display with formatting
  const getFundBalanceDisplay = (fundType: string) => {
    const balance = fundType === "petty_cash" ? fundBalances.petty_cash : fundBalances.profit_bank;
    return `Rp${formatRupiah(balance)}`;
  };

  // Fetch fund balances from the API
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

  // Handle fund type change
  const handleFundTypeChange = (value: string) => {
    setFundType(value);
  };

  // Calculate payment impact preview
  const calculatePaymentChange = () => {
    const totalProfit = transaction.totalProfit || 0;
    
    // For status change to "Lunas"
    if (status === "Lunas" && transaction.paymentStatus !== "Lunas") {
      if (transaction.paymentStatus === "DP") {
        // If changing from DP to Lunas, calculate remaining amount
        const dpAmount = transaction.downPaymentAmount || 0;
        return totalProfit - dpAmount;
      } else {
        // If changing from Belum Bayar to Lunas, it's the full amount
        return totalProfit;
      }
    }
    
    // For status change to "DP"
    if (status === "DP") {
      const dpAmount = parseFloat(downPaymentAmount) || 0;
      
      if (transaction.paymentStatus === "Belum Bayar") {
        // New DP payment
        return dpAmount;
      } else if (transaction.paymentStatus === "DP") {
        // DP amount adjustment
        const oldDpAmount = transaction.downPaymentAmount || 0;
        return dpAmount - oldDpAmount;
      } else if (transaction.paymentStatus === "Lunas") {
        // Going from Lunas to DP (unusual case)
        return dpAmount - totalProfit;
      }
    }
    
    // For status change to "Belum Bayar"
    if (status === "Belum Bayar") {
      if (transaction.paymentStatus === "DP") {
        // Reverting a DP payment
        return -(transaction.downPaymentAmount || 0);
      } else if (transaction.paymentStatus === "Lunas") {
        // Reverting a full payment
        return -totalProfit;
      }
    }
    
    return 0;
  };

  const confirmUpdateStatus = async () => {
    if (confirmText !== "UPDATE") {
      toast.error("Please type UPDATE to confirm");
      return;
    }

    // Build payload for update
    const payload: StatusUpdatePayload = {
      id: transaction.id,
      paymentStatus: status,
      fundType: fundType // Include fund type in the payload
    };

    if (status === "DP") {
      const dpAmount = parseFloat(downPaymentAmount);
      if (isNaN(dpAmount) || dpAmount <= 0) {
        toast.error("Down payment amount must be greater than 0");
        return;
      }
      payload.downPaymentAmount = dpAmount;
      const totalProfit = transaction.totalProfit || 0;
      if (payload.downPaymentAmount > totalProfit) {
        toast.error("Down payment cannot exceed total profit");
        return;
      }
      payload.amount = payload.downPaymentAmount;
      payload.remainingAmount = totalProfit - payload.downPaymentAmount;
    } else if (status === "Lunas") {
      payload.amount = transaction.totalProfit || 0;
      payload.remainingAmount = 0;
    } else {
      payload.amount = 0;
      payload.remainingAmount = transaction.totalProfit || 0;
    }

    try {
      // Use fetchWithAuth instead of fetch
      const res = await fetchWithAuth("/api/transactions/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update payment status");
      }
      
      const updated = await res.json();
      toast.success("Payment status updated successfully");
      onStatusUpdated(updated.transaction);
      setOpen(false);
      
      // Refresh fund balances after the update
      fetchFundBalances();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error(`Error updating payment status: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Function to render Fund Type Indicator Badge
  const FundTypeIndicator = ({ fundType }: { fundType: string }) => {
    if (fundType === "petty_cash") {
      return (
        <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
          <Wallet className="h-3 w-3 mr-1" />
          Petty Cash
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
          <CreditCard className="h-3 w-3 mr-1" />
          Profit Bank
        </span>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Update Status</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Payment Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select Payment Status" />
            </SelectTrigger>
            <SelectContent>
              {paymentStatusOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {status === "DP" && (
            <div>
              <label className="text-sm font-medium">Down Payment Amount</label>
              <Input
                type="number"
                min="0"
                value={downPaymentAmount}
                onChange={(e) => setDownPaymentAmount(e.target.value)}
                placeholder="Enter down payment amount"
                className="mt-1"
              />
            </div>
          )}
          
          {/* Fund Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Fund Destination</label>
            <p className="text-xs text-muted-foreground mb-2">
              Select which fund this payment will go to
            </p>
            <Select
              value={fundType}
              onValueChange={handleFundTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Fund Destination" />
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
          </div>
          
          {/* Fund Impact Preview */}
          {status !== transaction.paymentStatus && (
            <div className="p-3 rounded border bg-gray-50">
              <h4 className="text-sm font-medium mb-2">Payment Impact Preview</h4>
              <div className="flex items-center gap-2">
                <FundTypeIndicator fundType={fundType} />
                <div className="flex items-center">
                  {calculatePaymentChange() > 0 ? (
                    <>
                      <span className="text-sm font-medium text-green-600">
                        +Rp{formatRupiah(Math.abs(calculatePaymentChange()))}
                      </span>
                    </>
                  ) : calculatePaymentChange() < 0 ? (
                    <>
                      <span className="text-sm font-medium text-red-600">
                        -Rp{formatRupiah(Math.abs(calculatePaymentChange()))}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-gray-600">
                      No change
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <p className="mb-2">Type &quot;UPDATE&quot; to confirm changing payment status.</p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type UPDATE to confirm"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={confirmUpdateStatus} disabled={confirmText !== "UPDATE"}>
              <Save className="mr-2 h-4 w-4" />
              Update
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}