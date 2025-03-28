// Enhanced AddTransactionModal.tsx with subscription support
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Link as LinkIcon,
  UserPlus,
  User,
  Plus,
  Calendar,
  RepeatIcon,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatRupiah } from "@/lib/formatters";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { TransactionData } from "@/app/types/transaction";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Extended interfaces
type TransactionType = "transaction" | "expense";

// Interface for Subscription
interface Subscription {
  id: string;
  name: string;
  description: string;
  cost: number;
  recurringType: string; // "MONTHLY", "QUARTERLY", "ANNUALLY"
  nextBillingDate: string;
  isRecurring: boolean;
  paymentStatus: string;
}

// Extended form data interface
interface FormData {
  name: string;
  projectValue: string;
  email: string;
  phone: string;
  description: string;
  date: string;
  category: string;
  amount: string;
  paymentStatus: string;
  downPaymentAmount: string;
  startDate: string;
  endDate: string;
  paymentProofLink: string;
  clientId: string;
  vendorId: string;
  picId: string;
  transactionId: string;
  fundType: string;
  // New subscription fields
  subscriptionId: string;
  isRecurringExpense: boolean;
  recurringFrequency: string;
  nextBillingDate: string;
}

interface AddTransactionModalProps {
  onTransactionAdded: (transaction: TransactionData) => void;
}

// Updated component with subscription support
export default function AddTransactionModal({ onTransactionAdded }: AddTransactionModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [transactionType, setTransactionType] = useState<TransactionType>("transaction");
  
  // Enhanced form data with subscription fields
  const [formData, setFormData] = useState<FormData>({
    name: "",
    projectValue: "",
    email: "",
    phone: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
    amount: "",
    paymentStatus: "Belum Bayar",
    downPaymentAmount: "",
    startDate: "",
    endDate: "",
    paymentProofLink: "",
    clientId: "",
    vendorId: "",
    picId: "",
    transactionId: "",
    fundType: "petty_cash",
    // New subscription fields
    subscriptionId: "",
    isRecurringExpense: false,
    recurringFrequency: "MONTHLY",
    nextBillingDate: "",
  });
  
  // Other state variables
  const [profit, setProfit] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPaymentProofField, setShowPaymentProofField] = useState(true);
  
  // New state for subscriptions
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  
  // Existing state for clients, vendors, PICs, and transactions
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [pics, setPics] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingPics, setLoadingPics] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // State for new client creation
  const [isNewClientSheetOpen, setIsNewClientSheetOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    description: "",
  });

  const expenseCategories: string[] = [
    "Gaji",
    "Bonus",
    "Inventaris",
    "Operasional",
    "Lembur",
    "Biaya Produksi",
    "Subscription",
  ];

  const paymentStatusOptions: string[] = ["Belum Bayar", "DP", "Lunas"];
  const recurringFrequencyOptions: string[] = ["MONTHLY", "QUARTERLY", "ANNUALLY"];

  // Calculate profit and remaining amount
  useEffect(() => {
    const pv = parseFloat(formData.projectValue) || 0;
    const dpAmount = parseFloat(formData.downPaymentAmount) || 0;
    const calculatedProfit = pv;
    setProfit(calculatedProfit);
    if (formData.paymentStatus === "DP") {
      setRemainingAmount(calculatedProfit - dpAmount);
    } else {
      setRemainingAmount(0);
    }
  }, [formData.projectValue, formData.downPaymentAmount, formData.paymentStatus]);

  // Set up required fields
  useEffect(() => {
    const checkDatabaseSchema = async () => {
      try {
        const res = await fetchWithAuth("/api/expenses", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.length === 0 || data.some((exp: Record<string, unknown>) => "paymentProofLink" in exp)) {
            setShowPaymentProofField(true);
          } else {
            console.log("paymentProofLink field not found in expenses, hiding field");
            setShowPaymentProofField(false);
          }
        }
      } catch (error) {
        console.error("Error checking schema:", error);
        setShowPaymentProofField(false);
      }
    };
    checkDatabaseSchema();
  }, []);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchVendors();
      fetchPics();
      if (transactionType === "expense") {
        fetchTransactions();
        // Fetch subscriptions for expense type
        fetchSubscriptions();
      }
    }
  }, [isOpen, transactionType]);

  // Update form when subscription is selected
  useEffect(() => {
    if (selectedSubscription) {
      setFormData(prev => ({
        ...prev,
        category: "Subscription",
        description: `Payment for subscription: ${selectedSubscription.name}`,
        amount: selectedSubscription.cost.toString(),
        nextBillingDate: selectedSubscription.nextBillingDate,
      }));
    }
  }, [selectedSubscription]);

  // Fetch clients
  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const res = await fetchWithAuth("/api/clients", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const activeClients = data.filter((client: any) => !client.isDeleted);
        setClients(activeClients);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Fetch vendors
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

  // Fetch PICs
  const fetchPics = async () => {
    try {
      setLoadingPics(true);
      const res = await fetchWithAuth("/api/users?role=pic", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        console.log("PIC users fetched:", data);
        setPics(data);
      } else {
        console.error("Error fetching PICs: Server returned", res.status);
        setPics([]);
        toast.error("Failed to load PIC options");
      }
    } catch (error) {
      console.error("Error fetching PICs:", error);
      setPics([]);
      toast.error("Failed to load PIC options");
    } finally {
      setLoadingPics(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const res = await fetchWithAuth("/api/transactions", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const activeTransactions = data.filter((tx: any) => !tx.isDeleted);
        setTransactions(activeTransactions);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // NEW: Fetch subscriptions
  const fetchSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const res = await fetchWithAuth("/api/inventory?type=SUBSCRIPTION", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        // Filter for active subscriptions
        const activeSubscriptions = data.filter((item: any) => 
          !item.isDeleted && 
          item.type === "SUBSCRIPTION" && 
          (item.paymentStatus === "BELUM_BAYAR" || item.paymentStatus === "DP")
        );
        
        // Map to subscription interface
        const formattedSubscriptions = activeSubscriptions.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          cost: parseFloat(item.cost) || 0,
          recurringType: item.recurringType || "MONTHLY",
          nextBillingDate: item.nextBillingDate ? new Date(item.nextBillingDate).toISOString().split("T")[0] : "",
          isRecurring: item.isRecurring || false,
          paymentStatus: item.paymentStatus
        }));
        
        setSubscriptions(formattedSubscriptions);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      projectValue: "",
      email: "",
      phone: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      category: "",
      amount: "",
      paymentStatus: "Belum Bayar",
      downPaymentAmount: "",
      startDate: "",
      endDate: "",
      paymentProofLink: "",
      clientId: "",
      vendorId: "",
      picId: "",
      transactionId: "",
      fundType: "petty_cash",
      // Reset subscription fields
      subscriptionId: "",
      isRecurringExpense: false,
      recurringFrequency: "MONTHLY",
      nextBillingDate: "",
    });
    setProfit(0);
    setRemainingAmount(0);
    setFormErrors({});
    setSelectedSubscription(null);
    setShowSubscriptionDetails(false);
  };

  // Reset new client form
  const resetNewClientForm = () => {
    setNewClientData({
      code: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      description: "",
    });
  };

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  // Handle payment status change
  const handlePaymentStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, paymentStatus: value }));
    if (value !== "DP") {
      setFormData((prev) => ({ ...prev, downPaymentAmount: "" }));
    }
  };

  // Handle client change
  const handleClientChange = (value: string) => {
    setFormData((prev) => ({ ...prev, clientId: value === "none" ? "" : value }));
    if (value && value !== "none") {
      const selectedClient = clients.find((client) => client.id === value);
      if (selectedClient) {
        setFormData((prev) => ({
          ...prev,
          name: selectedClient.name,
          email: selectedClient.email || prev.email,
          phone: selectedClient.phone || prev.phone,
        }));
      }
    }
  };

  // Handle vendor change
  const handleVendorChange = (value: string) => {
    setFormData((prev) => ({ ...prev, vendorId: value === "none" ? "" : value }));
  };

  // Handle PIC change
  const handlePicChange = (value: string) => {
    setFormData((prev) => ({ ...prev, picId: value === "none" ? "" : value }));
  };

  // Handle transaction change
  const handleTransactionChange = (value: string) => {
    setFormData((prev) => ({ ...prev, transactionId: value === "none" ? "" : value }));
  };

  // Handle category change
  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }));
    
    // Reset subscription fields if not subscription category
    if (value !== "Subscription") {
      setFormData(prev => ({
        ...prev,
        subscriptionId: "",
        isRecurringExpense: false
      }));
      setSelectedSubscription(null);
      setShowSubscriptionDetails(false);
    }
    
    if (formErrors.category) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.category;
        return newErrors;
      });
    }
  };

  // NEW: Handle subscription selection
  const handleSubscriptionChange = (value: string) => {
    if (value === "none") {
      setFormData(prev => ({ ...prev, subscriptionId: "" }));
      setSelectedSubscription(null);
      setShowSubscriptionDetails(false);
      return;
    }
    
    const subscription = subscriptions.find(sub => sub.id === value);
    if (subscription) {
      setSelectedSubscription(subscription);
      setFormData(prev => ({ 
        ...prev, 
        subscriptionId: value,
        amount: subscription.cost.toString(),
        description: `Payment for subscription: ${subscription.name}`,
        nextBillingDate: subscription.nextBillingDate || "",
        recurringFrequency: subscription.recurringType || "MONTHLY"
      }));
      setShowSubscriptionDetails(true);
    }
  };

  // NEW: Handle recurring expense checkbox
  const handleRecurringExpenseChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isRecurringExpense: checked }));
  };

  // NEW: Handle recurring frequency change
  const handleRecurringFrequencyChange = (value: string) => {
    setFormData(prev => ({ ...prev, recurringFrequency: value }));
    
    // Update next billing date based on frequency
    if (selectedSubscription) {
      const currentDate = new Date();
      let nextDate = new Date(currentDate);
      
      switch(value) {
        case "MONTHLY":
          nextDate.setMonth(currentDate.getMonth() + 1);
          break;
        case "QUARTERLY":
          nextDate.setMonth(currentDate.getMonth() + 3);
          break;
        case "ANNUALLY":
          nextDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
      
      setFormData(prev => ({ 
        ...prev, 
        nextBillingDate: nextDate.toISOString().split("T")[0]
      }));
    }
  };

  // Handle new client change
  const handleNewClientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewClientData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle client creation
  const handleCreateClient = async () => {
    if (!newClientData.code || !newClientData.name) {
      toast.error("Client code and name are required");
      return;
    }
    try {
      const res = await fetchWithAuth("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          ...newClientData,
          createdById: user?.userId,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to create client");
      }
      const newClient = await res.json();
      setClients((prev) => [...prev, newClient]);
      setFormData((prev) => ({
        ...prev,
        clientId: newClient.id,
        email: newClientData.email || prev.email,
        phone: newClientData.phone || prev.phone,
      }));
      resetNewClientForm();
      setIsNewClientSheetOpen(false);
      toast.success("Client created successfully");
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Failed to create client");
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (transactionType === "transaction") {
      if (!formData.name.trim()) errors.name = "Transaction name is required";
      if (!formData.projectValue) errors.projectValue = "Project value is required";
      if (!formData.date) errors.date = "Date is required";
      if (profit < 0) errors.profit = "Profit cannot be negative";
      if (formData.paymentStatus === "DP") {
        if (!formData.downPaymentAmount) {
          errors.downPaymentAmount = "Down payment amount is required";
        } else if (parseFloat(formData.downPaymentAmount) <= 0) {
          errors.downPaymentAmount = "Down payment must be greater than 0";
        } else if (parseFloat(formData.downPaymentAmount) > profit) {
          errors.downPaymentAmount = "Down payment cannot exceed profit";
        }
      }
    } else {
      if (!formData.category) errors.category = "Category is required";
      if (!formData.amount || parseFloat(formData.amount) <= 0)
        errors.amount = "Valid expense amount is required";
      if (!formData.date) errors.date = "Date is required";
      
      // Validate subscription-specific fields
      if (formData.category === "Subscription") {
        if (!formData.subscriptionId) {
          errors.subscriptionId = "Please select a subscription";
        }
        if (formData.isRecurringExpense && !formData.nextBillingDate) {
          errors.nextBillingDate = "Next billing date is required for recurring expenses";
        }
      }
    }
    
    if (showPaymentProofField && formData.paymentProofLink && !isValidURL(formData.paymentProofLink)) {
      errors.paymentProofLink = "Please enter a valid URL";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // URL validation
  const isValidURL = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }
    setIsSubmitting(true);
    try {
      let payload: any = {};
      let apiEndpoint;
      
      if (transactionType === "transaction") {
        let revenueAmount = 0;
        if (formData.paymentStatus === "Lunas") {
          revenueAmount = profit;
        } else if (formData.paymentStatus === "DP") {
          revenueAmount = parseFloat(formData.downPaymentAmount) || 0;
        }
        payload = {
          name: formData.name || "Transaction",
          projectValue: parseFloat(formData.projectValue) || 0,
          totalProfit: profit,
          amount: revenueAmount,
          paymentStatus: formData.paymentStatus,
          downPaymentAmount: formData.paymentStatus === "DP" ? parseFloat(formData.downPaymentAmount) : 0,
          remainingAmount: remainingAmount,
          email: formData.email || "",
          phone: formData.phone || "",
          description: formData.description || "",
          date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
          clientId: formData.clientId || null,
          picId: formData.picId || null,
        };
        if (showPaymentProofField && formData.paymentProofLink) {
          payload.paymentProofLink = formData.paymentProofLink;
        }
        apiEndpoint = "/api/transactions";
      } else {
        payload = {
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description || "",
          date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
          vendorId: formData.vendorId || null,
          transactionId: formData.transactionId || null,
          fundType: formData.fundType || "petty_cash",
        };
        
        // Add subscription-specific fields
        if (formData.category === "Subscription" && formData.subscriptionId) {
          payload.inventoryId = formData.subscriptionId;
          
          // Add recurring payment info
          if (formData.isRecurringExpense) {
            payload.isRecurringExpense = true;
            payload.recurringFrequency = formData.recurringFrequency;
            payload.nextBillingDate = formData.nextBillingDate 
              ? new Date(formData.nextBillingDate).toISOString() 
              : null;
          }
        }
        
        if (showPaymentProofField && formData.paymentProofLink) {
          payload.paymentProofLink = formData.paymentProofLink;
        }
        apiEndpoint = "/api/expenses";
      }
      
      console.log("Sending payload:", payload);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetchWithAuth(apiEndpoint, {
        method: "POST",
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        let errorMessage = "Server error occurred";
        try {
          const errorData = await res.json();
          console.error("Error response:", errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Could not parse error response", e);
        }
        throw new Error(errorMessage);
      }
      
      let responseData: Record<string, unknown> = {};
      try {
        responseData = await res.json();
        console.log("Server response:", responseData);
      } catch (jsonError) {
        console.error("Failed to parse server response:", jsonError);
      }
      
      const transactionData =
        (responseData?.transaction as TransactionData) ||
        (responseData?.expense as TransactionData) ||
        (responseData as unknown as TransactionData) ||
        (payload as unknown as TransactionData);
      
      if (user) {
        transactionData.createdBy = {
          id: user.userId,
          name: user.name,
          email: user.email,
        };
      }
      
      onTransactionAdded(transactionData);
      toast.success(`${transactionType === "transaction" ? "Transaction" : "Expense"} added successfully!`);
      
      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error("Error adding transaction/expense:", error);
      toast.error(`Failed to add ${transactionType}: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
          >
            Add New Entry
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add New Entry</DialogTitle>
            <DialogDescription>Choose entry type and fill in details.</DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <Select
              value={transactionType}
              onValueChange={(value: TransactionType) => {
                setTransactionType(value);
                resetForm();
                if (value === "expense") {
                  fetchTransactions();
                  fetchSubscriptions();
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Entry Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transaction">Transaction</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-[calc(90vh-180px)] overflow-y-auto pr-4">
            {/* Form content */}
            <form onSubmit={handleSubmit}>
              {transactionType === "transaction" ? (
                // TRANSACTION FORM (unchanged)
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Transaction form fields - unchanged */}
                    {/* ...existing transaction form fields... */}
                  </div>
                </div>
              ) : (
                // EXPENSE FORM (enhanced with subscription support)
                <div className="space-y-4">
                  {/* Category */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Category</label>
                    <Select
                      name="category"
                      value={formData.category}
                      onValueChange={handleCategoryChange}
                      required
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
                    {formErrors.category && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>
                    )}
                  </div>

                  {/* Subscription Selection (only appears for Subscription category) */}
                  {formData.category === "Subscription" && (
                    <div className="space-y-4 p-4 border rounded-md bg-slate-50">
                      <h3 className="text-md font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        Subscription Details
                      </h3>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium mb-1 block">
                          Select Subscription
                        </label>
                        <Select
                          value={formData.subscriptionId}
                          onValueChange={handleSubscriptionChange}
                          disabled={loadingSubscriptions}
                        >
                          <SelectTrigger 
                            className={formErrors.subscriptionId ? "border-red-500" : ""}
                          >
                            {loadingSubscriptions ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Loading subscriptions...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select subscription" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select a subscription</SelectItem>
                            {subscriptions.map((subscription) => (
                              <SelectItem key={subscription.id} value={subscription.id}>
                                {subscription.name} - Rp{formatRupiah(subscription.cost)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.subscriptionId && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.subscriptionId}</p>
                        )}
                      </div>
                      
                      {/* Show subscription details if selected */}
                      {showSubscriptionDetails && selectedSubscription && (
                        <>
                          <div className="pt-2">
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Subscription Info</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <dl className="grid grid-cols-1 gap-1 text-sm">
                                  <div className="flex justify-between py-1">
                                    <dt className="text-muted-foreground">Name:</dt>
                                    <dd className="font-medium">{selectedSubscription.name}</dd>
                                  </div>
                                  <div className="flex justify-between py-1">
                                    <dt className="text-muted-foreground">Cost:</dt>
                                    <dd className="font-medium">Rp{formatRupiah(selectedSubscription.cost)}</dd>
                                  </div>
                                  {selectedSubscription.isRecurring && (
                                    <div className="flex justify-between py-1">
                                      <dt className="text-muted-foreground">Billing Cycle:</dt>
                                      <dd className="font-medium">{selectedSubscription.recurringType}</dd>
                                    </div>
                                  )}
                                  {selectedSubscription.description && (
                                    <div className="pt-2">
                                      <dt className="text-muted-foreground mb-1">Description:</dt>
                                      <dd>{selectedSubscription.description}</dd>
                                    </div>
                                  )}
                                </dl>
                              </CardContent>
                            </Card>
                          </div>
                          
                          {/* Recurring payment options */}
                          <div className="pt-2">
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                id="isRecurringExpense"
                                checked={formData.isRecurringExpense}
                                onCheckedChange={handleRecurringExpenseChange}
                              />
                              <div className="grid gap-1.5 leading-none">
                                <Label
                                  htmlFor="isRecurringExpense"
                                  className="text-sm font-medium leading-none"
                                >
                                  Set up recurring payments
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  This will automatically schedule future payments
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Recurring payment settings */}
                          {formData.isRecurringExpense && (
                            <div className="space-y-4 pl-6 border-l-2 border-blue-100">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="recurringFrequency">Payment Frequency</Label>
                                  <Select
                                    value={formData.recurringFrequency}
                                    onValueChange={handleRecurringFrequencyChange}
                                  >
                                    <SelectTrigger id="recurringFrequency">
                                      <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {recurringFrequencyOptions.map((freq) => (
                                        <SelectItem key={freq} value={freq}>
                                          {freq === "MONTHLY" ? "Monthly" : 
                                           freq === "QUARTERLY" ? "Quarterly" : "Annually"}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="nextBillingDate">Next Billing Date</Label>
                                  <Input
                                    id="nextBillingDate"
                                    name="nextBillingDate"
                                    type="date"
                                    value={formData.nextBillingDate}
                                    onChange={handleChange}
                                    className={formErrors.nextBillingDate ? "border-red-500" : ""}
                                  />
                                  {formErrors.nextBillingDate && (
                                    <p className="text-red-500 text-xs mt-1">{formErrors.nextBillingDate}</p>
                                  )}
                                </div>
                              </div>
                              
                              <Alert>
                                <RepeatIcon className="h-4 w-4" />
                                <AlertTitle>Recurring Payment</AlertTitle>
                                <AlertDescription>
                                  This expense will automatically repeat on the selected frequency until canceled.
                                  You can manage recurring payments in the subscription management section.
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}
                        </>
                      )}
                      
                      {subscriptions.length === 0 && !loadingSubscriptions && (
                        <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>No subscriptions found</AlertTitle>
                          <AlertDescription>
                            You don't have any active subscriptions. Go to the Inventory section to add a subscription.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

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
                      disabled={formData.category === "Subscription" && !!selectedSubscription}
                    />
                    {formErrors.amount && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>
                    )}
                  </div>

                  {/* Link to Transaction */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium mb-1 block">
                      Link to Transaction/Project
                    </label>
                    <Select
                      value={formData.transactionId}
                      onValueChange={handleTransactionChange}
                      disabled={loadingTransactions}
                    >
                      <SelectTrigger>
                        {loadingTransactions ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            <span>Loading transactions...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select transaction (optional)" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No transaction</SelectItem>
                        {transactions.map((transaction) => (
                          <SelectItem key={transaction.id} value={transaction.id}>
                            {transaction.name} - Rp{formatRupiah(transaction.projectValue || 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Link this expense to an existing transaction/project for proper
                      project expense tracking
                    </p>
                  </div>

                  {/* Vendor */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium mb-1 block">Vendor/Subcontractor</label>
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

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Description</label>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Enter expense description"
                      rows={3}
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

                  {/* Fund Type */}
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-1 block">Fund Type</label>
                    <Select
                      value={formData.fundType}
                      onValueChange={(value: string) =>
                        setFormData((prev) => ({ ...prev, fundType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Fund Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petty_cash">Petty Cash</SelectItem>
                        <SelectItem value="profit_bank">Profit Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Proof */}
                  {showPaymentProofField && (
                    <div className="space-y-2">
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
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.paymentProofLink}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Add link to receipt or payment confirmation (Google Drive, Dropbox, etc.)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Client Sheet (unchanged) */}
      <Sheet open={isNewClientSheetOpen} onOpenChange={setIsNewClientSheetOpen}>
        <SheetContent className="w-full sm:max-w-md">
          {/* Sheet content - unchanged */}
        </SheetContent>
      </Sheet>
    </>
  );
}