"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Calendar, 
  AlertCircle, 
  Loader2, 
  CheckCircle, 
  CreditCard, 
  MoreHorizontal,
  ArrowUpDown,
  Edit
} from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api/api";
import { formatRupiah } from "@/lib/formatters/formatters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Vendor {
  id: string;
  name: string;
  serviceDesc: string;
}

export interface Subscription {
  id: string;
  name: string;
  description?: string;
  status: string;
  purchaseDate: string;
  expiryDate?: string | null;
  cost: number;
  paymentStatus: string;
  isRecurring: boolean;
  recurringType?: string;
  nextBillingDate?: string | null;
  reminderDays?: number;
  vendor?: Vendor | null;
  createdAt: string;
  updatedAt: string;
}

const THRESHOLD_DAYS = 7;

function isDueSoon(nextBillingDate: string | null | undefined): boolean {
  if (!nextBillingDate) return false;
  const billingDate = new Date(nextBillingDate);
  const today = new Date();
  const diffTime = billingDate.getTime() - today.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);
  return diffDays <= THRESHOLD_DAYS && diffDays >= 0;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const targetDate = new Date(dateStr);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 3600 * 24));
}

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [dueSoon, setDueSoon] = useState<Subscription[]>([]);
  const [others, setOthers] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "all">("upcoming");
  
  // Sort state
  const [sortColumn, setSortColumn] = useState<keyof Subscription | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Payment processing states
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedFundType, setSelectedFundType] = useState<string>("petty_cash");
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use authenticated fetch
      const response = await fetchWithAuth('/api/subscriptions');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subscriptions');
      }
      
      const data: Subscription[] = await response.json();
      setSubscriptions(data);
      
      // Group subscriptions
      const due = data.filter(sub => isDueSoon(sub.nextBillingDate));
      const notDue = data.filter(sub => !isDueSoon(sub.nextBillingDate));
      setDueSoon(due);
      setOthers(notDue);
    } catch (err: any) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred';
      
      setError(errorMessage);
      toast.error(errorMessage, {
        description: 'Unable to fetch subscriptions. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionAdded = (newSubscription: Subscription) => {
    // Refresh the data to include the new subscription
    fetchSubscriptions();
    toast.success("Subscription added successfully");
  };
  
  const handlePaymentClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsPaymentDialogOpen(true);
  };
  
  const handleEditClick = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsEditDialogOpen(true);
  };
  
  const processPayment = async () => {
    if (!selectedSubscription) return;
    
    try {
      setProcessingPayment(true);
      
      // Create an expense record for this subscription payment
      const payload = {
        category: "Subscription",
        amount: selectedSubscription.cost,
        description: `Payment for subscription: ${selectedSubscription.name}`,
        date: new Date().toISOString(),
        inventoryId: selectedSubscription.id,
        fundType: selectedFundType,
      };
      
      const response = await fetchWithAuth("/api/expenses", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Failed to process payment");
      }
      
      toast.success("Payment processed successfully");
      setIsPaymentDialogOpen(false);
      
      // Refresh data after payment
      setTimeout(() => {
        fetchSubscriptions();
      }, 1000);
      
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setProcessingPayment(false);
    }
  };
  
  const saveSubscriptionChanges = async () => {
    if (!editingSubscription) return;
    
    try {
      // Example implementation - replace with your actual update logic
      const response = await fetchWithAuth(`/api/subscriptions/${editingSubscription.id}`, {
        method: "PUT",
        body: JSON.stringify(editingSubscription),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update subscription");
      }
      
      toast.success("Subscription updated successfully");
      setIsEditDialogOpen(false);
      
      // Refresh data
      fetchSubscriptions();
      
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error(`Update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  const toggleSort = (column: keyof Subscription) => {
    if (sortColumn === column) {
      // If already sorting by this column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If new column, start with ascending sort
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const sortSubscriptions = (subs: Subscription[]) => {
    if (!sortColumn) return subs;
    
    return [...subs].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue === undefined || bValue === undefined) return 0;
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Handle number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }
      
      return 0;
    });
  };
  
  const getPaymentStatusBadge = (status: string) => {
    switch(status) {
      case 'LUNAS': return 'secondary';
      case 'DP': return 'outline';
      case 'BELUM_BAYAR': return 'destructive';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>Loading subscriptions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button 
          onClick={fetchSubscriptions} 
          variant="destructive" 
          className="mt-4"
        >
          Try Again
        </Button>
      </Alert>
    );
  }
  
  const sortedDueSoon = sortSubscriptions(dueSoon);
  const sortedSubscriptions = sortSubscriptions(subscriptions);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upcoming" | "all")}>
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming" className="relative">
            Upcoming Payments
            {dueSoon.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {dueSoon.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Subscriptions</TabsTrigger>
        </TabsList>
        
        {activeTab === "upcoming" && (
          <div className="space-y-4">
            {dueSoon.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg border">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Upcoming Payments</h3>
                <p className="text-gray-500 mt-2">
                  All your subscriptions are up to date. Check back later for upcoming payments.
                </p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableCaption>Upcoming payments due in the next {THRESHOLD_DAYS} days</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort('name')}>
                        <div className="flex items-center">
                          Name
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort('nextBillingDate')}>
                        <div className="flex items-center">
                          Due Date
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort('cost')}>
                        <div className="flex items-center">
                          Amount
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort('paymentStatus')}>
                        <div className="flex items-center">
                          Payment Status
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDueSoon.map((sub) => {
                      const daysRemaining = daysUntil(sub.nextBillingDate);
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{sub.name}</div>
                              {sub.description && (
                                <div className="text-xs text-muted-foreground">{sub.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-yellow-600 font-semibold">
                              {formatDate(sub.nextBillingDate)}
                              {daysRemaining !== null && (
                                <div className="text-xs">
                                  {daysRemaining === 0 ? 'Due today' : `Due in ${daysRemaining} days`}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>Rp{formatRupiah(sub.cost)}</TableCell>
                          <TableCell>
                            <Badge variant={getPaymentStatusBadge(sub.paymentStatus)}>
                              {sub.paymentStatus === "LUNAS" ? "Paid" : 
                              sub.paymentStatus === "DP" ? "Partial" : 
                              "Unpaid"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => handlePaymentClick(sub)}
                                className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClick(sub)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
        
        {activeTab === "all" && (
          <div className="space-y-4">
            {subscriptions.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg border">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Subscriptions</h3>
                <p className="text-gray-500 mt-2">
                  You don't have any active subscriptions. Add one to get started.
                </p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort('name')}>
                        <div className="flex items-center">
                          Name
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort('nextBillingDate')}>
                        <div className="flex items-center">
                          Next Billing
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort('cost')}>
                        <div className="flex items-center">
                          Amount
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort('recurringType')}>
                        <div className="flex items-center">
                          Billing Cycle
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort('paymentStatus')}>
                        <div className="flex items-center">
                          Payment Status
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </div>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSubscriptions.map((sub) => {
                      const dueDate = sub.nextBillingDate;
                      const isDue = isDueSoon(dueDate);
                      
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{sub.name}</div>
                              {sub.description && (
                                <div className="text-xs text-muted-foreground">{sub.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={isDue ? "text-yellow-600 font-semibold" : ""}>
                              {formatDate(sub.nextBillingDate)}
                              {isDue && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  Due Soon
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>Rp{formatRupiah(sub.cost)}</TableCell>
                          <TableCell>{sub.recurringType || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={getPaymentStatusBadge(sub.paymentStatus)}>
                              {sub.paymentStatus === "LUNAS" ? "Paid" : 
                              sub.paymentStatus === "DP" ? "Partial" : 
                              "Unpaid"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEditClick(sub)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                {sub.paymentStatus !== "LUNAS" && (
                                  <DropdownMenuItem onClick={() => handlePaymentClick(sub)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Process Payment
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Tabs>
      
      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Subscription Payment</DialogTitle>
            <DialogDescription>
              You are about to process a payment for the following subscription.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Subscription:</span>
                  <span>{selectedSubscription.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Amount:</span>
                  <span>Rp{formatRupiah(selectedSubscription.cost)}</span>
                </div>
                {selectedSubscription.nextBillingDate && (
                  <div className="flex justify-between">
                    <span className="font-medium">Billing Date:</span>
                    <span>{formatDate(selectedSubscription.nextBillingDate)}</span>
                  </div>
                )}
              </div>
              
              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertTitle>Payment Information</AlertTitle>
                <AlertDescription>
                  This will create an expense record for this subscription payment and update the subscription status.
                </AlertDescription>
              </Alert>
              
              {/* Fund Type Selection */}
              <div className="mt-4">
                <label className="text-sm font-medium mb-1 block">Fund Source</label>
                <Select
                  value={selectedFundType}
                  onValueChange={setSelectedFundType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Fund Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petty_cash">Petty Cash</SelectItem>
                    <SelectItem value="profit_bank">Profit Bank</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select which fund to use for this payment
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
              disabled={processingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={processPayment}
              disabled={processingPayment}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription details
            </DialogDescription>
          </DialogHeader>
          
          {editingSubscription && (
            <div className="py-4 space-y-4">
              {/* Implement your edit form here. For example: */}
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <input 
                  type="text" 
                  value={editingSubscription.name}
                  onChange={(e) => setEditingSubscription({...editingSubscription, name: e.target.value})}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea 
                  value={editingSubscription.description || ''}
                  onChange={(e) => setEditingSubscription({...editingSubscription, description: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Cost</label>
                <input 
                  type="number" 
                  value={editingSubscription.cost}
                  onChange={(e) => setEditingSubscription({...editingSubscription, cost: Number(e.target.value)})}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Next Billing Date</label>
                <input 
                  type="date" 
                  value={editingSubscription.nextBillingDate ? new Date(editingSubscription.nextBillingDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingSubscription({...editingSubscription, nextBillingDate: e.target.value})}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Billing Cycle</label>
                <Select
                  value={editingSubscription.recurringType || ''}
                  onValueChange={(value) => setEditingSubscription({...editingSubscription, recurringType: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Billing Cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="ANNUALLY">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveSubscriptionChanges}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}