"use client";

import { useState, useEffect, useCallback } from "react";
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
import { 
  Loader2, 
  Save, 
  Plus, 
  X, 
  Link as LinkIcon, 
  Calendar, 
  ExternalLink
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatRupiah } from "@/lib/formatters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { fetchWithAuth } from "@/lib/api"; // Import fetchWithAuth for authenticated requests
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth to get current user

interface Expense {
  id?: string;
  category: string;
  amount: number | string;
  description: string | null;
  date: string;
  paymentProofLink?: string | null;
  transactionId?: string | null;
}

// Interface for Vendor
interface Vendor {
  isDeleted: boolean;
  id: string;
  name: string;
  serviceDesc: string;
  email?: string;
  phone?: string;
}

// Transaction interface
interface Transaction {
  id: string;
  name: string;
  description: string;
  projectValue?: number;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  date?: string;
  totalProfit?: number;
  downPaymentAmount?: number;
  remainingAmount?: number;
  clientId?: string;
  capitalCost?: number;
  isDeleted?: boolean;
}

interface UpdateTransactionDialogProps {
  transaction: Transaction;
  onTransactionUpdated: (updatedTransaction: Transaction) => void;
}

export default function UpdateTransactionDialog({ transaction, onTransactionUpdated }: UpdateTransactionDialogProps) {
  const { user } = useAuth(); // Get current user information
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: transaction.name || "",
    description: transaction.description || "",
    projectValue: transaction.projectValue?.toString() || "",
    email: transaction.email || "",
    phone: transaction.phone || "",
    startDate: transaction.startDate ? new Date(transaction.startDate).toISOString().split('T')[0] : "",
    endDate: transaction.endDate ? new Date(transaction.endDate).toISOString().split('T')[0] : "",
  });
  
  // Existing expenses
  const [existingExpenses, setExistingExpenses] = useState<Expense[]>([]);
  
  // New expenses to be added
  const [newExpenses, setNewExpenses] = useState<Array<{
    category: string;
    amount: string;
    description: string;
    date: string;
    paymentProofLink: string;
    vendorId: string;
    fundType: string;
  }>>([]);
  
  // Add expense sheet state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  
  // Vendors state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  
  const [activeTab, setActiveTab] = useState("details");
  const [confirmText, setConfirmText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [expenseErrors, setExpenseErrors] = useState<Record<string, string>>({});

  // New expense form
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    paymentProofLink: "",
    vendorId: "",
    fundType: "petty_cash", // Default to petty cash
  });

  // Available expense categories
  const expenseCategories: string[] = [
    "Gaji",
    "Bonus",
    "Inventaris",
    "Operasional",
    "Lembur",
    "Biaya Produksi",
  ];

  // Function to load transaction expenses
  const loadTransactionExpenses = useCallback(async () => {
    try {
      setIsLoadingExpenses(true);
      
      console.log(`Fetching expenses for transaction: ${transaction.id}`);
      
      const res = await fetchWithAuth(`/api/transactions/expenses?transactionId=${transaction.id}&includeArchived=false`, {
        cache: "no-store"
      });
      
      if (!res.ok) {
        console.error(`Error response from /api/transactions/expenses: ${res.status}`);
        throw new Error("Failed to fetch transaction expenses");
      }
      
      let data;
      try {
        data = await res.json();
      } catch (e) {
        console.error("Error parsing response:", e);
        throw new Error("Failed to parse expense data");
      }
      
      // Set only active expenses
      setExistingExpenses(data.activeExpenses || []);
      
    } catch (error) {
      console.error("Error loading transaction expenses:", error);
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [transaction.id]);

  // Fetch vendors for expense form
  const fetchVendors = useCallback(async () => {
    try {
      setLoadingVendors(true);
      const res = await fetchWithAuth("/api/vendors", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        // Only include active vendors
        const activeVendors = data.filter((vendor: Vendor) => !vendor.isDeleted);
        setVendors(activeVendors);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoadingVendors(false);
    }
  }, []);

  // Load existing expenses and vendors when dialog opens
  useEffect(() => {
    if (open) {
      loadTransactionExpenses();
      fetchVendors();
    } else {
      // Reset state when dialog closes
      setExistingExpenses([]);
      setNewExpenses([]);
      setConfirmText("");
      setActiveTab("details");
      setIsAddExpenseOpen(false);
    }
  }, [open, transaction.id, loadTransactionExpenses, fetchVendors]);

  // Reset new expense form
  const resetNewExpenseForm = () => {
    setNewExpense({
      category: "",
      amount: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      paymentProofLink: "",
      vendorId: "",
      fundType: "petty_cash",
    });
    setExpenseErrors({});
  };

  // Handle opening add expense panel
  const handleOpenAddExpense = () => {
    resetNewExpenseForm();
    setIsAddExpenseOpen(true);
  };

  // Handle vendor selection for expense
  const handleVendorChange = (value: string) => {
    setNewExpense(prev => ({ ...prev, vendorId: value === "none" ? "" : value }));
  };
  
  // Handle adding a new expense
  const handleAddExpense = () => {
    // Validate new expense form
    const errors: Record<string, string> = {};
    if (!newExpense.category) errors.category = "Category is required";
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) 
      errors.amount = "Valid expense amount is required";
    if (!newExpense.date) errors.date = "Date is required";
    if (newExpense.paymentProofLink && !isValidURL(newExpense.paymentProofLink)) 
      errors.paymentProofLink = "Please enter a valid URL";
    
    setExpenseErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    // Add the new expense to the list
    setNewExpenses([...newExpenses, { ...newExpense }]);
    
    // Close the add expense panel and reset form
    setIsAddExpenseOpen(false);
    resetNewExpenseForm();
    
    // Make sure we're on the expenses tab
    setActiveTab("expenses");
  };

  // Handle new expense form field changes
  const handleNewExpenseChange = (field: string, value: string) => {
    setNewExpense(prev => ({ ...prev, [field]: value }));
    
    // Clear any error for this field
    if (expenseErrors[field]) {
      setExpenseErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Simple URL validator
  const isValidURL = (string: string) => {
    if (!string) return true; // Empty is valid (optional field)
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  // Format date for display
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Validate transaction form
  const validateTransactionForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Transaction name is required";
    if (!formData.projectValue || parseFloat(formData.projectValue) <= 0) 
      errors.projectValue = "Valid project value is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear any error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const confirmUpdateTransaction = async () => {
    if (confirmText !== "UPDATE") {
      toast.error("Please type UPDATE to confirm");
      return;
    }
    
    if (!validateTransactionForm()) {
      toast.error("Please correct the errors in the form");
      setActiveTab("details");
      return;
    }
    
    setIsUpdating(true);
    try {
      const projectValue = parseFloat(formData.projectValue) || 0;
      
      // Process new expenses data
      const processedExpenses = newExpenses.map(exp => ({
        category: exp.category,
        amount: parseFloat(exp.amount),
        description: exp.description || null,
        date: new Date(exp.date).toISOString(),
        paymentProofLink: exp.paymentProofLink || null,
        // Link to transaction
        transactionId: transaction.id,
        // Include vendor if selected
        vendorId: exp.vendorId || null,
        // Include fund type
        fundType: exp.fundType || "petty_cash",
        // Add user tracking information
        createdById: user?.userId // Include the current user ID for tracking
      }));
      
      const payload = {
        id: transaction.id,
        name: formData.name,
        description: formData.description,
        projectValue: projectValue,
        totalProfit: projectValue, // Adjust profit calculation as needed
        email: formData.email,
        phone: formData.phone,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        expenses: processedExpenses, // Add expenses to the payload
        updatedById: user?.userId // Add who updated the transaction
      };

      console.log("Sending update to /api/transactions/update", payload);

      const res = await fetchWithAuth("/api/transactions/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        // If transactions/update endpoint fails, try the transactions endpoint
        console.log("Failed to use /api/transactions/update, trying fallback to /api/transactions");
        const fallbackRes = await fetchWithAuth("/api/transactions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (!fallbackRes.ok) {
          const errorData = await fallbackRes.json();
          throw new Error(errorData.message || "Failed to update transaction");
        }
        
        const updated = await fallbackRes.json();
        toast.success("Transaction updated successfully (fallback)");
        onTransactionUpdated(updated.transaction);
        setOpen(false);
        return;
      }
      
      const updated = await res.json();
      toast.success("Transaction updated successfully");
      onTransactionUpdated(updated.transaction);
      setOpen(false);
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error(`Error updating transaction: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Open dialog handler to reset form if needed
  const handleOpenDialog = () => {
    setOpen(true);
    // Reset form values to current transaction values
    setFormData({
      name: transaction.name || "",
      description: transaction.description || "",
      projectValue: transaction.projectValue?.toString() || "",
      email: transaction.email || "",
      phone: transaction.phone || "",
      startDate: transaction.startDate ? new Date(transaction.startDate).toISOString().split('T')[0] : "",
      endDate: transaction.endDate ? new Date(transaction.endDate).toISOString().split('T')[0] : "",
    });
  };

  // Calculate total expenses
  const totalExistingExpenses = existingExpenses.reduce((sum, exp) => 
    sum + (typeof exp.amount === 'number' ? exp.amount : parseFloat(String(exp.amount)) || 0), 0
  );
  
  const totalNewExpenses = newExpenses.reduce((sum, exp) => 
    sum + (parseFloat(exp.amount) || 0), 0
  );
  
  const totalExpenses = totalExistingExpenses + totalNewExpenses;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleOpenDialog}>Edit</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Update Transaction</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="details">Transaction Details</TabsTrigger>
              <TabsTrigger value="expenses">
                Project Expenses
                {totalExpenses > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                    Rp{formatRupiah(totalExpenses)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <div className="overflow-y-auto" style={{maxHeight: "calc(90vh - 200px)"}}>
              <TabsContent value="details" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Transaction Name</label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Transaction Name"
                      className={`mt-1 ${formErrors.name ? "border-red-500" : ""}`}
                    />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Description"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Project Value</label>
                    <Input
                      name="projectValue"
                      type="number"
                      min="0"
                      value={formData.projectValue}
                      onChange={handleChange}
                      placeholder="Project Value"
                      className={`mt-1 ${formErrors.projectValue ? "border-red-500" : ""}`}
                    />
                    {formErrors.projectValue && <p className="text-red-500 text-xs mt-1">{formErrors.projectValue}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Client Email"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Client Phone"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Start Date</label>
                      <Input
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleChange}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date</label>
                      <Input
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="expenses" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">Project Expenses</h3>
                      {totalExpenses > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Total Expenses: <span className="font-medium">Rp{formatRupiah(totalExpenses)}</span>
                        </p>
                      )}
                    </div>
                    <Button onClick={handleOpenAddExpense} size="sm" className="flex items-center gap-1">
                      <Plus className="h-4 w-4" /> Add Expense
                    </Button>
                  </div>
                  
                  {isLoadingExpenses ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : existingExpenses.length === 0 && newExpenses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No expenses added. Click &quot;Add Expense&quot; to add project expenses.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Existing Expenses (Read-only) */}
                      {existingExpenses.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-2">Existing Expenses</h4>
                          <div className="space-y-2">
                            {existingExpenses.map((expense, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                      {expense.category}
                                    </span>
                                    <span className="text-sm">
                                      <span className="font-medium">Rp{formatRupiah(Number(expense.amount))}</span>
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(expense.date)}
                                    {expense.description && (
                                      <span className="ml-1">- {expense.description}</span>
                                    )}
                                  </div>
                                </div>
                                {expense.paymentProofLink && (
                                  <a 
                                    href={expense.paymentProofLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center text-xs"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Proof
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* New Expenses (Can be removed) */}
                      {newExpenses.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">New Expenses</h4>
                          <div className="space-y-2">
                            {newExpenses.map((expense, index) => (
                              <div key={index} className="bg-green-50 border border-green-100 p-3 rounded-md flex justify-between items-center group">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                      {expense.category}
                                    </span>
                                    <span className="text-sm">
                                      <span className="font-medium">Rp{formatRupiah(parseFloat(expense.amount) || 0)}</span>
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(expense.date)}
                                    {expense.description && (
                                      <span className="ml-1">- {expense.description}</span>
                                    )}
                                    {expense.vendorId && (
                                      <span className="ml-2 text-blue-600">
                                        Vendor: {vendors.find(v => v.id === expense.vendorId)?.name || "Unknown"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {expense.paymentProofLink && (
                                    <a 
                                      href={expense.paymentProofLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex items-center text-xs"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Proof
                                    </a>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                                    onClick={() => {
                                      const newList = [...newExpenses];
                                      newList.splice(index, 1);
                                      setNewExpenses(newList);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <Separator className="my-4" />
          
          <div className="mt-4">
            <p className="mb-2">Type &quot;UPDATE&quot; to confirm changes.</p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type UPDATE to confirm"
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={confirmUpdateTransaction} disabled={confirmText !== "UPDATE" || isUpdating}>
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
        </DialogContent>
      </Dialog>
      
      {/* Add Expense Side Panel */}
      <Sheet open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full">
          <SheetHeader>
            <SheetTitle>Add New Expense</SheetTitle>
            <SheetDescription>
              Add a new expense for this transaction.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={newExpense.category} 
                onValueChange={(value) => handleNewExpenseChange('category', value)}
              >
                <SelectTrigger className={expenseErrors.category ? "border-red-500" : ""}>
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
              {expenseErrors.category && <p className="text-red-500 text-xs mt-1">{expenseErrors.category}</p>}
            </div>
            
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                min="0"
                value={newExpense.amount}
                onChange={(e) => handleNewExpenseChange('amount', e.target.value)}
                placeholder="Expense Amount"
                className={expenseErrors.amount ? "border-red-500" : ""}
              />
              {expenseErrors.amount && <p className="text-red-500 text-xs mt-1">{expenseErrors.amount}</p>}
            </div>
            
            {/* Vendor Selection - For expenses */}
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">Vendor/Subcontractor</label>
              <Select
                value={newExpense.vendorId} 
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
                  {vendors.map(vendor => (
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
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newExpense.description}
                onChange={(e) => handleNewExpenseChange('description', e.target.value)}
                placeholder="Description"
                rows={3}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={newExpense.date}
                onChange={(e) => handleNewExpenseChange('date', e.target.value)}
                className={expenseErrors.date ? "border-red-500" : ""}
              />
              {expenseErrors.date && <p className="text-red-500 text-xs mt-1">{expenseErrors.date}</p>}
            </div>
            
            <div>
              <div className="flex items-center">
                <LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Payment Proof Link (Optional)</label>
              </div>
              <Input
                type="url"
                value={newExpense.paymentProofLink}
                onChange={(e) => handleNewExpenseChange('paymentProofLink', e.target.value)}
                placeholder="https://drive.google.com/file/your-receipt"
                className={expenseErrors.paymentProofLink ? "border-red-500" : ""}
              />
              {expenseErrors.paymentProofLink && (
                <p className="text-red-500 text-xs mt-1">{expenseErrors.paymentProofLink}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Add link to receipt or payment confirmation (Google Drive, Dropbox, etc.)
              </p>
            </div>
            
            {/* Fund Type Selection */}
            <div>
              <label className="text-sm font-medium">Fund Source</label>
              <Select 
                value={newExpense.fundType || "petty_cash"} 
                onValueChange={(value) => handleNewExpenseChange('fundType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Fund Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  <SelectItem value="profit_bank">Profit Bank</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select which fund to use for this expense
              </p>
            </div>
          </div>
          
          <SheetFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsAddExpenseOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleAddExpense}
            >
              Add Expense
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}