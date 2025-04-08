"use client";

import { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar, LinkIcon, Loader2, Package2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api/api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import FundFields from "../TransactionForm/FundFields";

interface AddExpenseProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onExpenseAdded: () => void;
}

/**
 * Component for adding expenses to a transaction
 */
export default function AddExpense({
  isOpen,
  onClose,
  transaction,
  onExpenseAdded
}: AddExpenseProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    paymentProofLink: "",
    vendorId: "",
    fundType: "petty_cash"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Available expense categories
  const expenseCategories: string[] = [
    "Gaji",
    "Bonus",
    "Inventaris",
    "Operasional",
    "Lembur",
    "Biaya Produksi",
  ];
  
  // Fetch vendors when sheet opens
  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const res = await fetchWithAuth("/api/vendors", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const activeVendors = data.filter((vendor: any) => !vendor.isDeleted);
        setVendors(activeVendors);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoadingVendors(false);
    }
  };
  
  // Handle form field changes
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear any error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // Handle vendor selection
  const handleVendorChange = (value: string) => {
    setFormData(prev => ({ ...prev, vendorId: value === "none" ? "" : value }));
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate form
    const validationErrors: Record<string, string> = {};
    if (!formData.category) validationErrors.category = "Category is required";
    if (!formData.amount || parseFloat(formData.amount) <= 0) 
      validationErrors.amount = "Valid expense amount is required";
    if (!formData.date) validationErrors.date = "Date is required";
    if (!formData.fundType) validationErrors.fundType = "Fund source is required";
    if (formData.paymentProofLink && !isValidURL(formData.paymentProofLink)) 
      validationErrors.paymentProofLink = "Please enter a valid URL";
    
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    
    // Submit expense
    try {
      setIsSubmitting(true);
      
      const expenseData = {
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
        paymentProofLink: formData.paymentProofLink || null,
        transactionId: transaction.id,
        vendorId: formData.vendorId || null,
        fundType: formData.fundType
      };
      
      const res = await fetchWithAuth("/api/expenses", {
        method: "POST",
        body: JSON.stringify(expenseData),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add expense");
      }
      
      toast.success("Expense added successfully");
      onExpenseAdded();
      // Reset form
      setFormData({
        category: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        paymentProofLink: "",
        vendorId: "",
        fundType: "petty_cash"
      });
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Simple URL validator
  const isValidURL = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      if (open) {
        fetchVendors();
      } else {
        onClose();
      }
    }}>
      <SheetContent side="right" className="sm:max-w-md w-full">
        <SheetHeader>
          <SheetTitle>Add New Expense</SheetTitle>
          <SheetDescription>
            Add a new expense for this transaction.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => handleChange('category', value)}
            >
              <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>
          
          <div>
            <Label className="text-sm font-medium">Amount</Label>
            <Input
              type="number"
              min="0"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              placeholder="Expense Amount"
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>
          
          {/* Fund Fields */}
          <FundFields
            fundType={formData.fundType}
            onFundTypeChange={(value) => handleChange('fundType', value)}
            errors={errors}
            isExpense={true}
            previewAmount={parseFloat(formData.amount) || 0}
          />
          
          {/* Vendor Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium mb-1 flex items-center gap-1">
              <Package2 className="h-4 w-4" />
              Vendor/Subcontractor
            </Label>
            <Select
              value={formData.vendorId}
              onValueChange={handleVendorChange}
              disabled={loadingVendors}
            >
              <SelectTrigger>
                {loadingVendors ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>Loading vendors...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select vendor (optional)" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vendor</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name} - {vendor.serviceDesc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select a vendor that this expense is associated with
            </p>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Description"
              rows={3}
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-1 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Date
            </Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className={errors.date ? "border-red-500" : ""}
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>
          
          <div>
            <div className="flex items-center">
              <LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">
                Payment Proof Link (Optional)
              </Label>
            </div>
            <Input
              type="url"
              value={formData.paymentProofLink}
              onChange={(e) => handleChange('paymentProofLink', e.target.value)}
              placeholder="https://drive.google.com/file/your-receipt"
              className={errors.paymentProofLink ? "border-red-500" : ""}
            />
            {errors.paymentProofLink && (
              <p className="text-red-500 text-xs mt-1">{errors.paymentProofLink}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Add link to receipt or payment confirmation (Google Drive, Dropbox, etc.)
            </p>
          </div>
        </div>
        
        <SheetFooter className="sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Expense"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}