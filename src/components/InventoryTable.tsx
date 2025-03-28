"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";
import {
  ArrowUpDown,
  Edit,
  Search,
  Plus,
  Minus,
  FileText,
  Loader2,
  Archive,
  RefreshCw,
  Package2,
  Calendar,
  AlertTriangle,
  Tag,
  ShoppingBag,
  Check,
  CreditCard,
  Wallet,
  ExternalLink,
  Clock,
  X,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "react-hot-toast";
import UpdateInventoryDialog from "./UpdateInventoryDialog";
import InventoryDetailDialog from "./InventoryDetailDialog";
import UpdateInventoryQuantityDialog from "./UpdateInventoryQuantityDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  category?: string;
  location?: string;
  minimumStock?: number;
  supplier?: string;
  purchaseDate: string;
  expiryDate?: string;
  cost: number;
  paymentStatus?: string;
  isRecurring?: boolean;
  recurringType?: string;
  nextBillingDate?: string;
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

interface InventoryTableProps {
  inventory: InventoryItem[];
  isLoading: boolean;
  isArchived?: boolean;
  onUpdate?: (updatedItem: InventoryItem) => void;
  onArchive?: (item: InventoryItem) => void;
  onRestore?: (item: InventoryItem) => void;
  categories: string[];
  categoryFilter?: string | null;
  searchTerm?: string;
}

type SortField = 'name' | 'category' | 'quantity' | 'unitPrice' | 'totalValue' | 'status' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

export default function InventoryTable({
  inventory,
  isLoading,
  isArchived = false,
  onUpdate,
  onArchive,
  onRestore,
  categories,
  categoryFilter = null,
  searchTerm = '',
}: InventoryTableProps) {
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("increase");
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [confirmArchiveText, setConfirmArchiveText] = useState("");
  const [itemToArchive, setItemToArchive] = useState<InventoryItem | null>(null);
  const [itemToRestore, setItemToRestore] = useState<InventoryItem | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string | null>(categoryFilter);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Use the passed filters or local state
  useEffect(() => {
    setLocalCategoryFilter(categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Filter inventory based on all filters
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...inventory];
      
      // Apply search filter
      if (localSearchTerm) {
        const term = localSearchTerm.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.name.toLowerCase().includes(term) ||
            (item.description && item.description.toLowerCase().includes(term)) ||
            (item.category && item.category.toLowerCase().includes(term)) ||
            (item.supplier && item.supplier.toLowerCase().includes(term)) ||
            (item.location && item.location.toLowerCase().includes(term))
        );
      }
      
      // Apply category filter
      if (localCategoryFilter) {
        filtered = filtered.filter((item) => item.category === localCategoryFilter);
      }
      
      // Apply type filter
      if (typeFilter) {
        filtered = filtered.filter((item) => item.type === typeFilter);
      }
      
      // Apply status filter
      if (statusFilter) {
        filtered = filtered.filter((item) => item.status === statusFilter);
      }
      
      // Apply sorting
      filtered.sort((a, b) => {
        let compareA: string | number | Date = a[sortField] as string | number;
        let compareB: string | number | Date = b[sortField] as string | number;
        
        // Special handling for dates
        if (sortField === 'updatedAt') {
          compareA = new Date(a.updatedAt);
          compareB = new Date(b.updatedAt);
        }
        
        // Handle strings
        if (typeof compareA === 'string' && typeof compareB === 'string') {
          return sortDirection === 'asc'
            ? compareA.localeCompare(compareB)
            : compareB.localeCompare(compareA);
        }
        
        // Handle numbers and dates
        return sortDirection === 'asc'
          ? (compareA as any) - (compareB as any)
          : (compareB as any) - (compareA as any);
      });
      
      setFilteredInventory(filtered);
    };
    
    applyFilters();
  }, [inventory, localSearchTerm, localCategoryFilter, typeFilter, statusFilter, sortField, sortDirection]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Handle archive confirmation
  const handleConfirmArchive = async () => {
    if (!itemToArchive) return;
    if (confirmArchiveText !== "ARCHIVE") {
      toast.error("Please type ARCHIVE to confirm");
      return;
    }
    
    try {
      setArchiving(true);
      const res = await fetchWithAuth("/api/inventory/softDelete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemToArchive.id }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to archive item");
      }
      
      const data = await res.json();
      toast.success("Item archived successfully");
      
      if (onArchive) {
        onArchive(data.item);
      }
      
      setShowArchiveDialog(false);
      setItemToArchive(null);
      setConfirmArchiveText("");
    } catch (error) {
      console.error("Error archiving item:", error);
      toast.error(error instanceof Error ? error.message : "Failed to archive item");
    } finally {
      setArchiving(false);
    }
  };
  
  // Handle restore
  const handleRestore = async () => {
    if (!itemToRestore) return;
    
    try {
      setRestoring(true);
      const res = await fetchWithAuth("/api/inventory/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemToRestore.id }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to restore item");
      }
      
      const data = await res.json();
      toast.success("Item restored successfully");
      
      if (onRestore) {
        onRestore(data.item);
      }
      
      setShowRestoreDialog(false);
      setItemToRestore(null);
    } catch (error) {
      console.error("Error restoring item:", error);
      toast.error(error instanceof Error ? error.message : "Failed to restore item");
    } finally {
      setRestoring(false);
    }
  };

  // Handle quantity adjustment
  const handleQuantityAdjustment = (item: InventoryItem, type: "increase" | "decrease") => {
    setSelectedItem(item);
    setAdjustmentType(type);
    setShowQuantityDialog(true);
  };

  // Handle quantity update
  const handleQuantityUpdated = (updatedItem: InventoryItem) => {
    if (onUpdate) {
      onUpdate(updatedItem);
    }
  };
  
  // Get item type display with icon
  const renderItemType = (type: string) => {
    switch (type) {
      case "EQUIPMENT":
        return (
          <div className="flex items-center gap-1">
            <Package2 className="h-4 w-4 text-blue-500" />
            <span>Equipment</span>
          </div>
        );
      case "SUBSCRIPTION":
        return (
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-purple-500" />
            <span>Subscription</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1">
            <ShoppingBag className="h-4 w-4 text-amber-500" />
            <span>Other</span>
          </div>
        );
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-red-100 text-red-800";
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Get payment status badge
  const getPaymentStatusBadge = (status: string | undefined) => {
    if (!status) return "";
    
    switch (status) {
      case "LUNAS":
        return "bg-green-100 text-green-800";
      case "DP":
        return "bg-blue-100 text-blue-800";
      case "BELUM_BAYAR":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Get payment status display
  const getPaymentStatusDisplay = (status: string | undefined) => {
    if (!status) return "—";
    
    switch (status) {
      case "LUNAS":
        return "Paid";
      case "DP":
        return "Partial";
      case "BELUM_BAYAR":
        return "Unpaid";
      default:
        return status;
    }
  };
  
  // Check if date is within 30 days
  const isUpcomingDate = (dateString: string | undefined) => {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    return date <= thirtyDaysFromNow && date >= today;
  };
  
  // Get days until date
  const getDaysUntil = (dateString: string | undefined) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4" />;
    }
    
    return (
      <ArrowUpDown 
        className={`ml-1 h-4 w-4 transform ${
          sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'
        }`} 
      />
    );
  };
  
  // Reset all filters
  const resetFilters = () => {
    setLocalCategoryFilter(null);
    setLocalSearchTerm("");
    setTypeFilter(null);
    setStatusFilter(null);
  };

  // Skeleton loader
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <Card className="p-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-full max-w-md" />
            </div>
            
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center flex-wrap gap-2">
          <div className="relative mr-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="pl-10 w-[200px]"
            />
          </div>
          
          <Select value={localCategoryFilter || "all"} onValueChange={(value) => setLocalCategoryFilter(value === "all" ? null : value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={typeFilter || "all"} onValueChange={(value) => setTypeFilter(value === "all" ? null : value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="EQUIPMENT">Equipment</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          
          {(localSearchTerm || localCategoryFilter || typeFilter || statusFilter) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={resetFilters}
              title="Clear filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableCaption>
            {isArchived 
              ? "Archived inventory items" 
              : `Showing ${filteredInventory.length} of ${inventory.length} inventory items`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('name')}
                  className="flex items-center p-0 hover:bg-transparent"
                >
                  Item Name {renderSortIndicator('name')}
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('category')}
                  className="flex items-center p-0 hover:bg-transparent"
                >
                  Category {renderSortIndicator('category')}
                </Button>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('quantity')}
                  className="flex items-center justify-end p-0 hover:bg-transparent"
                >
                  Quantity {renderSortIndicator('quantity')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('unitPrice')}
                  className="flex items-center justify-end p-0 hover:bg-transparent"
                >
                  Unit Price {renderSortIndicator('unitPrice')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('totalValue')}
                  className="flex items-center justify-end p-0 hover:bg-transparent"
                >
                  Total Value {renderSortIndicator('totalValue')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('status')}
                  className="flex items-center justify-center p-0 hover:bg-transparent"
                >
                  Status {renderSortIndicator('status')}
                </Button>
              </TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.length > 0 ? (
              filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.expiryDate && (
                        <div className={`text-xs ${
                          new Date(item.expiryDate) < new Date() 
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}>
                          Expires: {formatDate(item.expiryDate)}
                        </div>
                      )}
                      {item.type === "SUBSCRIPTION" && item.nextBillingDate && (
                        <div className={`text-xs ${
                          isUpcomingDate(item.nextBillingDate) 
                            ? "text-yellow-600 font-medium"
                            : "text-muted-foreground"
                        }`}>
                          Next billing: {formatDate(item.nextBillingDate)}
                          {isUpcomingDate(item.nextBillingDate) && getDaysUntil(item.nextBillingDate) !== null && (
                            <span className="text-xs ml-1">
                              (in {getDaysUntil(item.nextBillingDate)} days)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.category ? (
                      <Badge variant="outline" className="font-normal">
                        {item.category}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{renderItemType(item.type)}</TableCell>
                  <TableCell className="text-right">
                    {item.type === "SUBSCRIPTION" ? (
                      <Badge 
                        className={getPaymentStatusBadge(item.paymentStatus)}
                      >
                        {getPaymentStatusDisplay(item.paymentStatus)}
                      </Badge>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className={item.quantity <= (item.minimumStock || 0) && item.quantity > 0 ? "text-red-600 font-bold" : ""}>
                          {item.quantity}
                        </span>
                        {item.minimumStock && item.quantity <= item.minimumStock && item.quantity > 0 && (
                          <span className="text-xs text-red-600">
                            Low Stock
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    Rp{formatRupiah(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    Rp{formatRupiah(item.totalValue)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      className={getStatusBadge(item.status)}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center space-x-1">
                      {!isArchived ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            
                            {item.type !== "SUBSCRIPTION" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleQuantityAdjustment(item, "increase")}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleQuantityAdjustment(item, "decrease")}
                                  disabled={item.quantity <= 0}
                                >
                                  <Minus className="h-4 w-4 mr-2" />
                                  Reduce Stock
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            
                            <DropdownMenuItem
                              onClick={() => {
                                // Open update dialog through UpdateInventoryDialog component
                                document.getElementById(`update-inventory-${item.id}`)?.click();
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Item
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onClick={() => {
                                // Open details dialog through InventoryDetailDialog component
                                document.getElementById(`view-inventory-${item.id}`)?.click();
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setItemToArchive(item);
                                setConfirmArchiveText("");
                                setShowArchiveDialog(true);
                              }}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setItemToRestore(item);
                            setShowRestoreDialog(true);
                          }}
                          title="Restore item"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Hidden button triggers for update and view dialogs */}
                      <div className="hidden">
                        <UpdateInventoryDialog
                          item={item}
                          categories={categories}
                          onItemUpdated={onUpdate}
                          triggerId={`update-inventory-${item.id}`}
                        />
                        
                        <InventoryDetailDialog
                          item={item}
                          triggerId={`view-inventory-${item.id}`}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No {isArchived ? "archived" : "active"} inventory items found
                  {(localSearchTerm || localCategoryFilter || typeFilter || statusFilter) ? (
                    <p className="mt-2">Try adjusting your search or filter criteria.</p>
                  ) : null}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Quantity dialog */}
      {showQuantityDialog && selectedItem && (
        <UpdateInventoryQuantityDialog
          isOpen={showQuantityDialog}
          onClose={() => setShowQuantityDialog(false)}
          item={selectedItem}
          adjustmentType={adjustmentType}
          onQuantityUpdated={handleQuantityUpdated}
        />
      )}
      
      {/* Archive confirmation dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Inventory Item</DialogTitle>
            <DialogDescription>
              This will move the item to the archive. You can restore it later if needed.
            </DialogDescription>
          </DialogHeader>
          
          {itemToArchive && (
            <div className="py-4">
              <p className="font-medium">{itemToArchive.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Type "ARCHIVE" below to confirm
              </p>
              <Input
                className="mt-2"
                value={confirmArchiveText}
                onChange={(e) => setConfirmArchiveText(e.target.value)}
                placeholder="Type ARCHIVE to confirm"
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)} disabled={archiving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmArchive} disabled={archiving || confirmArchiveText !== "ARCHIVE"}>
              {archiving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Item
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Restore confirmation dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Inventory Item</DialogTitle>
            <DialogDescription>
              This will restore the item from the archive to the active inventory.
            </DialogDescription>
          </DialogHeader>
          
          {itemToRestore && (
            <div className="py-4">
              <p className="font-medium">{itemToRestore.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Are you sure you want to restore this item?
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)} disabled={restoring}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleRestore} disabled={restoring} className="bg-green-600 hover:bg-green-700">
              {restoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restore Item
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}