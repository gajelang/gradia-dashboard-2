"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Calendar, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InventoryItem } from "./InventoryTab";
import { fetchWithAuth } from "@/lib/api";
import { formatRupiah } from "@/lib/formatters";

interface InventoryDetailDialogProps {
  item: InventoryItem;
}

interface InventoryAdjustment {
  id: string;
  adjustmentType: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  notes: string | null;
  adjustedAt: string;
  adjustedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function InventoryDetailDialog({ item }: InventoryDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(false);
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);

  // Format dates for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Format timestamps for display
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get human-readable reason from adjustment
  const getReadableReason = (reason: string | null) => {
    if (!reason) return "—";
    
    const reasonMap: Record<string, string> = {
      purchase: "New Purchase",
      sales: "Sales/Usage",
      damaged: "Damaged/Defective",
      returned: "Customer Return",
      correction: "Inventory Correction",
      other: "Other",
    };
    
    return reasonMap[reason] || reason;
  };

  // Fetch adjustment history when the dialog opens and the tab is "history"
  useEffect(() => {
    if (open && activeTab === "history" && adjustments.length === 0 && !isLoadingAdjustments) {
      fetchAdjustmentHistory();
    }
  }, [open, activeTab]);

  const fetchAdjustmentHistory = async () => {
    setIsLoadingAdjustments(true);
    setAdjustmentsError(null);
    
    try {
      const res = await fetchWithAuth(`/api/inventory/adjustment?inventoryId=${item.id}`, {
        cache: "no-store",
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch adjustment history");
      }
      
      const data = await res.json();
      setAdjustments(data);
    } catch (error) {
      console.error("Error fetching adjustment history:", error);
      setAdjustmentsError(
        error instanceof Error ? error.message : "An error occurred while fetching the adjustment history"
      );
    } finally {
      setIsLoadingAdjustments(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="View details"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{item.name}</span>
            {item.quantity <= (item.minimumStock || 0) && (
              <Badge variant="destructive" className="ml-2">
                Low Stock
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            View detailed information about this inventory item
          </DialogDescription>
        </DialogHeader>
        
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-grow overflow-hidden flex flex-col"
        >
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="details">Item Details</TabsTrigger>
            <TabsTrigger value="history">Adjustment History</TabsTrigger>
          </TabsList>
          
          <TabsContent 
            value="details" 
            className="flex-grow overflow-y-auto p-1"
          >
            <div className="space-y-6">
              {/* Basic Info Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Category</dt>
                      <dd className="font-medium">{item.category || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="font-medium">{item.location || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Current Quantity</dt>
                      <dd className={`font-medium ${
                        item.quantity <= (item.minimumStock || 0) ? "text-red-600" : ""
                      }`}>
                        {item.quantity} {item.minimumStock ? `(Min: ${item.minimumStock})` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Unit Price</dt>
                      <dd className="font-medium">Rp{formatRupiah(item.unitPrice)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Total Value</dt>
                      <dd className="font-medium">Rp{formatRupiah(item.totalValue)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Supplier</dt>
                      <dd className="font-medium">{item.supplier || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Purchase Date</dt>
                      <dd className="font-medium">{formatDate(item.purchaseDate)}</dd>
                    </div>
                  </dl>
                  
                  {item.description && (
                    <>
                      <Separator className="my-3" />
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">Description</h4>
                        <p className="text-sm">{item.description}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Metadata Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Created By</dt>
                      <dd className="font-medium">
                        {item.createdBy ? item.createdBy.name : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Created At</dt>
                      <dd className="font-medium">{formatDate(item.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Last Updated By</dt>
                      <dd className="font-medium">
                        {item.updatedBy ? item.updatedBy.name : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Last Updated At</dt>
                      <dd className="font-medium">{formatDate(item.updatedAt)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent 
            value="history" 
            className="flex-grow overflow-y-auto p-1"
          >
            {isLoadingAdjustments ? (
              <div className="flex flex-col items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading adjustment history...</p>
              </div>
            ) : adjustmentsError ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
                <p className="text-muted-foreground">Unable to load adjustment history</p>
                <p className="text-sm text-muted-foreground">{adjustmentsError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={fetchAdjustmentHistory}
                >
                  Try Again
                </Button>
              </div>
            ) : adjustments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No adjustment history found for this item</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Previous</TableHead>
                      <TableHead className="text-right">New</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Adjusted By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatTimestamp(adjustment.adjustedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={adjustment.adjustmentType === "increase" ? "default" : "destructive"}
                          >
                            {adjustment.adjustmentType === "increase" ? "Increase" : "Decrease"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {adjustment.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {adjustment.previousQuantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {adjustment.newQuantity}
                        </TableCell>
                        <TableCell>
                          {getReadableReason(adjustment.reason)}
                        </TableCell>
                        <TableCell>
                          {adjustment.adjustedBy?.name || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* If there are adjustments and notes, show them in a separate section */}
            {adjustments.length > 0 && adjustments.some(adj => adj.notes) && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Adjustment Notes</h3>
                <div className="space-y-3">
                  {adjustments
                    .filter(adj => adj.notes)
                    .map(adj => (
                      <Card key={`notes-${adj.id}`} className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={adj.adjustmentType === "increase" ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {adj.adjustmentType === "increase" ? "Increase" : "Decrease"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(adj.adjustedAt)}
                              </span>
                            </div>
                            <span className="text-xs font-medium">
                              {getReadableReason(adj.reason)}
                            </span>
                          </div>
                          <p className="text-sm">{adj.notes}</p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}