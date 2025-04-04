"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  RefreshCw, 
  ArrowUpDown, 
  Filter, 
  MoreHorizontal,
  AlertCircle,
  Archive,
  Eye,
  EyeOff
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";
import { formatRupiah } from "@/lib/formatters";
import { fetchWithAuth } from "@/lib/api"; // Use authenticated fetch
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

export interface Subscription {
  id: string;
  name: string;
  description?: string;
  paymentStatus: 'LUNAS' | 'DP' | 'BELUM_BAYAR';
  nextBillingDate?: string | null;
  cost: number;
  isRecurring: boolean;
  recurringType?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | null;
  reminderDays?: number;
  isDeleted?: boolean;
  deletedBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const THRESHOLD_DAYS = 7;

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

export default function SubscriptionTable() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof Subscription | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<Subscription['paymentStatus'] | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  
  // State for archiving dialog
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [subscriptionToArchive, setSubscriptionToArchive] = useState<Subscription | null>(null);
  const [confirmArchiveText, setConfirmArchiveText] = useState("");
  
  // State for restoring dialog
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [subscriptionToRestore, setSubscriptionToRestore] = useState<Subscription | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add query parameter for archived subscriptions
      const queryParam = viewMode === "archived" ? "?deleted=true" : "";
      
      // Use authenticated fetch
      const response = await fetchWithAuth(`/api/subscriptions${queryParam}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subscriptions');
      }
      
      const data: Subscription[] = await response.json();
      setSubscriptions(data);
    } catch (err: any) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred';
      
      setError(errorMessage);
      toast.error(`${errorMessage}. Unable to fetch subscriptions. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [viewMode]);

  const filteredSubs = useMemo(() => {
    return subscriptions
      .filter((sub) => 
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterStatus === 'ALL' || sub.paymentStatus === filterStatus)
      )
      .sort((a, b) => {
        if (!sortColumn) return 0;
        
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue === undefined || bValue === undefined) return 0;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' 
            ? aValue - bValue 
            : bValue - aValue;
        }
        
        return 0;
      });
  }, [subscriptions, searchTerm, sortColumn, sortDirection, filterStatus]);

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

  const getStatusVariant = (status: Subscription['paymentStatus']) => {
    switch(status) {
      case 'LUNAS': return 'secondary';
      case 'DP': return 'outline';
      case 'BELUM_BAYAR': return 'destructive';
      default: return 'default';
    }
  };
  
  // Handle archive subscription
  const handleArchiveClick = (subscription: Subscription) => {
    setSubscriptionToArchive(subscription);
    setConfirmArchiveText("");
    setIsArchiveDialogOpen(true);
  };

  const handleArchiveSubscription = async () => {
    if (!subscriptionToArchive || confirmArchiveText !== "ARCHIVE") {
      toast.error("Please type ARCHIVE to confirm");
      return;
    }
    
    try {
      const res = await fetchWithAuth("/api/subscriptions/softDelete", {
        method: "POST",
        body: JSON.stringify({
          id: subscriptionToArchive.id,
          deletedById: user?.userId
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to archive subscription");
      }
      
      toast.success("Subscription archived successfully");
      
      // Refetch subscriptions
      fetchSubscriptions();
      
      // Close dialog
      setIsArchiveDialogOpen(false);
      setSubscriptionToArchive(null);
      setConfirmArchiveText("");
    } catch (error) {
      console.error("Error archiving subscription:", error);
      toast.error(error instanceof Error ? error.message : "Failed to archive subscription");
    }
  };
  
  // Handle restore subscription
  const handleRestoreClick = (subscription: Subscription) => {
    setSubscriptionToRestore(subscription);
    setIsRestoreDialogOpen(true);
  };

  const handleRestoreSubscription = async () => {
    if (!subscriptionToRestore) return;
    
    try {
      const res = await fetchWithAuth("/api/subscriptions/restore", {
        method: "POST",
        body: JSON.stringify({
          id: subscriptionToRestore.id,
          restoredById: user?.userId
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to restore subscription");
      }
      
      toast.success("Subscription restored successfully");
      
      // Refetch subscriptions
      fetchSubscriptions();
      
      // Close dialog
      setIsRestoreDialogOpen(false);
      setSubscriptionToRestore(null);
    } catch (error) {
      console.error("Error restoring subscription:", error);
      toast.error(error instanceof Error ? error.message : "Failed to restore subscription");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button 
          onClick={fetchSubscriptions} 
          variant="destructive" 
          className="mt-4"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> 
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Subscriptions</h2>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === "active" ? "default" : "outline"}
            onClick={() => setViewMode("active")}
            className="flex items-center gap-1"
          >
            <Eye className="h-4 w-4" />
            Active
          </Button>
          <Button 
            variant={viewMode === "archived" ? "default" : "outline"}
            onClick={() => setViewMode("archived")}
            className="flex items-center gap-1"
          >
            <EyeOff className="h-4 w-4" />
            Archived
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Payment Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setFilterStatus('ALL')}
                className={filterStatus === 'ALL' ? 'bg-muted' : ''}
              >
                All Subscriptions
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterStatus('LUNAS')}
                className={filterStatus === 'LUNAS' ? 'bg-muted' : ''}
              >
                Paid
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterStatus('DP')}
                className={filterStatus === 'DP' ? 'bg-muted' : ''}
              >
                Partial Payment
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterStatus('BELUM_BAYAR')}
                className={filterStatus === 'BELUM_BAYAR' ? 'bg-muted' : ''}
              >
                Unpaid
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button variant="ghost" onClick={fetchSubscriptions}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <Table>
        <TableCaption>{filteredSubs.length} subscriptions found</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-muted" 
              onClick={() => toggleSort('name')}
            >
              <div className="flex items-center">
                Name 
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted" 
              onClick={() => toggleSort('paymentStatus')}
            >
              <div className="flex items-center">
                Payment Status
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted" 
              onClick={() => toggleSort('cost')}
            >
              <div className="flex items-center">
                Monthly Cost
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted" 
              onClick={() => toggleSort('nextBillingDate')}
            >
              <div className="flex items-center">
                Next Billing Date
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              </div>
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSubs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No subscriptions found.
              </TableCell>
            </TableRow>
          ) : (
            filteredSubs.map((sub) => {
              const dueDays = daysUntil(sub.nextBillingDate);
              const isDueSoon = dueDays !== null && dueDays <= THRESHOLD_DAYS && dueDays >= 0;
              return (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(sub.paymentStatus)}>
                      {sub.paymentStatus === 'LUNAS' ? 'Paid' 
                        : sub.paymentStatus === 'DP' ? 'Partial' 
                        : 'Unpaid'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    Rp{formatRupiah(sub.cost)}/month
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-2 ${isDueSoon ? 'text-yellow-600 font-semibold' : ''}`}>
                      {formatDate(sub.nextBillingDate)}
                      {isDueSoon && (
                        <Badge variant="destructive" className="text-xs">
                          Due Soon
                        </Badge>
                      )}
                    </div>
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
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        {viewMode === "active" ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                // Get inventory ID for this subscription
                                const inventoryId = sub.id;
                                // Open inventory edit dialog using the inventory ID
                                const editButton = document.getElementById(`update-inventory-${inventoryId}`);
                                if (editButton) {
                                  editButton.click();
                                } else {
                                  toast.error("Edit dialog not found");
                                }
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>Make Payment</DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleArchiveClick(sub)}
                            >
                              Archive Subscription
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            className="text-green-600"
                            onClick={() => handleRestoreClick(sub)}
                          >
                            Restore Subscription
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* Hidden trigger buttons for edit modal (needed by inventory system) */}
                    <div className="hidden">
                      <span id={`update-inventory-${sub.id}`}></span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      
      {/* Archive Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Subscription</DialogTitle>
            <DialogDescription>
              This subscription will be archived. You can restore it later if needed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-2 font-medium">Subscription: {subscriptionToArchive?.name}</p>
            <p className="mb-4 text-sm text-muted-foreground">Type &quot;ARCHIVE&quot; to confirm.</p>
            <Input
              value={confirmArchiveText}
              onChange={(e) => setConfirmArchiveText(e.target.value)}
              placeholder="Type ARCHIVE to confirm"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleArchiveSubscription}
              disabled={confirmArchiveText !== "ARCHIVE"}
            >
              Archive Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore Subscription</DialogTitle>
            <DialogDescription>
              This subscription will be restored and will appear in the active list again.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p>Are you sure you want to restore subscription &quot;{subscriptionToRestore?.name}&quot;?</p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestoreSubscription}>
              Restore Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}