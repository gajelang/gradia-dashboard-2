"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Loader2, Link as LinkIcon, Save, Wallet, CreditCard, DollarSign, ArrowDown } from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api";
import { formatRupiah } from "@/lib/formatters";

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  paymentProofLink?: string | null;
  fundType?: string;
}

interface UpdateExpenseDialogProps {
  expense: Expense;
  onExpenseUpdated: (updatedExpense: Expense) => void;
}

const expenseCategories: string[] = [
  "Gaji",
  "Bonus",
  "Inventaris",
  "Operasional",
  "Lembur",
  "Biaya Produksi",
];

// Simple URL validator
const isValidURL = (url: string) => {
  if (!url) return true; // optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function UpdateExpenseDialog({
  expense,
  onExpenseUpdated,
}: UpdateExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: expense.category,
    amount: expense.amount.toString(),
    description: expense.description || "",
    date: new Date(expense.date).toISOString().split("T")[0],
    paymentProofLink: expense.paymentProofLink || "",
    fundType: expense.fundType || "petty_cash", // Use existing fund type or default
  });
  
  // Fund balances state
  const [fundBalances, setFundBalances] = useState<{
    petty_cash: number;
    profit_bank: number;
  }>({
    petty_cash: 0,
    profit_bank: 0
  });
  const [loadingFundBalances, setLoadingFundBalances] = useState(false);
  
  const [confirmText, setConfirmText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch fund balances when dialog opens
  useEffect(() => {
    if (open) {
      fetchFundBalances();
    }
  }, [open]);

  // Fetch fund balances
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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.category) {
      errors.category = "Category is required";
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = "Valid expense amount is required";
    }
    if (!formData.date) {
      errors.date = "Date is required";
    }
    if (!formData.fundType) {
      errors.fundType = "Fund source is required";
    }
    if (formData.paymentProofLink && !isValidURL(formData.paymentProofLink)) {
      errors.paymentProofLink = "Please enter a valid URL";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }));
    if (formErrors.category) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.category;
        return newErrors;
      });
    }
  };

  const handleFundTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, fundType: value }));
    if (formErrors.fundType) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.fundType;
        return newErrors;
      });
    }
  };

  // Helper to get fund balance display with formatting
  const getFundBalanceDisplay = (fundType: string) => {
    const balance = fundType === "petty_cash" ? fundBalances.petty_cash : fundBalances.profit_bank;
    return `Rp${formatRupiah(balance)}`;
  };

  // Calculate fund change impact
  const calculateFundChangeImpact = () => {
    const originalFundType = expense.fundType || "petty_cash";
    const newFundType = formData.fundType;
    
    if (originalFundType === newFundType) return null;
    
    const amount = parseFloat(formData.amount);
    
    return {
      amount,
      from: originalFundType,
      to: newFundType
    };
  };

  const fundChangeImpact = calculateFundChangeImpact();

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

  const confirmUpdateExpense = async () => {
    if (confirmText !== "UPDATE") {
      toast.error("Please type UPDATE to confirm");
      return;
    }
    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }
    setIsUpdating(true);
    try {
      // Prepare payload for update expense.
      const payload = {
        id: expense.id,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        date: new Date(formData.date).toISOString(),
        paymentProofLink: formData.paymentProofLink || null,
        fundType: formData.fundType, // Include fundType in the payload
      };
      
      const res = await fetchWithAuth("/api/expenses/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update expense");
      }
      
      const updated = await res.json();
      toast.success("Expense updated successfully");
      onExpenseUpdated(updated.expense);
      setOpen(false);
      
      // Refresh fund balances after update
      fetchFundBalances();
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error(
        `Error updating expense: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Edit2 className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Expense</DialogTitle>
          <DialogDescription>
            Modify the expense details below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <Select value={formData.category} onValueChange={handleCategoryChange}>
              <SelectTrigger className={formErrors.category ? "border-red-500" : ""}>
                <SelectValue placeholder="Select Expense Category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.category && (
              <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium mb-1 block">Amount</label>
            <Input
              name="amount"
              type="number"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Expense Amount"
              required
              className={formErrors.amount ? "border-red-500" : ""}
            />
            {formErrors.amount && (
              <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium mb-1 block">Date</label>
            <Input
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              required
              className={formErrors.date ? "border-red-500" : ""}
            />
            {formErrors.date && (
              <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>
            )}
          </div>

          {/* Fund Source Selection */}
          <div className="space-y-2 p-4 border rounded-md bg-slate-50">
            <label className="text-sm font-medium mb-1 flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-red-600" />
              Fund Source
            </label>
            <Select
              value={formData.fundType}
              onValueChange={handleFundTypeChange}
            >
              <SelectTrigger className={formErrors.fundType ? "border-red-500" : ""}>
                <SelectValue placeholder="Select Fund Source" />
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
            {formErrors.fundType && (
              <p className="text-red-500 text-xs mt-1">{formErrors.fundType}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Select which fund this expense will be deducted from
            </p>
            
            {/* Current Fund and Impact of Changes */}
            {expense.fundType && (
              <div className="mt-2">
                <div className="text-sm mb-2">Current Fund:</div>
                <FundTypeIndicator fundType={expense.fundType} />
                
                {fundChangeImpact && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="text-sm font-medium text-amber-800 mb-1">Fund Change Impact:</div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FundTypeIndicator fundType={fundChangeImpact.from} />
                        <ArrowDown className="h-3 w-3 text-green-600" />
                        <span className="text-green-600 font-medium">+Rp{formatRupiah(fundChangeImpact.amount)}</span>
                        <span className="text-xs text-muted-foreground">(refund)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FundTypeIndicator fundType={fundChangeImpact.to} />
                        <ArrowDown className="h-3 w-3 text-red-600" />
                        <span className="text-red-600 font-medium">-Rp{formatRupiah(fundChangeImpact.amount)}</span>
                        <span className="text-xs text-muted-foreground">(new charge)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Proof Link */}
          <div>
            <div className="flex items-center">
              <LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">
                Payment Proof Link (Optional)
              </label>
            </div>
            <Input
              name="paymentProofLink"
              type="url"
              value={formData.paymentProofLink}
              onChange={handleChange}
              placeholder="https://drive.google.com/file/your-receipt"
              className={formErrors.paymentProofLink ? "border-red-500" : ""}
            />
            {formErrors.paymentProofLink && (
              <p className="text-red-500 text-xs mt-1">{formErrors.paymentProofLink}</p>
            )}
          </div>

          {/* Confirmation Input */}
          <div className="mt-4">
            <p className="mb-2">Type "UPDATE" to confirm expense changes.</p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "UPDATE" to confirm'
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUpdateExpense}
              disabled={confirmText !== "UPDATE" || isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}