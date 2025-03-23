"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
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
import {
  Loader2,
  Link as LinkIcon,
  UserPlus,
  User,
  Plus,
  // Removing unused imports
  // X,
  // Calendar,
  // DollarSign
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatRupiah } from "@/lib/formatters";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from "next/navigation";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  // Removing unused import
  // SheetFooter
} from "@/components/ui/sheet";
// Removing unused import
// import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
// Removing unused import
// import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
// Removing unused imports
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TransactionType = 'transaction' | 'expense';

// Creating a type for the transaction data to replace any
interface TransactionData {
  id: string;
  name: string;
  projectValue?: number;
  amount?: number;
  description?: string;
  [key: string]: any; // For other properties we might not know
}

interface AddTransactionModalProps {
  onTransactionAdded: (transaction: TransactionData) => void; // Replaced any with TransactionData
}

// Interface for Client
interface Client {
  isDeleted: boolean; // Changed from any to boolean
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

// Interface for Vendor - keeping for expense creation
interface Vendor {
  isDeleted: boolean; // Changed from any to boolean
  id: string;
  name: string;
  serviceDesc: string;
  email?: string;
  phone?: string;
}

// Interface for PIC
interface PIC {
  id: string;
  name: string;
  email: string;
  role?: string;
}

// Interface for Transaction
interface Transaction {
  id: string;
  name: string;
  description?: string;
  projectValue?: number;
  capitalCost?: number;
  isDeleted?: boolean;
}

export default function AddTransactionModal({ onTransactionAdded }: AddTransactionModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [transactionType, setTransactionType] = useState<TransactionType>('transaction');
  const [formData, setFormData] = useState({
    name: "",
    projectValue: "",
    email: "",
    phone: "",
    description: "",
    date: new Date().toISOString().split('T')[0], // Default to today
    category: "",
    amount: "",
    paymentStatus: "Belum Bayar",
    downPaymentAmount: "",
    startDate: "",
    endDate: "",
    paymentProofLink: "",
    clientId: "",
    vendorId: "", // Changed to single vendorId for expenses
    picId: "",
    transactionId: "", // Added for linking expense to existing transaction
  });
  const [profit, setProfit] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPaymentProofField, setShowPaymentProofField] = useState(true);
  
  // State for clients, vendors, PICs, and transactions
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pics, setPics] = useState<PIC[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    "gaji",
    "bonus",
    "Pembelian",
    "lembur",
    "produksi",
  ];

  const paymentStatusOptions: string[] = [
    "Belum Bayar",
    "DP",
    "Lunas",
  ];

  // Calculate profit and remaining amount when project values change
  useEffect(() => {
    const pv = parseFloat(formData.projectValue) || 0;
    const dpAmount = parseFloat(formData.downPaymentAmount) || 0;
    
    // Total profit is now just the project value
    const calculatedProfit = pv;
    setProfit(calculatedProfit);
    
    if (formData.paymentStatus === "DP") {
      setRemainingAmount(calculatedProfit - dpAmount);
    } else {
      setRemainingAmount(0);
    }
  }, [formData.projectValue, formData.downPaymentAmount, formData.paymentStatus]);

  // Check if database schema has paymentProofLink field
  useEffect(() => {
    const checkDatabaseSchema = async () => {
      try {
        // First try to get expenses to see if the field exists in the response
        const res = await fetchWithAuth("/api/expenses", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          // Check if any expense has the paymentProofLink field
          // If at least one has it, or if the array is empty, assume it's supported
          if (data.length === 0 || data.some((exp: Record<string, unknown>) => 'paymentProofLink' in exp)) {
            setShowPaymentProofField(true);
          } else {
            console.log("paymentProofLink field not found in expenses, hiding field");
            setShowPaymentProofField(false);
          }
        }
      } catch (error) {
        console.error("Error checking schema:", error);
        // Default to not showing if we can't confirm
        setShowPaymentProofField(false);
      }
    };
    
    checkDatabaseSchema();
  }, []);

  // Fetch clients, vendors, PICs, and transactions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchVendors(); // Still fetch vendors for expense creation
      fetchPics();
      if (transactionType === 'expense') {
        fetchTransactions(); // Fetch transactions for expense linking
      }
    }
  }, [isOpen, transactionType]);

  // Fetch clients
  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const res = await fetchWithAuth("/api/clients", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        // Only include active clients
        const activeClients = data.filter((client: Client) => !client.isDeleted);
        setClients(activeClients);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Fetch vendors (still needed for expense form)
  const fetchVendors = async () => {
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
  };

  // Fetch PICs (users who can be assigned as PIC)
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
        // Fallback with empty array instead of dummy data
        setPics([]);
        toast.error("Failed to load PIC options");
      }
    } catch (error) {
      console.error("Error fetching PICs:", error);
      // Fallback with empty array
      setPics([]);
      toast.error("Failed to load PIC options");
    } finally {
      setLoadingPics(false);
    }
  };

  // Fetch active transactions for expense linking
  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const res = await fetchWithAuth("/api/transactions", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        // Only include active transactions
        const activeTransactions = data.filter((tx: Transaction) => !tx.isDeleted);
        setTransactions(activeTransactions);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Reset form helper
  const resetForm = () => {
    setFormData({
      name: "",
      projectValue: "",
      email: "",
      phone: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      category: "",
      amount: "",
      paymentStatus: "Belum Bayar",
      downPaymentAmount: "",
      startDate: "",
      endDate: "",
      paymentProofLink: "",
      clientId: "",
      vendorId: "", // Reset vendor ID
      picId: "",
      transactionId: "", // Reset transaction ID
    });
    setProfit(0);
    setRemainingAmount(0);
    setFormErrors({});
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear any error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePaymentStatusChange = (value: string) => {
    setFormData(prev => ({ ...prev, paymentStatus: value }));
    
    // Reset downPaymentAmount if changing from DP to something else
    if (value !== "DP") {
      setFormData(prev => ({ ...prev, downPaymentAmount: "" }));
    }
  };

  // Handle client selection
  const handleClientChange = (value: string) => {
    setFormData(prev => ({ ...prev, clientId: value === "none" ? "" : value }));
    
    // If a client is selected, pre-fill client details
    if (value && value !== "none") {
      const selectedClient = clients.find(client => client.id === value);
      if (selectedClient) {
        setFormData(prev => ({
          ...prev,
          email: selectedClient.email || prev.email,
          phone: selectedClient.phone || prev.phone,
        }));
      }
    }
  };

  // Handle vendor selection for expense type
  const handleVendorChange = (value: string) => {
    setFormData(prev => ({ ...prev, vendorId: value === "none" ? "" : value }));
  };

  // Handle PIC selection
  const handlePicChange = (value: string) => {
    setFormData(prev => ({ ...prev, picId: value === "none" ? "" : value }));
  };

  // Handle transaction selection for expense linking
  const handleTransactionChange = (value: string) => {
    setFormData(prev => ({ ...prev, transactionId: value === "none" ? "" : value }));
  };

  // Handle category selection
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

  // Handle new client input change
  const handleNewClientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewClientData(prev => ({ ...prev, [name]: value }));
  };

  // Create new client
  const handleCreateClient = async () => {
    // Validate form
    if (!newClientData.code || !newClientData.name) {
      toast.error("Client code and name are required");
      return;
    }

    try {
      const res = await fetchWithAuth("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          ...newClientData,
          createdById: user?.userId
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create client");
      }

      const newClient = await res.json();
      
      // Add the new client to the list and select it
      setClients(prev => [...prev, newClient]);
      setFormData(prev => ({
        ...prev,
        clientId: newClient.id,
        email: newClientData.email || prev.email,
        phone: newClientData.phone || prev.phone,
      }));
      
      // Reset form and close sheet
      resetNewClientForm();
      setIsNewClientSheetOpen(false);
      toast.success("Client created successfully");
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Failed to create client");
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (transactionType === 'transaction') {
      if (!formData.name.trim()) errors.name = "Transaction name is required";
      if (!formData.projectValue) errors.projectValue = "Project value is required";
      if (!formData.date) errors.date = "Date is required";
      if (profit < 0) errors.profit = "Profit cannot be negative";
      
      // Validate DP amount if DP status is selected
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
    }
    
    // Validate payment proof link format if provided and the field is shown
    if (showPaymentProofField && formData.paymentProofLink && !isValidURL(formData.paymentProofLink)) {
      errors.paymentProofLink = "Please enter a valid URL";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Simple URL validator
  const isValidURL = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_unused) { // Changed from _ to _unused to indicate intentionally unused
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent multiple submissions
    
    // Validate form before submission
    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let payload: Record<string, any>; // Changed from any to Record<string, any>
      let apiEndpoint;

      if (transactionType === 'transaction') {
        // Determine the amount to be added to revenue based on payment status
        let revenueAmount = 0;
        
        if (formData.paymentStatus === "Lunas") {
          // Full amount for "Lunas" (paid in full)
          revenueAmount = profit;
        } else if (formData.paymentStatus === "DP") {
          // Only down payment amount for "DP"
          revenueAmount = parseFloat(formData.downPaymentAmount) || 0;
        }
        
        payload = {
          name: formData.name || "Transaction", 
          projectValue: parseFloat(formData.projectValue) || 0,
          totalProfit: profit,
          amount: revenueAmount, // This is what will affect the revenue
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
        
        // Only add payment proof link if the field is shown and has a value
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
          vendorId: formData.vendorId || null, // Include vendor ID for expense
          transactionId: formData.transactionId || null, // Include transaction ID for linking
        };
        
        // Only add payment proof link if the field is shown and has a value
        if (showPaymentProofField && formData.paymentProofLink) {
          payload.paymentProofLink = formData.paymentProofLink;
        }
        
        apiEndpoint = "/api/expenses";
      }

      console.log("Sending payload:", payload);

      // Adding a timeout to make sure we get a response or abort
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Use fetchWithAuth instead of regular fetch
      const res = await fetchWithAuth(apiEndpoint, {
        method: "POST",
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      // Handle HTTP errors before attempting to parse
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

      // Parse the response with error handling
      let responseData = {};
      try {
        responseData = await res.json();
        console.log("Server response:", responseData);
      } catch (jsonError) {
        console.error("Failed to parse server response:", jsonError);
        // Continue anyway - we'll use default values
      }
      
      // Extract transaction data with fallbacks for missing properties
      const transactionData = 
        (responseData as Record<string, any>)?.transaction || 
        (responseData as Record<string, any>)?.expense || 
        responseData || 
        payload; // Use payload as last resort
      
      // Add user information to the response
      if (user) {
        transactionData.createdBy = {
          id: user.userId,
          name: user.name,
          email: user.email
        };
      }
      
      // Notify parent component
      onTransactionAdded(transactionData);

      toast.success(`${transactionType === 'transaction' ? 'Transaction' : 'Expense'} added successfully!`);

      // Reset form & close modal
      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error('Error adding transaction/expense:', error);
      toast.error(`Failed to add ${transactionType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => {
            resetForm();
            setIsOpen(true);
          }}>Add New Entry</Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogTitle>Add New Entry</DialogTitle>
          <DialogDescription>Choose entry type and fill in details.</DialogDescription>
          
          {/* Transaction Type Selector */}
          <div className="mb-4">
            <Select 
              value={transactionType} 
              onValueChange={(value: TransactionType) => {
                setTransactionType(value);
                resetForm();
                if (value === 'expense') {
                  // Load transactions for expense linking
                  fetchTransactions();
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

          {/* Scrollable content container */}
          <ScrollArea className="h-[calc(90vh-180px)] pr-4">
            <form onSubmit={handleSubmit}>
              {transactionType === 'transaction' ? (
                <div className="space-y-4">
                  {/* Two-column grid for transaction form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left column */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Transaction Name</label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Transaction Name"
                          required
                          className={formErrors.name ? "border-red-500" : ""}
                        />
                        {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1 block">Project Value</label>
                        <Input
                          name="projectValue"
                          type="number"
                          min="0"
                          value={formData.projectValue}
                          onChange={handleChange}
                          placeholder="Total Project Value"
                          required
                          className={formErrors.projectValue ? "border-red-500" : ""}
                        />
                        {formErrors.projectValue && <p className="text-red-500 text-xs mt-1">{formErrors.projectValue}</p>}
                      </div>
                      
                      <div className={formErrors.profit ? "text-red-500" : ""}>
                        <label className="text-sm font-medium mb-1 block">Total Profit</label>
                        <div className="p-2 bg-gray-50 rounded border">
                          Rp{formatRupiah(profit)}
                        </div>
                        {formErrors.profit && <p className="text-red-500 text-xs mt-1">{formErrors.profit}</p>}
                      </div>
                      
                      {/* Payment Status */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">Payment Status</label>
                        <Select
                          name="paymentStatus"
                          value={formData.paymentStatus}
                          onValueChange={handlePaymentStatusChange}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Payment Status" />
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
                      
                      {/* Show Down Payment field only if DP is selected */}
                      {formData.paymentStatus === "DP" && (
                        <div>
                          <label className="text-sm font-medium mb-1 block">Down Payment Amount</label>
                          <Input
                            name="downPaymentAmount"
                            type="number"
                            min="0"
                            max={profit.toString()}
                            value={formData.downPaymentAmount}
                            onChange={handleChange}
                            placeholder="Down Payment Amount"
                            required
                            className={formErrors.downPaymentAmount ? "border-red-500" : ""}
                          />
                          {formErrors.downPaymentAmount && <p className="text-red-500 text-xs mt-1">{formErrors.downPaymentAmount}</p>}
                          
                          {parseFloat(formData.downPaymentAmount) > 0 && (
                            <div className="mt-2 text-sm">
                              <p>Remaining Amount: Rp{formatRupiah(remainingAmount)}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Contact Information */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">Client Email</label>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Client Email (Optional)"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1 block">Client Phone</label>
                        <Input
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Client Phone Number (Optional)"
                        />
                      </div>
                    </div>
                    
                    {/* Right column */}
                    <div className="space-y-4">
                      {/* Client Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex justify-between items-center">
                          <span>Client</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsNewClientSheetOpen(true)}
                            className="text-blue-600 h-7 px-2"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            New Client
                          </Button>
                        </label>
                        <Select value={formData.clientId} onValueChange={handleClientChange}>
                          <SelectTrigger>
                            {loadingClients ? ( // Using loadingClients here
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Loading clients...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select client" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No client</SelectItem>
                            {clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name} ({client.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* PIC Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex justify-between items-center">
                          <span>Person In Charge (PIC)</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.push('/register')}
                            className="text-blue-600 h-7 px-2"
                          >
                            <User className="h-4 w-4 mr-1" />
                            Register New User
                          </Button>
                        </label>
                        <Select 
                          value={formData.picId} 
                          onValueChange={handlePicChange}
                          disabled={loadingPics}
                        >
                          <SelectTrigger>
                            {loadingPics ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Loading users...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select PIC" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No PIC assigned</SelectItem>
                            {pics.length > 0 ? (
                              pics.map(pic => (
                                <SelectItem key={pic.id} value={pic.id}>
                                  {pic.name} {pic.role ? `(${pic.role})` : ""}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-2 py-1 text-sm text-muted-foreground">
                                No eligible users found
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {pics.length === 0 && !loadingPics && (
                          <p className="text-xs text-muted-foreground">
                            No users with PIC role found. Register new users or ask an admin to assign PIC roles.
                          </p>
                        )}
                      </div>
                      
                      {/* Description field */}
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
                      
                      {/* Date field */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">Transaction Date</label>
                        <Input
                          name="date"
                          type="date"
                          value={formData.date}
                          onChange={handleChange}
                          required
                          className={formErrors.date ? "border-red-500" : ""}
                        />
                        {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
                      </div>
                      
                      {/* Broadcast Dates */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground mb-1 block">Start Date</label>
                          <Input
                            name="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground mb-1 block">End Date</label>
                          <Input
                            name="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Proof Link Field - Below the two columns */}
                  {showPaymentProofField && (
                    <div className="space-y-2 mt-2">
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
                  )}
                </div>
              ) : (
                // Expense Form - Single Column Layout with Transaction and Vendor selection
                <div className="space-y-4">
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
                    {formErrors.category && <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>}
                  </div>
                  
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
                    {formErrors.amount && <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>}
                  </div>
                  
                  {/* Transaction Selection - For linking expense to existing project */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium mb-1 block">Link to Transaction/Project</label>
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
                        {transactions.map(transaction => (
                          <SelectItem key={transaction.id} value={transaction.id}>
                            {transaction.name} - Rp{formatRupiah(transaction.projectValue || 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Link this expense to an existing transaction/project for proper project expense tracking
                    </p>
                  </div>
                  
                  {/* Vendor Selection - Added for expenses */}
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
                    <label className="text-sm font-medium mb-1 block">Description</label>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Enter expense description"
                      rows={3}
                    />
                  </div>
                  
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
                    {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
                  </div>
                  
                  {/* Payment Proof Link Field - added for both transaction and expense */}
                  {showPaymentProofField && (
                    <div className="space-y-2">
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
                  )}
                </div>
              )}
            </form>
          </ScrollArea>
          
          {/* Buttons - Common for both transaction and expense */}
          <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
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
              Create a new client to use in your transactions.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Code</label>
              <Input
                name="code"
                value={newClientData.code}
                onChange={handleNewClientChange}
                placeholder="Enter unique client code"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Name</label>
              <Input
                name="name"
                value={newClientData.name}
                onChange={handleNewClientChange}
                placeholder="Enter client name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                name="email"
                type="email"
                value={newClientData.email}
                onChange={handleNewClientChange}
                placeholder="Enter client email"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                name="phone"
                value={newClientData.phone}
                onChange={handleNewClientChange}
                placeholder="Enter client phone"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                name="address"
                value={newClientData.address}
                onChange={handleNewClientChange}
                placeholder="Enter client address"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                name="description"
                value={newClientData.description}
                onChange={handleNewClientChange}
                placeholder="Enter client description"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsNewClientSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateClient}>
              <Plus className="h-4 w-4 mr-1" />
              Create Client
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}