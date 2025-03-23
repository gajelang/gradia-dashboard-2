"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
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
import { Edit2, Loader2, Link as LinkIcon, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import { formatRupiah } from "@/lib/formatters";
import { fetchWithAuth } from "@/lib/api"; // Import the authentication utility

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  paymentProofLink?: string | null;
}

interface UpdateExpenseDialogProps {
  expense: Expense;
  onExpenseUpdated: (updatedExpense: Expense) => void;
}

export default function UpdateExpenseDialog({ expense, onExpenseUpdated }: UpdateExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: expense.category,
    amount: expense.amount.toString(),
    description: expense.description || "",
    date: new Date(expense.date).toISOString().split('T')[0],
    paymentProofLink: expense.paymentProofLink || "",
  });
  const [confirmText, setConfirmText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const expenseCategories: string[] = [
    "gaji",
    "bonus",
    "Pembelian",
    "lembur",
    "produksi",
  ];

  // Simple URL validator
  const isValidURL = (string: string) => {
    if (!string) return true; // Empty is valid (optional field)
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
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
    
    // Validate payment proof link format if provided
    if (formData.paymentProofLink && !isValidURL(formData.paymentProofLink)) {
      errors.paymentProofLink = "Please enter a valid URL";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear any error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value }));
    if (formErrors.category) {
      setFormErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.category;
        return newErrors;
      });
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
      const payload = {
        id: expense.id,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        date: new Date(formData.date).toISOString(),
        paymentProofLink: formData.paymentProofLink || null,
      };

      // Use fetchWithAuth instead of fetch
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
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error(`Error updating expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium">Category</label>
            <Select 
              value={formData.category} 
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className={formErrors.category ? "border-red-500" : ""}>
                <SelectValue placeholder="Select Expense Category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.category && <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>}
          </div>
          
          <div>
            <label className="text-sm font-medium">Amount</label>
            <Input
              name="amount"
              type="number"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Expense Amount"
              className={formErrors.amount ? "border-red-500" : ""}
            />
            {formErrors.amount && <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>}
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Description"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              className={formErrors.date ? "border-red-500" : ""}
            />
            {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
          </div>
          
          {/* Payment Proof Link Field */}
          <div>
            <div className="flex items-center">
              <LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Payment Proof Link (Optional)</label>
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
            <p className="text-xs text-muted-foreground">
              Add link to receipt or payment confirmation (Google Drive, Dropbox, etc.)
            </p>
          </div>
          
          <div className="mt-4">
            <p className="mb-2">Type "UPDATE" to confirm expense changes.</p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type UPDATE to confirm"
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={confirmUpdateExpense} disabled={confirmText !== "UPDATE" || isUpdating}>
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