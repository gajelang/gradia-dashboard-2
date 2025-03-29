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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Link as LinkIcon,
  Calendar,
  RepeatIcon,
  AlertCircle,
  CreditCard,
  Wallet,
  Tag,
  Package2,
  User,
  DollarSign,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatRupiah } from "@/lib/formatters";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { TransactionData } from "@/app/types/transaction";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// Transaction type definition
type TransactionType = "transaction" | "expense";

// Subscription interface
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

// Form data interface
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
  fundType: string; // Fund type for both transactions and expenses
  // Subscription fields
  subscriptionId: string;
  isRecurringExpense: boolean;
  recurringFrequency: string;
  nextBillingDate: string;
}

interface AddTransactionModalProps {
  onTransactionAdded: (transaction: TransactionData) => void;
}

export default function AddTransactionModal({ onTransactionAdded }: AddTransactionModalProps) {
  const { user } = useAuth();
  const [transactionType, setTransactionType] = useState<TransactionType>("transaction");
  const [activeTab, setActiveTab] = useState("transaction"); // Added for tab activation
  
  // Fund balances state
  const [fundBalances, setFundBalances] = useState<{
    petty_cash: number;
    profit_bank: number;
  }>({
    petty_cash: 0,
    profit_bank: 0
  });
  
  // Form data state
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
    // Subscription fields
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
  
  // Subscription state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  
  // Client, vendor, PIC, and transactions state
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [pics, setPics] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingPics, setLoadingPics] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingFundBalances, setLoadingFundBalances] = useState(false);
  
  // New client state
  const [isNewClientSheetOpen, setIsNewClientSheetOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    description: "",
  });

  // Category and payment options
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

  // Check payment proof field
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

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchVendors();
      fetchPics();
      fetchFundBalances();
      
      // Initialize transaction type and expense data if needed
      if (transactionType === "expense" || activeTab === "expense") { 
        fetchTransactions();
        fetchSubscriptions();
      }
    }
  }, [isOpen, transactionType, activeTab]);

  // Update form when subscription is selected
  useEffect(() => {
    if (selectedSubscription) {
      setFormData(prev => ({
        ...prev,
        category: "Subscription",
        description: `Payment for subscription: ${selectedSubscription.name}`,
        amount: selectedSubscription.cost.toString(),
        nextBillingDate: selectedSubscription.nextBillingDate,
        recurringFrequency: selectedSubscription.recurringType,
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

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      // Use the dedicated subscriptions endpoint
      const res = await fetchWithAuth("/api/subscriptions", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        // Filter for active subscriptions needing payment
        const activeSubscriptions = data.filter((item: any) => 
          !item.isDeleted && 
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
      } else {
        console.error("Failed to fetch subscriptions:", await res.text());
        toast.error("Failed to load subscriptions");
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Error loading subscriptions");
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
    setTransactionType("transaction");
    setActiveTab("transaction");
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

  // Handle subscription selection
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

  // Handle recurring expense checkbox
  const handleRecurringExpenseChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isRecurringExpense: checked }));
  };

  // Handle recurring frequency change
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

  // Handle fund type change
  const handleFundTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, fundType: value }));
  };

  // Handle new client change
  const handleNewClientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewClientData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setTransactionType(value as TransactionType);
    
    // Initialize data for the selected tab
    if (value === "expense" && transactions.length === 0) {
      fetchTransactions();
    }
    if (value === "expense" && subscriptions.length === 0) {
      fetchSubscriptions(); 
    }
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
      if (!formData.fundType) errors.fundType = "Fund destination is required";
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
      if (!formData.fundType) errors.fundType = "Fund source is required";
      
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
          fundType: formData.fundType, // Include fund type for transactions
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
          fundType: formData.fundType,
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
          errorMessage = errorData.message || errorData.error || errorMessage;
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
      
      // Show success message
      toast.success(`${transactionType === "transaction" ? "Transaction" : "Expense"} added successfully!`);
      
      // Refresh fund balances
      fetchFundBalances();
      
      // If it was a subscription payment, refresh the subscriptions list
      if (transactionType === "expense" && formData.category === "Subscription" && formData.subscriptionId) {
        // Wait a moment for the database to update
        setTimeout(() => {
          fetchSubscriptions();
        }, 1000);
      }
      
      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error("Error adding transaction/expense:", error);
      toast.error(`Failed to add ${transactionType}: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get fund balance display with formatting
  const getFundBalanceDisplay = (fundType: string) => {
    const balance = fundType === "petty_cash" ? fundBalances.petty_cash : fundBalances.profit_bank;
    return `Rp${formatRupiah(balance)}`;
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

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="transaction">Transaction</TabsTrigger>
              <TabsTrigger value="expense">Expense</TabsTrigger>
            </TabsList>

            <div className="h-[calc(90vh-180px)] overflow-y-auto pr-4">
              <form onSubmit={handleSubmit}>
                <TabsContent value="transaction" className="mt-0">
                  {/* TRANSACTION FORM */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Transaction Name */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">Transaction Name*</label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Enter transaction name"
                          className={formErrors.name ? "border-red-500" : ""}
                        />
                        {formErrors.name && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                        )}
                      </div>

                      {/* Project Value */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">Project Value*</label>
                        <Input
                          name="projectValue"
                          type="number"
                          min="0"
                          value={formData.projectValue}
                          onChange={handleChange}
                          placeholder="Enter project value"
                          className={formErrors.projectValue ? "border-red-500" : ""}
                        />
                        {formErrors.projectValue && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.projectValue}</p>
                        )}
                      </div>
                    </div>

                    {/* Fund Destination Selection - NEW ADDITION */}
                    <div className="mt-4 p-4 border rounded-md bg-slate-50">
                      <h3 className="text-sm font-semibold mb-3 flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-blue-600" />
                        Fund Destination
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1 flex items-center gap-1">
                            <Wallet className="h-4 w-4" />
                            Select Fund Destination*
                          </label>
                          <Select
                            value={formData.fundType}
                            onValueChange={handleFundTypeChange}
                          >
                            <SelectTrigger className={formErrors.fundType ? "border-red-500" : ""}>
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
                          {formErrors.fundType && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.fundType}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Select which fund this income will be added to
                          </p>
                        </div>
                        
                        {/* Fund Impact Preview */}
                        {formData.paymentStatus !== "Belum Bayar" && parseFloat(formData.projectValue) > 0 && (
                          <div className="bg-white p-3 rounded border">
                            <h4 className="text-sm font-medium mb-2">Fund Impact Preview</h4>
                            <div className="flex items-center gap-2">
                              <FundTypeIndicator fundType={formData.fundType} />
                              <div className="flex items-center">
                                <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
                                <span className="text-sm font-medium text-green-600">
                                  +Rp{formatRupiah(
                                    formData.paymentStatus === "Lunas" 
                                      ? parseFloat(formData.projectValue) || 0
                                      : parseFloat(formData.downPaymentAmount) || 0
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Client Selection */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Client</label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.clientId || "none"}
                          onValueChange={handleClientChange}
                          disabled={loadingClients}
                        >
                          <SelectTrigger className="flex-1">
                            {loadingClients ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Loading clients...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select client (optional)" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No client</SelectItem>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsNewClientSheetOpen(true)}
                        >
                          <User className="h-4 w-4 mr-2" />
                          New
                        </Button>
                      </div>
                    </div>

                    {/* Client Contact Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Email</label>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="client@example.com"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Phone</label>
                        <Input
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="08123456789"
                        />
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Description</label>
                      <Textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Enter transaction description"
                        rows={3}
                      />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Date*</label>
                        <Input
                          name="date"
                          type="date"
                          value={formData.date}
                          onChange={handleChange}
                          className={formErrors.date ? "border-red-500" : ""}
                        />
                        {formErrors.date && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Start Date</label>
                        <Input
                          name="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={handleChange}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">End Date</label>
                        <Input
                          name="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Project PIC */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Project PIC</label>
                      <Select
                        value={formData.picId || "none"}
                        onValueChange={handlePicChange}
                        disabled={loadingPics}
                      >
                        <SelectTrigger>
                          {loadingPics ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              <span>Loading PICs...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Select PIC (optional)" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No PIC</SelectItem>
                          {pics.map((pic) => (
                            <SelectItem key={pic.id} value={pic.id}>
                              {pic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Payment Details */}
                    <div className="mt-4 p-4 border rounded-md">
                      <h3 className="font-medium mb-4">Payment Details</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Payment Status</label>
                          <Select
                            value={formData.paymentStatus}
                            onValueChange={handlePaymentStatusChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment status" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentStatusOptions.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.paymentStatus === "DP" && (
                          <div>
                            <label className="text-sm font-medium mb-1 block">Down Payment Amount*</label>
                            <Input
                              name="downPaymentAmount"
                              type="number"
                              min="0"
                              max={formData.projectValue}
                              value={formData.downPaymentAmount}
                              onChange={handleChange}
                              placeholder="Enter down payment amount"
                              className={formErrors.downPaymentAmount ? "border-red-500" : ""}
                            />
                            {formErrors.downPaymentAmount && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.downPaymentAmount}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              Remaining: Rp{formatRupiah(remainingAmount)}
                            </p>
                          </div>
                        )}

                        {/* Payment Proof Link */}
                        {showPaymentProofField && (
                          <div className="mt-2">
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
                            <p className="text-xs text-muted-foreground mt-1">
                              Add link to receipt or payment confirmation (Google Drive, Dropbox, etc.)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="expense" className="mt-0">
                  {/* EXPENSE FORM */}
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

                    {/* Fund Source Selection */}
                    <div className="mt-4 p-4 border rounded-md bg-slate-50">
                      <h3 className="text-sm font-semibold mb-3 flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-red-600" />
                        Fund Source
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1 flex items-center gap-1">
                            <Wallet className="h-4 w-4" />
                            Select Fund Source*
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
                          <p className="text-xs text-muted-foreground mt-1">
                            Select which fund this expense will be deducted from
                          </p>
                        </div>
                        
                        {/* Fund Impact Preview */}
                        {parseFloat(formData.amount) > 0 && (
                          <div className="bg-white p-3 rounded border">
                            <h4 className="text-sm font-medium mb-2">Fund Impact Preview</h4>
                            <div className="flex items-center gap-2">
                              <FundTypeIndicator fundType={formData.fundType} />
                              <div className="flex items-center">
                                <ArrowDown className="h-3 w-3 text-red-600 mr-1" />
                                <span className="text-sm font-medium text-red-600">
                                  -Rp{formatRupiah(parseFloat(formData.amount) || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
                              <div className="bg-white p-3 rounded border">
                                <h4 className="text-sm font-medium mb-2">Subscription Info</h4>
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
                              </div>
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
                      <label className="text-sm font-medium mb-1 flex items-center gap-1">
                        <Tag className="h-4 w-4" />
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
                      <label className="text-sm font-medium mb-1 flex items-center gap-1">
                        <Package2 className="h-4 w-4" />
                        Vendor/Subcontractor
                      </label>
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

                    {/* Payment Proof */}
                    {showPaymentProofField && (
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
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
                        <p className="text-xs text-muted-foreground mt-1">
                          Add link to receipt or payment confirmation (Google Drive, Dropbox, etc.)
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </form>
            </div>
          </Tabs>

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

      {/* New Client Sheet */}
      <Sheet open={isNewClientSheetOpen} onOpenChange={setIsNewClientSheetOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add New Client</SheetTitle>
            <SheetDescription>
              Create a new client to associate with this transaction.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Client Code*</label>
              <Input
                name="code"
                value={newClientData.code}
                onChange={handleNewClientChange}
                placeholder="e.g., CLIENT001"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Client Name*</label>
              <Input
                name="name"
                value={newClientData.name}
                onChange={handleNewClientChange}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                name="email"
                type="email"
                value={newClientData.email}
                onChange={handleNewClientChange}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input
                name="phone"
                value={newClientData.phone}
                onChange={handleNewClientChange}
                placeholder="08123456789"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Textarea
                name="address"
                value={newClientData.address}
                onChange={handleNewClientChange}
                placeholder="Enter client address"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                name="description"
                value={newClientData.description}
                onChange={handleNewClientChange}
                placeholder="Enter client description"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsNewClientSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateClient}>Create Client</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}