"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/formatters";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import {
  Calendar,
  CreditCard,
  Edit,
  MoreHorizontal,
  AlertCircle,
  Clock,
  Download,
  ArrowUpDown,
  Building,
  CalendarClock,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { ResourceErrorBoundary } from "./ResourceErrorBoundary";
import SubscriptionTableSkeleton from "./SubscriptionTableSkeleton";
import ResourceEmptyState from "./ResourceEmptyState";
import useSubscriptionData, { Subscription } from "@/hooks/useSubscriptionData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/dateUtils";

export default function ImprovedSubscriptionManagement() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "all">("upcoming");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedFundType, setSelectedFundType] = useState<string>("petty_cash");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Use our custom hook for subscription data
  const {
    subscriptions,
    dueSoon,
    others,
    loading,
    error,
    sortColumn,
    sortDirection,
    toggleSort,
    sortSubscriptions,
    refreshData,
    processPayment,
    isDueSoon,
  } = useSubscriptionData();

  // Handle payment button click
  const handlePaymentClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsPaymentDialogOpen(true);
  };

  // Process payment for a subscription
  const handleProcessPayment = async () => {
    if (!selectedSubscription) return;

    setProcessingPayment(true);
    const success = await processPayment(selectedSubscription, selectedFundType);

    if (success) {
      setIsPaymentDialogOpen(false);
    }

    setProcessingPayment(false);
  };

  // Export subscriptions to CSV
  const exportToCSV = () => {
    const dataToExport = activeTab === "upcoming" ? dueSoon : subscriptions;

    // Create CSV content
    const headers = ["Name", "Vendor", "Next Payment", "Cost", "Billing Cycle", "Status"];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(sub => [
        `"${sub.name.replace(/"/g, '""')}"`,
        `"${sub.vendor?.name || ''}"`,
        sub.nextBillingDate ? `"${formatDate(sub.nextBillingDate)}"` : '',
        sub.cost,
        `"${sub.recurringType || ''}"`,
        `"${sub.paymentStatus === "LUNAS" ? "Paid" :
           sub.paymentStatus === "DP" ? "Partial" :
           "Unpaid"}"`,
      ].join(","))
    ].join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `subscriptions-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get payment status badge variant
  const getPaymentStatusBadge = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "LUNAS":
        return "default";
      case "DP":
        return "secondary";
      default:
        return "destructive";
    }
  };



  // Get formatted date with days remaining
  const getFormattedDate = (dateString?: string | null) => {
    if (!dateString) return "Not set";

    try {
      const date = parseISO(dateString);
      const formattedDate = format(date, "d MMM yyyy", { locale: id });

      // Calculate days remaining
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

      if (diffDays < 0) {
        return `${formattedDate} (Overdue)`;
      } else if (diffDays === 0) {
        return `${formattedDate} (Today)`;
      } else {
        return `${formattedDate} (${diffDays} days)`;
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Get sorted data based on active tab
  const sortedDueSoon = sortSubscriptions(dueSoon);
  const sortedSubscriptions = sortSubscriptions(subscriptions);
  const displayData = activeTab === "upcoming" ? sortedDueSoon : sortedSubscriptions;

  return (
    <ResourceErrorBoundary onReset={refreshData}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upcoming" | "all")}>
            <TabsList className="mb-4">
              <TabsTrigger value="upcoming" className="relative">
                Pembayaran Mendatang
                {dueSoon.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {dueSoon.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">Semua Langganan</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Ekspor CSV
          </Button>
        </div>

        {/* Loading state */}
        {loading ? (
          <SubscriptionTableSkeleton rowCount={5} />
        ) : displayData.length === 0 ? (
          <ResourceEmptyState
            icon={Calendar}
            title={activeTab === "upcoming" ? "Tidak ada pembayaran mendatang" : "Tidak ada langganan ditemukan"}
            description={
              activeTab === "upcoming"
                ? "Anda tidak memiliki langganan yang jatuh tempo dalam 30 hari ke depan."
                : "Anda belum menambahkan langganan apapun."
            }
            actionLabel="Tambah Langganan"
            actionIcon={Calendar}
            onAction={() => document.querySelector<HTMLButtonElement>('[aria-label="Add Inventory Item"]')?.click()}
          />
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableCaption>
                {activeTab === "upcoming"
                  ? "Langganan yang jatuh tempo dalam 30 hari ke depan"
                  : "Daftar semua langganan aktif"}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1 p-0 h-auto font-medium"
                    >
                      Nama
                      {sortColumn === "name" && (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort("nextBillingDate")}
                      className="flex items-center gap-1 p-0 h-auto font-medium"
                    >
                      Pembayaran Berikutnya
                      {sortColumn === "nextBillingDate" && (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort("cost")}
                      className="flex items-center gap-1 p-0 h-auto font-medium"
                    >
                      Biaya
                      {sortColumn === "cost" && (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Siklus Penagihan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((sub) => (
                  <TableRow key={sub.id} className={isDueSoon(sub.nextBillingDate) ? "bg-amber-50" : ""}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{sub.name}</span>
                        {sub.vendor && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {sub.vendor.name}
                          </span>
                        )}
                        {sub.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {sub.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={`flex items-center gap-1 ${
                          isDueSoon(sub.nextBillingDate) ? "text-amber-600 font-medium" : ""
                        }`}>
                          <CalendarClock className="h-3 w-3" />
                          {getFormattedDate(sub.nextBillingDate)}
                        </span>
                        {sub.reminderDays && (
                          <span className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Reminder: {sub.reminderDays} days before
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatRupiah(sub.cost)}</TableCell>
                    <TableCell>{sub.recurringType || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusBadge(sub.paymentStatus)}>
                        {sub.paymentStatus === "LUNAS" ? "Paid" :
                        sub.paymentStatus === "DP" ? "Partial" :
                        "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handlePaymentClick(sub)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Process Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Proses Pembayaran Langganan</DialogTitle>
              <DialogDescription>
                Catat pembayaran untuk langganan ini. Ini akan membuat catatan pengeluaran.
              </DialogDescription>
            </DialogHeader>

            {selectedSubscription && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Langganan</p>
                    <p className="text-sm">{selectedSubscription.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Jumlah</p>
                    <p className="text-sm font-semibold">{formatRupiah(selectedSubscription.cost)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Tanggal Penagihan</p>
                    <p className="text-sm">{formatDate(selectedSubscription.nextBillingDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Vendor</p>
                    <p className="text-sm">{selectedSubscription.vendor?.name || "Tidak ditentukan"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sumber Dana</label>
                  <Select value={selectedFundType} onValueChange={setSelectedFundType}>
                    <SelectTrigger>
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
                disabled={processingPayment}
                className="flex items-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <span className="animate-spin">
                      <Clock className="h-4 w-4" />
                    </span>
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
      </div>
    </ResourceErrorBoundary>
  );
}
