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
  Plus,
  Package2,
  Calendar,
  ShoppingBag,
  Store,
  CreditCard,
  Bell,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatRupiah } from "@/lib/formatters/formatters";

// Define types
export type InventoryType = "EQUIPMENT" | "SUBSCRIPTION" | "OTHER";
export type InventoryStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type PaymentStatus = "LUNAS" | "DP" | "BELUM_BAYAR";
export type RecurringType = "MONTHLY" | "QUARTERLY" | "ANNUALLY" | null;
export type ExpiryType = "fixed" | "continuous";

export interface InventoryFormData {
  name: string;
  type: InventoryType;
  description: string;
  status: InventoryStatus;
  purchaseDate: string;
  expiryDate: string;
  expiryType: ExpiryType;
  cost: string;
  currentValue: string;
  paymentStatus: PaymentStatus;
  downPaymentAmount: string;
  remainingAmount: string;
  vendorId: string;
  fundType: string; // Added fund type for payments

  // Subscription fields
  isRecurring: boolean;
  recurringType: RecurringType;
  nextBillingDate: string;
  reminderDays: string;
  autoRenew: boolean;

  // Inventory stock fields
  category: string;
  quantity: string;
  unitPrice: string;
  location: string;
  minimumStock: string;
  supplier: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  category?: string;
  description?: string;
  location?: string;
  minimumStock?: number;
  supplier?: string;
  purchaseDate?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface AddInventoryModalProps {
  onInventoryAdded: (inventory: any) => void;
}

/**
 * Calculate the next billing date based on the purchase date and recurring frequency
 * This ensures the next billing date is on the same day of the month as the purchase date
 *
 * @param {Date} purchaseDate - The initial purchase/start date
 * @param {String} frequency - MONTHLY, QUARTERLY, or ANNUALLY
 * @returns {Date} The next billing date
 */
function calculateNextBillingDate(purchaseDate: string | number | Date, frequency: string) {
  // Create a new date object from the purchase date to avoid modifying the original
  const startDate = new Date(purchaseDate);
  const nextDate = new Date(startDate);

  // Get the day of the month from the purchase date
  const dayOfMonth = startDate.getDate();

  switch (frequency) {
    case 'MONTHLY':
      // Move to next month, same day
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;

    case 'QUARTERLY':
      // Move 3 months ahead, same day
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;

    case 'ANNUALLY':
      // Move 1 year ahead, same day
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;

    default:
      // Default to monthly if frequency not recognized
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  // Handle month length differences (e.g., Jan 31 -> Feb 28)
  // Check if the day has changed due to month length differences
  if (nextDate.getDate() !== dayOfMonth) {
    // Set to last day of previous month
    nextDate.setDate(0);
  }

  return nextDate;
}

export default function AddInventoryModal({ onInventoryAdded }: AddInventoryModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data with enhanced defaults
  const [formData, setFormData] = useState<InventoryFormData>({
    name: "",
    type: "EQUIPMENT",
    description: "",
    status: "ACTIVE",
    purchaseDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    expiryType: "fixed",
    cost: "",
    currentValue: "",
    paymentStatus: "BELUM_BAYAR",
    downPaymentAmount: "",
    remainingAmount: "",
    vendorId: "none",
    fundType: "petty_cash", // Default fund type

    // Subscription fields
    isRecurring: false,
    recurringType: null,
    nextBillingDate: "",
    reminderDays: "7",
    autoRenew: true,

    // Inventory stock fields
    category: "",
    quantity: "1",
    unitPrice: "0",
    location: "",
    minimumStock: "0",
    supplier: "",
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Vendors for dropdown
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);

  // Categories for dropdown
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  // Date picker states
  const [purchaseDateOpen, setPurchaseDateOpen] = useState(false);
  const [expiryDateOpen, setExpiryDateOpen] = useState(false);
  const [nextBillingDateOpen, setNextBillingDateOpen] = useState(false);

  // Fetch vendors and categories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      fetchCategories();
    }
  }, [isOpen]);

  // Update next billing date when purchase date or recurring type changes
  useEffect(() => {
    if (formData.type === 'SUBSCRIPTION' && formData.purchaseDate && formData.isRecurring && formData.recurringType) {
      // Calculate next billing date based on purchase date, not current date
      const nextDate = calculateNextBillingDate(
        new Date(formData.purchaseDate),
        formData.recurringType
      );

      setFormData(prev => ({
        ...prev,
        nextBillingDate: nextDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.type, formData.purchaseDate, formData.isRecurring, formData.recurringType]);

  const fetchVendors = async () => {
    try {
      setIsLoadingVendors(true);
      const res = await fetchWithAuth("/api/vendors", { cache: "no-store" });

      if (res.ok) {
        const data = await res.json();
        // Filter out deleted vendors
        const activeVendors = data.filter((v: any) => !v.isDeleted);
        setVendors(activeVendors);
      } else {
        console.error("Failed to fetch vendors");
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setIsLoadingVendors(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const res = await fetchWithAuth("/api/inventory/categories", { cache: "no-store" });

      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        console.error("Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "EQUIPMENT",
      description: "",
      status: "ACTIVE",
      purchaseDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      expiryType: "fixed",
      cost: "",
      currentValue: "",
      paymentStatus: "BELUM_BAYAR",
      downPaymentAmount: "",
      remainingAmount: "",
      vendorId: "none",
      fundType: "petty_cash", // Reset fund type to default

      isRecurring: false,
      recurringType: null,
      nextBillingDate: "",
      reminderDays: "7",
      autoRenew: true,

      category: "",
      quantity: "1",
      unitPrice: "0",
      location: "",
      minimumStock: "0",
      supplier: "",
    });
    setFormErrors({});
    setActiveTab("details");
    setNewCategory("");
    setShowNewCategoryInput(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'category' && value === 'new') {
      setShowNewCategoryInput(true);
      return;
    }

    // Special handling for vendorId
    if (name === 'vendorId') {
      setFormData(prev => ({ ...prev, [name]: value === "none" ? "" : value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear any error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Handle special cases
    if (name === 'type') {
      if (value === 'SUBSCRIPTION') {
        // For subscriptions, set defaults for subscription-specific fields
        setFormData(prev => ({
          ...prev,
          type: value as InventoryType,
          isRecurring: true,
          recurringType: "MONTHLY",
          category: "Subscription",
          // Next billing date will be calculated in useEffect based on purchase date
        }));
      } else {
        // Reset subscription fields if type is not subscription
        setFormData(prev => ({
          ...prev,
          type: value as InventoryType,
          isRecurring: false,
          recurringType: null,
          nextBillingDate: "",
          reminderDays: "7",
          autoRenew: true,
        }));
      }
    }

    if (name === 'expiryType') {
      // If continuous, clear expiry date as it's not needed
      if (value === 'continuous') {
        setFormData(prev => ({ ...prev, expiryDate: "" }));
      }
    }

    if (name === 'paymentStatus' && value !== 'DP') {
      // Reset DP fields if payment status is not DP
      setFormData(prev => ({
        ...prev,
        paymentStatus: value as PaymentStatus,
        downPaymentAmount: "",
        remainingAmount: "",
      }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));

    if (name === 'isRecurring' && !checked) {
      // Reset subscription fields if not recurring
      setFormData(prev => ({
        ...prev,
        isRecurring: false,
        recurringType: null,
        nextBillingDate: "",
        reminderDays: "7",
      }));
    }
  };

  const handleDateChange = (field: string, date: Date | undefined) => {
    if (!date) return;

    setFormData(prev => ({
      ...prev,
      [field]: date.toISOString().split('T')[0]
    }));

    // Close the date picker
    if (field === 'purchaseDate') setPurchaseDateOpen(false);
    if (field === 'expiryDate') setExpiryDateOpen(false);
    if (field === 'nextBillingDate') setNextBillingDateOpen(false);

    // Clear any error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.purchaseDate) {
      errors.purchaseDate = "Purchase date is required";
    }

    if (!formData.cost || isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) <= 0) {
      errors.cost = "Valid cost is required";
    }

    // Validate current value if provided
    if (formData.currentValue && (isNaN(parseFloat(formData.currentValue)) || parseFloat(formData.currentValue) < 0)) {
      errors.currentValue = "Current value must be a positive number";
    }

    // Validate payment fields
    if (formData.paymentStatus === "LUNAS" && !formData.fundType) {
      errors.fundType = "Fund source is required for paid items";
    }

    if (formData.paymentStatus === "DP") {
      if (!formData.fundType) {
        errors.fundType = "Fund source is required for down payments";
      }
      if (!formData.downPaymentAmount ||
          isNaN(parseFloat(formData.downPaymentAmount)) ||
          parseFloat(formData.downPaymentAmount) <= 0) {
        errors.downPaymentAmount = "Down payment amount is required";
      } else if (parseFloat(formData.downPaymentAmount) >= parseFloat(formData.cost)) {
        errors.downPaymentAmount = "Down payment cannot exceed total cost";
      }
    }

    // Validate subscription fields
    if (formData.type === "SUBSCRIPTION") {
      if (formData.expiryType === "fixed" && !formData.expiryDate) {
        errors.expiryDate = "End date is required for fixed-term subscriptions";
      }

      if (formData.isRecurring) {
        if (!formData.recurringType) {
          errors.recurringType = "Recurring type is required";
        }

        if (!formData.nextBillingDate) {
          errors.nextBillingDate = "Next billing date is required";
        } else {
          const nextBilling = new Date(formData.nextBillingDate);
          const today = new Date();
          if (nextBilling <= today) {
            errors.nextBillingDate = "Next billing date must be in the future";
          }
        }

        if (!formData.reminderDays ||
            isNaN(parseInt(formData.reminderDays)) ||
            parseInt(formData.reminderDays) < 0) {
          errors.reminderDays = "Valid reminder days is required";
        }
      }
    }

    // Validate inventory stock fields
    if (formData.type !== "SUBSCRIPTION") {
      if (isNaN(parseInt(formData.quantity)) || parseInt(formData.quantity) < 0) {
        errors.quantity = "Quantity must be a valid number";
      }

      if (formData.unitPrice && (isNaN(parseFloat(formData.unitPrice)) || parseFloat(formData.unitPrice) < 0)) {
        errors.unitPrice = "Unit price must be a valid number";
      }

      if (formData.minimumStock && (isNaN(parseInt(formData.minimumStock)) || parseInt(formData.minimumStock) < 0)) {
        errors.minimumStock = "Minimum stock must be a valid number";
      }
    }

    // Validate new category if input is shown
    if (showNewCategoryInput && !newCategory.trim()) {
      errors.newCategory = "Category name cannot be empty";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate remaining amount for DP
      let remainingAmount: number | undefined;
      if (formData.paymentStatus === "DP" && formData.downPaymentAmount && formData.cost) {
        remainingAmount = parseFloat(formData.cost) - parseFloat(formData.downPaymentAmount);
      }

      // If creating new category, use that instead
      const effectiveCategory = showNewCategoryInput ? newCategory : formData.category;

      // Calculate total value for inventory items
      const quantity = parseInt(formData.quantity) || 1;
      const unitPrice = parseFloat(formData.unitPrice) || parseFloat(formData.cost) || 0;
      const totalValue = quantity * unitPrice;

      // Prepare payload
      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description || null,
        status: formData.status,
        purchaseDate: formData.purchaseDate,
        expiryDate: formData.type === "SUBSCRIPTION" && formData.expiryType === "fixed"
          ? formData.expiryDate
          : null,
        expiryType: formData.type === "SUBSCRIPTION" ? formData.expiryType : null,
        cost: parseFloat(formData.cost),
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : parseFloat(formData.cost),
        paymentStatus: formData.paymentStatus,
        downPaymentAmount: formData.downPaymentAmount ? parseFloat(formData.downPaymentAmount) : null,
        remainingAmount: remainingAmount,

        // Subscription fields
        isRecurring: formData.type === "SUBSCRIPTION" ? formData.isRecurring : false,
        recurringType: formData.type === "SUBSCRIPTION" && formData.isRecurring ? formData.recurringType : null,
        nextBillingDate: formData.type === "SUBSCRIPTION" && formData.isRecurring ? formData.nextBillingDate : null,
        reminderDays: formData.type === "SUBSCRIPTION" ? parseInt(formData.reminderDays) : null,
        autoRenew: formData.type === "SUBSCRIPTION" ? formData.autoRenew : false,

        // Inventory stock fields
        category: effectiveCategory || null,
        quantity: quantity,
        unitPrice: unitPrice,
        totalValue: totalValue,
        location: formData.location || null,
        minimumStock: formData.minimumStock ? parseInt(formData.minimumStock) : null,
        supplier: formData.supplier || null,

        // Relations
        vendorId: formData.vendorId === "none" ? null : formData.vendorId,
        createdById: user?.id,
      };

      console.log("Submitting inventory:", payload);

      // Use the appropriate endpoint based on item type
      const endpoint = formData.type === "SUBSCRIPTION"
        ? "/api/subscriptions"
        : "/api/inventory";

      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Failed to create inventory item");
      }

      const data = await response.json();
      const newItem = formData.type === "SUBSCRIPTION" ? data.subscription : data.item;

      // Process payment if payment status is LUNAS or DP
      if (formData.paymentStatus === "LUNAS" || formData.paymentStatus === "DP") {
        try {
          // Create an expense record for this payment
          const paymentAmount = formData.paymentStatus === "LUNAS"
            ? parseFloat(formData.cost)
            : parseFloat(formData.downPaymentAmount);

          const paymentType = formData.paymentStatus === "LUNAS" ? "full payment" : "down payment";

          const expensePayload = {
            category: formData.type === "SUBSCRIPTION" ? "Subscription" : "Inventory",
            amount: paymentAmount,
            description: `${paymentType} for ${formData.type.toLowerCase()}: ${formData.name}`,
            date: new Date().toISOString(),
            inventoryId: newItem.id,
            fundType: formData.fundType,
          };

          const expenseResponse = await fetchWithAuth("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expensePayload),
          });

          if (!expenseResponse.ok) {
            const errorData = await expenseResponse.json();
            throw new Error(errorData.error || "Failed to process payment");
          }

          toast.success(`${paymentType} processed and funds deducted from ${formData.fundType === "petty_cash" ? "Petty Cash" : "Profit Bank"}`);
        } catch (error) {
          console.error("Error processing payment:", error);
          toast.error(`Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
          // We don't return here, as the inventory item was created successfully
        }
      }

      onInventoryAdded(newItem);
      toast.success(`${formData.type.toLowerCase()} created successfully`);
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating inventory item:", error);
      toast.error(`Failed to create inventory item: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="flex items-center gap-2"
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Inventory Item
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Add details for a new equipment, subscription, or other inventory item
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="details">Basic Details</TabsTrigger>
            <TabsTrigger value="payment">Payment & Subscription</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto pr-1" style={{ maxHeight: "calc(90vh - 230px)" }}>
            <TabsContent value="details" className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleTextChange}
                    placeholder="Enter item name"
                    className={formErrors.name ? "border-red-500" : ""}
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Item Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleSelectChange("type", value)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select item type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUIPMENT" className="flex items-center">
                        <div className="flex items-center">
                          <Package2 className="h-4 w-4 mr-2 text-blue-500" />
                          Equipment
                        </div>
                      </SelectItem>
                      <SelectItem value="SUBSCRIPTION">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                          Subscription
                        </div>
                      </SelectItem>
                      <SelectItem value="OTHER">
                        <div className="flex items-center">
                          <ShoppingBag className="h-4 w-4 mr-2 text-amber-500" />
                          Other
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleTextChange}
                  placeholder="Enter item description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  {!showNewCategoryInput ? (
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleSelectChange("category", value)}
                    >
                      <SelectTrigger id="category">
                        {isLoadingCategories ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            <span>Loading categories...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select category" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">+ Add New Category</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Enter new category name"
                        className={formErrors.newCategory ? "border-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategory("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  {formErrors.newCategory && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.newCategory}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date *</Label>
                  <Popover open={purchaseDateOpen} onOpenChange={setPurchaseDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          formErrors.purchaseDate ? "border-red-500" : ""
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.purchaseDate ? format(new Date(formData.purchaseDate), "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.purchaseDate ? new Date(formData.purchaseDate) : undefined}
                        onSelect={(date) => handleDateChange('purchaseDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {formErrors.purchaseDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.purchaseDate}</p>
                  )}
                </div>

                {formData.type === "SUBSCRIPTION" && (
                  <div className="space-y-2">
                    <Label htmlFor="expiryType">Duration Type</Label>
                    <Select
                      value={formData.expiryType}
                      onValueChange={(value) => handleSelectChange("expiryType", value as ExpiryType)}
                    >
                      <SelectTrigger id="expiryType">
                        <SelectValue placeholder="Select duration type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed End Date</SelectItem>
                        <SelectItem value="continuous">Continuous/Auto-renew</SelectItem>
                      </SelectContent>
                    </Select>

                    {formData.expiryType === "fixed" && (
                      <div className="mt-2">
                        <Label htmlFor="expiryDate">End Date *</Label>
                        <Popover open={expiryDateOpen} onOpenChange={setExpiryDateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${
                                formErrors.expiryDate ? "border-red-500" : ""
                              }`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.expiryDate ? format(new Date(formData.expiryDate), "PPP") : "Select end date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={formData.expiryDate ? new Date(formData.expiryDate) : undefined}
                              onSelect={(date) => handleDateChange('expiryDate', date)}
                              initialFocus
                              fromDate={new Date()} // Can't select dates in the past
                            />
                          </PopoverContent>
                        </Popover>
                        {formErrors.expiryDate && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.expiryDate}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost (Rp) *</Label>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    min="0"
                    value={formData.cost}
                    onChange={handleTextChange}
                    placeholder="Enter cost"
                    className={formErrors.cost ? "border-red-500" : ""}
                  />
                  {formErrors.cost && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.cost}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentValue">Current Value (Rp)</Label>
                  <Input
                    id="currentValue"
                    name="currentValue"
                    type="number"
                    min="0"
                    value={formData.currentValue}
                    onChange={handleTextChange}
                    placeholder="Enter current value"
                    className={formErrors.currentValue ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Defaults to purchase cost if empty
                  </p>
                  {formErrors.currentValue && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.currentValue}</p>
                  )}
                </div>
              </div>

              {/* Only show quantity fields for equipment and other types */}
              {formData.type !== "SUBSCRIPTION" && (
                <div className="space-y-4 pt-2 border-t">
                  <h3 className="text-sm font-medium">Inventory Details</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="0"
                        value={formData.quantity}
                        onChange={handleTextChange}
                        placeholder="Enter quantity"
                        className={formErrors.quantity ? "border-red-500" : ""}
                      />
                      {formErrors.quantity && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unitPrice">Unit Price (Rp)</Label>
                      <Input
                        id="unitPrice"
                        name="unitPrice"
                        type="number"
                        min="0"
                        value={formData.unitPrice}
                        onChange={handleTextChange}
                        placeholder="Enter unit price"
                        className={formErrors.unitPrice ? "border-red-500" : ""}
                      />
                      <p className="text-xs text-muted-foreground">
                        Defaults to cost if empty
                      </p>
                      {formErrors.unitPrice && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.unitPrice}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Storage Location</Label>
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleTextChange}
                        placeholder="Enter storage location"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minimumStock">Minimum Stock</Label>
                      <Input
                        id="minimumStock"
                        name="minimumStock"
                        type="number"
                        min="0"
                        value={formData.minimumStock}
                        onChange={handleTextChange}
                        placeholder="Enter minimum stock level"
                        className={formErrors.minimumStock ? "border-red-500" : ""}
                      />
                      {formErrors.minimumStock && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.minimumStock}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleTextChange}
                      placeholder="Enter supplier name"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <Button onClick={() => setActiveTab("payment")}>
                  Next: Payment & Subscription
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4 py-2">
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-500" />
                  Payment Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus">Payment Status *</Label>
                    <Select
                      value={formData.paymentStatus}
                      onValueChange={(value) => handleSelectChange("paymentStatus", value)}
                    >
                      <SelectTrigger id="paymentStatus">
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LUNAS">Paid (Full)</SelectItem>
                        <SelectItem value="DP">Down Payment</SelectItem>
                        <SelectItem value="BELUM_BAYAR">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fund selection for LUNAS or DP payment types */}
                  {(formData.paymentStatus === "LUNAS" || formData.paymentStatus === "DP") && (
                    <div className="space-y-2">
                      <Label htmlFor="fundType">Fund Source *</Label>
                      <Select
                        value={formData.fundType}
                        onValueChange={(value) => handleSelectChange("fundType", value)}
                      >
                        <SelectTrigger id="fundType" className={formErrors.fundType ? "border-red-500" : ""}>
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                            <SelectValue placeholder="Select fund source" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="petty_cash">Petty Cash</SelectItem>
                          <SelectItem value="profit_bank">Profit Bank</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.fundType && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.fundType}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formData.paymentStatus === "LUNAS" ?
                          "The full amount will be deducted from the selected fund" :
                          "The down payment amount will be deducted from the selected fund"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Down Payment Amount - only show for DP payment status */}
                {formData.paymentStatus === "DP" && (
                  <div className="space-y-2">
                    <Label htmlFor="downPaymentAmount">Down Payment Amount (Rp) *</Label>
                    <Input
                      id="downPaymentAmount"
                      name="downPaymentAmount"
                      type="number"
                      min="0"
                      max={formData.cost}
                      value={formData.downPaymentAmount}
                      onChange={handleTextChange}
                      placeholder="Enter down payment amount"
                      className={formErrors.downPaymentAmount ? "border-red-500" : ""}
                    />
                    {formErrors.downPaymentAmount && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.downPaymentAmount}</p>
                    )}
                    {formData.downPaymentAmount && formData.cost && (
                      <p className="text-xs text-muted-foreground">
                        Remaining: Rp{formatRupiah(
                          parseFloat(formData.cost) - parseFloat(formData.downPaymentAmount) || 0
                        )}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor (Optional)</Label>
                  <Select
                    value={formData.vendorId}
                    onValueChange={(value) => handleSelectChange("vendorId", value)}
                    disabled={isLoadingVendors}
                  >
                    <SelectTrigger id="vendor">
                      {isLoadingVendors ? (
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
                          <div className="flex items-center">
                            <Store className="h-4 w-4 mr-2 text-gray-500" />
                            {vendor.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subscription section (show only for SUBSCRIPTION type) */}
              {formData.type === "SUBSCRIPTION" && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    Subscription Details
                  </h3>

                  <Alert className="bg-purple-50 border-purple-200">
                    <RefreshCw className="h-4 w-4 text-purple-500" />
                    <AlertTitle>Subscription Management</AlertTitle>
                    <AlertDescription>
                      Subscriptions can be set up with recurring payments and automatic renewals.
                      You'll receive reminders before payment due dates.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="isRecurring"
                      checked={formData.isRecurring}
                      onCheckedChange={(checked) => handleCheckboxChange("isRecurring", !!checked)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="isRecurring"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        This is a recurring subscription
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enable to set up billing cycles and reminders
                      </p>
                    </div>
                  </div>

                  {formData.isRecurring && (
                    <div className="space-y-4 pl-6 border-l-2 border-purple-100">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="recurringType">Billing Cycle *</Label>
                          <Select
                            value={formData.recurringType || ""}
                            onValueChange={(value) => handleSelectChange("recurringType", value)}
                          >
                            <SelectTrigger id="recurringType" className={formErrors.recurringType ? "border-red-500" : ""}>
                              <SelectValue placeholder="Select billing cycle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                              <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                              <SelectItem value="ANNUALLY">Annually</SelectItem>
                            </SelectContent>
                          </Select>
                          {formErrors.recurringType && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.recurringType}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="nextBillingDate">Next Billing Date *</Label>
                          <Popover open={nextBillingDateOpen} onOpenChange={setNextBillingDateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-full justify-start text-left font-normal ${
                                  formErrors.nextBillingDate ? "border-red-500" : ""
                                }`}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.nextBillingDate ? format(new Date(formData.nextBillingDate), "PPP") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarComponent
                                mode="single"
                                selected={formData.nextBillingDate ? new Date(formData.nextBillingDate) : undefined}
                                onSelect={(date) => handleDateChange('nextBillingDate', date)}
                                initialFocus
                                fromDate={new Date()} // Can't select dates in the past
                              />
                            </PopoverContent>
                          </Popover>
                          {formErrors.nextBillingDate && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.nextBillingDate}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            This is calculated from the purchase date, but you can adjust it if needed
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reminderDays">Reminder Days Before Due *</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-[200px] text-xs">
                                  Number of days before the next billing date to send a reminder notification
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          id="reminderDays"
                          name="reminderDays"
                          type="number"
                          min="0"
                          value={formData.reminderDays}
                          onChange={handleTextChange}
                          placeholder="7"
                          className={formErrors.reminderDays ? "border-red-500" : ""}
                        />
                        {formErrors.reminderDays && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.reminderDays}</p>
                        )}
                      </div>

                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="autoRenew"
                          checked={formData.autoRenew}
                          onCheckedChange={(checked) => handleCheckboxChange("autoRenew", !!checked)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label
                            htmlFor="autoRenew"
                            className="text-sm font-medium leading-none"
                          >
                            Enable automatic renewal
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically renew this subscription when the billing cycle ends
                          </p>
                        </div>
                      </div>

                      <Alert className="bg-blue-50 p-3 rounded-md flex items-start gap-2">
                        <Bell className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">Renewal Reminders</p>
                          <p className="mt-1">
                            A notification will be generated {formData.reminderDays} days before the next billing date
                            to remind you about this subscription renewal.
                          </p>
                        </div>
                      </Alert>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("details")}>
                  Back to Details
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Item"
                  )}
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}