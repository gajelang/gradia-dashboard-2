"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah } from "@/lib/formatters";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "react-hot-toast";
import {
  AlertCircle,
  Calendar,
  CreditCard,
  Package,
  RefreshCw,
  Clock,
  Wallet,
  Building,
  FileText,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  CalendarClock,
} from "lucide-react";
import { Inventory, PaymentStatus } from "@/app/types/inventory";

interface UnpaidItemsSectionProps {
  onPaymentProcessed?: () => void;
}

export default function UnpaidItemsSection({
  onPaymentProcessed,
}: UnpaidItemsSectionProps) {
  const [unpaidItems, setUnpaidItems] = useState<Inventory[]>([]);
  const [partiallyPaidItems, setPartiallyPaidItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState<"unpaid" | "partial">("unpaid");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "subscription" | "inventory">("all");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [selectedFundType, setSelectedFundType] = useState<string>("petty_cash");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Fetch unpaid items
  const fetchUnpaidItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(
        `/api/unpaid-items${typeFilter !== "all" ? `?type=${typeFilter}` : ""}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch unpaid items");
      }

      const data = await response.json();
      setUnpaidItems(data.unpaidItems);
      setPartiallyPaidItems(data.partiallyPaidItems);
    } catch (err) {
      console.error("Error fetching unpaid items:", err);
      setError(err instanceof Error ? err : new Error("Unknown error occurred"));
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUnpaidItems();
  }, [typeFilter]);

  // Filter items based on search term
  const filteredUnpaidItems = unpaidItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPartiallyPaidItems = partiallyPaidItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle payment button click
  const handlePaymentClick = (item: Inventory) => {
    setSelectedItem(item);

    // Set default payment amount based on item type and payment status
    if (item.paymentStatus === "BELUM_BAYAR") {
      setPaymentAmount(item.cost.toString());
    } else if (item.paymentStatus === "DP" && item.remainingAmount) {
      setPaymentAmount(item.remainingAmount.toString());
    }

    // Set default payment description
    setPaymentDescription(`Payment for ${item.type === "SUBSCRIPTION" ? "subscription" : "inventory"}: ${item.name}`);

    setIsPaymentDialogOpen(true);
  };

  // Process payment
  const handleProcessPayment = async () => {
    if (!selectedItem) return;

    try {
      setProcessingPayment(true);

      // Create an expense record for this payment
      const payload = {
        category: selectedItem.type === "SUBSCRIPTION" ? "Subscription" : "Inventory",
        amount: parseFloat(paymentAmount),
        description: paymentDescription,
        date: new Date().toISOString(),
        inventoryId: selectedItem.id,
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

      // Refresh data
      fetchUnpaidItems();

      // Notify parent component
      if (onPaymentProcessed) {
        onPaymentProcessed();
      }
    } catch (err) {
      console.error("Error processing payment:", err);
      toast.error(err instanceof Error ? err.message : "Failed to process payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Not set";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Get item type badge
  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case "SUBSCRIPTION":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Calendar className="h-3 w-3 mr-1" />
            Subscription
          </Badge>
        );
      case "EQUIPMENT":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Package className="h-3 w-3 mr-1" />
            Equipment
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Package className="h-3 w-3 mr-1" />
            Other
          </Badge>
        );
    }
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "LUNAS":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "DP":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      case "BELUM_BAYAR":
      default:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Unpaid
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Item Belum Dibayar
        </CardTitle>
        <CardDescription>
          Item inventaris dan langganan yang memerlukan pembayaran
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari item..."
                className="pl-9 w-[200px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter berdasarkan tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="subscription">Langganan</SelectItem>
                <SelectItem value="inventory">Inventaris</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUnpaidItems}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Memuat...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Segarkan
              </>
            )}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "unpaid" | "partial")}>
          <TabsList className="mb-4">
            <TabsTrigger value="unpaid" className="relative">
              Belum Dibayar
              {unpaidItems.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unpaidItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="partial">
              Dibayar Sebagian
              {partiallyPaidItems.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {partiallyPaidItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unpaid">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Memuat item belum dibayar...</span>
              </div>
            ) : filteredUnpaidItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">Tidak ada item belum dibayar</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Semua item inventaris dan langganan telah dibayar. Kerja bagus!
                </p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Tanggal Pembelian</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnpaidItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                            {item.vendor && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {item.vendor.name}
                              </span>
                            )}
                            {item.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getItemTypeBadge(item.type)}</TableCell>
                        <TableCell>{formatRupiah(item.cost)}</TableCell>
                        <TableCell>{formatDate(item.purchaseDate)}</TableCell>
                        <TableCell>{getPaymentStatusBadge(item.paymentStatus)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePaymentClick(item)}
                            className="flex items-center gap-2"
                          >
                            <CreditCard className="h-4 w-4" />
                            Bayar Sekarang
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="partial">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Memuat item dibayar sebagian...</span>
              </div>
            ) : filteredPartiallyPaidItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">Tidak ada item dibayar sebagian</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Tidak ada item dengan pembayaran sebagian yang perlu diselesaikan.
                </p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Total Biaya</TableHead>
                      <TableHead>Sisa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartiallyPaidItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                            {item.vendor && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {item.vendor.name}
                              </span>
                            )}
                            {item.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getItemTypeBadge(item.type)}</TableCell>
                        <TableCell>{formatRupiah(item.cost)}</TableCell>
                        <TableCell>
                          <span className="text-amber-600 font-medium">
                            {formatRupiah(item.remainingAmount || 0)}
                          </span>
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(item.paymentStatus)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePaymentClick(item)}
                            className="flex items-center gap-2"
                          >
                            <CreditCard className="h-4 w-4" />
                            Selesaikan Pembayaran
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Proses Pembayaran</DialogTitle>
              <DialogDescription>
                Catat pembayaran untuk item ini. Ini akan membuat catatan pengeluaran.
              </DialogDescription>
            </DialogHeader>

            {selectedItem && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Item</p>
                    <p className="text-sm">{selectedItem.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Tipe</p>
                    <p className="text-sm">{selectedItem.type === "SUBSCRIPTION" ? "Langganan" : "Inventaris"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Total Biaya</p>
                    <p className="text-sm font-semibold">{formatRupiah(selectedItem.cost)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Status</p>
                    <p className="text-sm">{selectedItem.paymentStatus === "BELUM_BAYAR" ? "Belum Dibayar" : "Dibayar Sebagian"}</p>
                  </div>
                  {selectedItem.paymentStatus === "DP" && (
                    <>
                      <div>
                        <p className="text-sm font-medium mb-1">Jumlah Dibayar</p>
                        <p className="text-sm">{formatRupiah(selectedItem.downPaymentAmount || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Sisa</p>
                        <p className="text-sm font-semibold text-amber-600">{formatRupiah(selectedItem.remainingAmount || 0)}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Jumlah Pembayaran</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">Rp</span>
                    <Input
                      id="paymentAmount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="pl-8"
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDescription">Deskripsi</Label>
                  <Textarea
                    id="paymentDescription"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    placeholder="Masukkan deskripsi pembayaran"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fundType">Sumber Dana</Label>
                  <Select value={selectedFundType} onValueChange={setSelectedFundType}>
                    <SelectTrigger id="fundType">
                      <SelectValue placeholder="Pilih sumber dana" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petty_cash">Kas Kecil</SelectItem>
                      <SelectItem value="profit_bank">Bank Keuntungan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={handleProcessPayment}
                disabled={processingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex items-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Proses Pembayaran
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
