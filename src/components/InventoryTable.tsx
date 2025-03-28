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
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import UpdateInventoryDialog from "./UpdateInventoryDialog";
import InventoryDetailDialog from "./InventoryDetailDialog";

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

interface InventoryTableProps {
  inventory: InventoryItem[];
  isLoading: boolean;
  isArchived?: boolean;
  onUpdate?: (updatedItem: InventoryItem) => void;
  onArchive?: (item: InventoryItem) => void;
  onRestore?: (item: InventoryItem) => void;
  categories: string[];
}

type SortField = 'name' | 'category' | 'quantity' | 'unitPrice' | 'totalValue' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

export default function InventoryTable({
  inventory,
  isLoading,
  isArchived = false,
  onUpdate,
  onArchive,
  onRestore,
  categories,
}: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("increase");

  useEffect(() => {
    filterInventory();
  }, [inventory, searchTerm, categoryFilter, sortField, sortDirection]);

  const filterInventory = () => {
    let filtered = [...inventory];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          (item.description && item.description.toLowerCase().includes(term)) ||
          (item.category && item.category.toLowerCase().includes(term)) ||
          (item.supplier && item.supplier.toLowerCase().includes(term))
      );
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareA: string | number | Date = a[sortField] as string | number;
      let compareB: string | number | Date = b[sortField] as string | number;

      // Handle dates
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

  const handleSearch = () => {
    filterInventory();
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value === "all" ? "" : value);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleQuantityAdjustment = (item: InventoryItem, type: "increase" | "decrease") => {
    setSelectedItem(item);
    setAdjustmentType(type);
    setShowQuantityDialog(true);
  };


  const handleQuantityUpdated = (updatedItem: InventoryItem) => {
    if (onUpdate) {
      onUpdate(updatedItem);
    }
  };

  // Helper function to render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    
    return (
      <ArrowUpDown className={`ml-1 h-4 w-4 inline ${
        sortDirection === 'asc' ? 'transform rotate-180' : ''
      }`} />
    );
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Inventory Items</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex-1 flex items-center gap-2">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="border rounded-md p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">Loading inventory items...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Inventory Items</h2>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
          
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableCaption>
            {isArchived ? "List of archived inventory items" : "List of active inventory items"}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="w-[250px] cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Item Name {renderSortIndicator('name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center">
                  Category {renderSortIndicator('category')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer"
                onClick={() => handleSort('quantity')}
              >
                <div className="flex items-center justify-end">
                  Quantity {renderSortIndicator('quantity')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer"
                onClick={() => handleSort('unitPrice')}
              >
                <div className="flex items-center justify-end">
                  Unit Price {renderSortIndicator('unitPrice')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer"
                onClick={() => handleSort('totalValue')}
              >
                <div className="flex items-center justify-end">
                  Total Value {renderSortIndicator('totalValue')}
                </div>
              </TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.length > 0 ? (
              filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category || "—"}</TableCell>
                  <TableCell className="text-right">
                    <span className={item.quantity <= (item.minimumStock || 0) ? "text-red-500 font-bold" : ""}>
                      {item.quantity}
                    </span>
                    {item.minimumStock && item.quantity <= item.minimumStock && (
                      <Badge variant="outline" className="ml-2 bg-red-50 text-red-800">
                        Low Stock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    Rp{formatRupiah(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    Rp{formatRupiah(item.totalValue)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center space-x-1">
                      {!isArchived && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Increase quantity"
                            onClick={() => handleQuantityAdjustment(item, "increase")}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Decrease quantity"
                            disabled={item.quantity <= 0}
                            onClick={() => handleQuantityAdjustment(item, "decrease")}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <UpdateInventoryDialog
                            item={item}
                            categories={categories}
                            onItemUpdated={onUpdate}
                          />
                        </>
                      )}
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InventoryDetailDialog item={item} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View details</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {!isArchived && onArchive && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => onArchive(item)}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Archive item</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {isArchived && onRestore && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => onRestore(item)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Restore item</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No {isArchived ? "archived" : "active"} inventory items found
                  {searchTerm || categoryFilter ? (
                    <p className="mt-2">Try adjusting your search or filter criteria.</p>
                  ) : null}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Item count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredInventory.length} of {inventory.length} items
        {categoryFilter && ` in category "${categoryFilter}"`}
        {searchTerm && ` matching "${searchTerm}"`}
      </div>
      
      {/* Quantity Adjustment Dialog would go here */}
      {/* {showQuantityDialog && selectedItem && (
        <UpdateInventoryQuantityDialog
          isOpen={showQuantityDialog}
          onClose={() => setShowQuantityDialog(false)}
          item={selectedItem}
          adjustmentType={adjustmentType}
          onQuantityUpdated={handleQuantityUpdated}
        />
      )} */}
    </div>
  );
}