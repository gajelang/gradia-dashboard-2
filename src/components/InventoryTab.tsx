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
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { 
  InventoryType, 
  InventoryStatus, 
  PaymentStatus, 
  RecurringType,
  InventoryFormData
} from "@/app/types/inventory";

interface AddInventoryModalProps {
  onInventoryAdded: (inventory: any) => void;
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

export default function AddInventoryModal({ onInventoryAdded }: AddInventoryModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<InventoryFormData>({
    name: "none",
    type: "EQUIPMENT",
    description: "none",
    status: "ACTIVE",
    purchaseDate: new Date().toISOString().split("T")[0],
    expiryDate: "none",
    cost: "none",
    currentValue: "none",
    paymentStatus: "BELUM_BAYAR",
    downPaymentAmount: "none",
    remainingAmount: "none",
    vendorId: "none",
    
    // Subscription fields
    isRecurring: false,
    recurringType: null,
    nextBillingDate: "none",
    reminderDays: "14",
  });
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Vendors for dropdown
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  
  // Fetch vendors when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVendors();
    }
  }, [isOpen]);
  
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
  
  const resetForm = () => {
    setFormData({
      name: "none",
      type: "EQUIPMENT",
      description: "none",
      status: "ACTIVE",
      purchaseDate: new Date().toISOString().split("T")[0],
      expiryDate: "none",
      cost: "none",
      currentValue: "none",
      paymentStatus: "BELUM_BAYAR",
      downPaymentAmount: "none",
      remainingAmount: "none",
      vendorId: "none",
      
      isRecurring: false,
      recurringType: null,
      nextBillingDate: "none",
      reminderDays: "14",
    });
    setFormErrors({});
    setActiveTab("details");
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
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear any error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Handle special cases
    if (name === 'type' && value !== 'SUBSCRIPTION') {
      // Reset subscription fields if type is not subscription
      setFormData(prev => ({
        ...prev,
        type: value as InventoryType,
        isRecurring: false,
        recurringType: null,
        nextBillingDate: "",
        reminderDays: "14",
      }));
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
  
  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isRecurring: checked }));
    
    if (!checked) {
      // Reset subscription fields if not recurring
      setFormData(prev => ({
        ...prev,
        isRecurring: false,
        recurringType: null,
        nextBillingDate: "",
        reminderDays: "14",
      }));
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
    if (formData.paymentStatus === "DP") {
      if (!formData.downPaymentAmount || 
          isNaN(parseFloat(formData.downPaymentAmount)) || 
          parseFloat(formData.downPaymentAmount) <= 0) {
        errors.downPaymentAmount = "Down payment amount is required";
      } else if (parseFloat(formData.downPaymentAmount) >= parseFloat(formData.cost)) {
        errors.downPaymentAmount = "Down payment cannot exceed total cost";
      }
    }
    
    // Validate subscription fields
    if (formData.type === "SUBSCRIPTION" && formData.isRecurring) {
      if (!formData.recurringType) {
        errors.recurringType = "Recurring type is required";
      }
      
      if (!formData.nextBillingDate) {
        errors.nextBillingDate = "Next billing date is required";
      }
      
      if (!formData.reminderDays || 
          isNaN(parseInt(formData.reminderDays)) || 
          parseInt(formData.reminderDays) < 0) {
        errors.reminderDays = "Valid reminder days is required";
      }
    }
    
    // If subscription, expiry date is required
    if (formData.type === "SUBSCRIPTION" && !formData.expiryDate) {
      errors.expiryDate = "Expiry date is required for subscriptions";
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
      
      // Prepare payload
      const payload = {
        ...formData,
        cost: parseFloat(formData.cost),
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
        downPaymentAmount: formData.downPaymentAmount ? parseFloat(formData.downPaymentAmount) : undefined,
        remainingAmount: remainingAmount,
        reminderDays: formData.reminderDays ? parseInt(formData.reminderDays) : undefined,
        createdById: user?.userId,
      };
      
      const response = await fetchWithAuth("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create inventory item");
      }
      
      const newInventory = await response.json();
      onInventoryAdded(newInventory);
      
      toast.success("Inventory item created successfully");
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
        <Button className="flex items-center gap-2" onClick={() => {
          resetForm();
          setIsOpen(true);
        }}>
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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date *</Label>
                  <Input
                    id="purchaseDate"
                    name="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={handleTextChange}
                    className={formErrors.purchaseDate ? "border-red-500" : ""}
                  />
                  {formErrors.purchaseDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.purchaseDate}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">
                    Expiry Date {formData.type === "SUBSCRIPTION" && "*"}
                  </Label>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={handleTextChange}
                    className={formErrors.expiryDate ? "border-red-500" : ""}
                  />
                  {formErrors.expiryDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.expiryDate}</p>
                  )}
                </div>
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
                  <Label htmlFor="currentValue">Current Value (Rp) (Optional)</Label>
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
                  {formErrors.currentValue && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.currentValue}</p>
                  )}
                </div>
              </div>
              
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
                    </div>
                  )}
                </div>
              </div>
              
              {/* Subscription section (show only for SUBSCRIPTION type) */}
              {formData.type === "SUBSCRIPTION" && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    Subscription Details
                  </h3>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="isRecurring"
                      checked={formData.isRecurring}
                      onCheckedChange={handleCheckboxChange}
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
                          <Input
                            id="nextBillingDate"
                            name="nextBillingDate"
                            type="date"
                            value={formData.nextBillingDate}
                            onChange={handleTextChange}
                            className={formErrors.nextBillingDate ? "border-red-500" : ""}
                          />
                          {formErrors.nextBillingDate && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.nextBillingDate}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reminderDays">Reminder Days Before Due *</Label>
                          <TooltipHelper text="Number of days before the next billing date to send a reminder notification" />
                        </div>
                        <Input
                          id="reminderDays"
                          name="reminderDays"
                          type="number"
                          min="0"
                          value={formData.reminderDays}
                          onChange={handleTextChange}
                          placeholder="14"
                          className={formErrors.reminderDays ? "border-red-500" : ""}
                        />
                        {formErrors.reminderDays && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.reminderDays}</p>
                        )}
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-md flex items-start gap-2">
                        <Bell className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">Renewal Reminders</p>
                          <p className="mt-1">
                            A notification will be generated {formData.reminderDays} days before the next billing date
                            to remind you about this subscription renewal.
                          </p>
                        </div>
                      </div>
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

// Helper component for tooltips
function TooltipHelper({ text }: { text: string }) {
  return (
    <div className="relative flex items-center">
      <div className="h-4 w-4 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 cursor-help" title={text}>
        ?
      </div>
    </div>
  );
}