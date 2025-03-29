"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Search,
  Calendar,
  X,
  Loader2,
  Archive,
  Eye,
  RefreshCw,
  User,
  ExternalLink,
  Info,
  Store,
  DollarSign,
  Link as LinkIcon,
  Wallet,
  CreditCard
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
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
import { formatRupiah } from "@/lib/formatters";
import UpdateStatusDialog from "@/components/UpdateStatusDialog";
import UpdateTransactionDialog from "@/components/UpdateTransactionDialog";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Extended Transaction interface to include creator and audit info
interface Transaction {
  paymentProofLink?: string | null;
  id: string;
  name: string;
  description: string;
  amount: number;
  projectValue?: number;
  totalProfit?: number;
  downPaymentAmount?: number;
  remainingAmount?: number;
  paymentStatus: string;
  date: string;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  capitalCost?: number;
  isDeleted?: boolean;
  clientId?: string;
  vendorIds?: string[];
  picId?: string;
  fundType?: string; // Added fund type field
  client?: {
    id: string;
    name: string;
    code: string;
  };
  vendors?: {
    id: string;
    name: string;
    serviceDesc: string;
  }[];
  pic?: {
    id: string;
    name: string;
    email: string;
  };
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
  deletedBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

// Interface Expense
interface Expense {
  vendorId: string;
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  paymentProofLink?: string | null;
  transactionId?: string;
  fundType?: string; // Added fund type field
  isDeleted?: boolean;
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
  deletedBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

type SortDirection = "asc" | "desc" | null;
type SortField =
  | "name"
  | "amount"
  | "projectValue"
  | "paymentStatus"
  | "date"
  | "capitalCost"
  | "createdBy"
  | null;

interface DateFilter {
  month: number | null;
  year: number | null;
}

// Get broadcast status based on start and end dates
function getBroadcastStatus(tx: Transaction): string {
  const now = new Date();
  if (tx.startDate) {
    const start = new Date(tx.startDate);
    if (now < start) {
      return "Belum Dimulai";
    }
  }
  if (tx.endDate) {
    const end = new Date(tx.endDate);
    const diff = end.getTime() - now.getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (diff < 0) return "Berakhir";
    if (diff < oneWeek) return "Akan Berakhir";
    return "Aktif";
  }
  return "Aktif";
}

// Broadcast status indicator component
function BroadcastIndicator({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) {
  const status = getBroadcastStatus({ startDate, endDate } as Transaction);
  let bgColor = "";
  switch (status) {
    case "Belum Dimulai":
      bgColor = "bg-blue-500";
      break;
    case "Berakhir":
      bgColor = "bg-neutral-500";
      break;
    case "Akan Berakhir":
      bgColor = "bg-yellow-500";
      break;
    case "Aktif":
      bgColor = "bg-green-500";
      break;
    default:
      bgColor = "bg-gray-500";
  }
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium text-white ${bgColor}`}
    >
      {status}
    </span>
  );
}

export default function TransactionTable() {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deletedTransactions, setDeletedTransactions] = useState<Transaction[]>(
    []
  );
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Transaction[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    month: null,
    year: null,
  });
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [broadcastFilter, setBroadcastFilter] = useState("Semua");
  const [loading, setLoading] = useState(true);

  // State for transaction deletion
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");

  // State for restore deleted transaction
  const [transactionToRestore, setTransactionToRestore] =
    useState<Transaction | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // View mode state (active or deleted transactions)
  const [viewMode, setViewMode] = useState<"active" | "deleted">("active");

  // State for transaction expenses
  const [transactionExpenses, setTransactionExpenses] = useState<Expense[]>([]);
  const [activeExpenses, setActiveExpenses] = useState<Expense[]>([]);
  const [archivedExpenses, setArchivedExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // State for transaction detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailTransaction, setSelectedDetailTransaction] =
    useState<Transaction | null>(null);
  const [detailViewTab, setDetailViewTab] = useState<string>("details");

  // Function to render Fund Type Indicator Badge
  const getFundTypeDisplay = (fundType?: string) => {
    const type = fundType || "petty_cash";
    if (type === "petty_cash") {
      return (
        <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
          <Wallet className="h-3 w-3 mr-1" />
          Petty Cash
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
          <CreditCard className="h-3 w-3 mr-1" />
          Profit Bank
        </span>
      );
    }
  };

  // -------------------------------------------------------------
  // 1) Define fetchTransactionsAndExpenses ABOVE the effect:
  // -------------------------------------------------------------
  const fetchTransactionsAndExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const queryParam = viewMode === "deleted" ? "?deleted=true" : "";
      const resTransactions = await fetchWithAuth(
        `/api/transactions${queryParam}`,
        {
          cache: "no-store",
        }
      );

      if (!resTransactions.ok) throw new Error("Gagal mengambil data transaksi");
      const transactionsData = await resTransactions.json();

      // Make sure we only set active transactions in active view and deleted in deleted view
      if (viewMode === "active") {
        const activeTransactions = transactionsData.filter(
          (tx: { isDeleted: boolean }) => !tx.isDeleted
        );
        setTransactions(activeTransactions);
        setFilteredTransactions(activeTransactions);
      } else {
        const deletedTxs = transactionsData.filter(
          (tx: { isDeleted: boolean }) => tx.isDeleted
        );
        setDeletedTransactions(deletedTxs);
        setFilteredTransactions(deletedTxs);
      }

      // Extract available years from data with proper typing
      const years = [
        ...new Set(
          transactionsData.map((tx: { date: string }) =>
            new Date(tx.date).getFullYear()
          )
        ),
      ] as number[];
      setAvailableYears(years.sort((a, b) => b - a));
    } catch (error) {
      console.error("Error mengambil data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
    // Only re-run if viewMode changes
  }, [viewMode]);

  // -------------------------------------------------------------
  // 2) Now useEffect that calls it:
  // -------------------------------------------------------------
  useEffect(() => {
    fetchTransactionsAndExpenses();
  }, [fetchTransactionsAndExpenses]);

  // Fetch transaction expenses
  const fetchTransactionExpenses = async (transactionId: string) => {
    try {
      setLoadingExpenses(true);

      console.log(`Fetching expenses for transaction: ${transactionId}`);

      const res = await fetchWithAuth(
        `/api/transactions/expenses?transactionId=${transactionId}&includeArchived=true`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        console.error(`Error response from /api/transactions/expenses: ${res.status}`);
        throw new Error("Failed to fetch transaction expenses");
      }

      let data;
      try {
        data = await res.json();
      } catch (e) {
        console.error("Error parsing response:", e);
        throw new Error("Failed to parse expense data");
      }

      setTransactionExpenses(data.expenses || []);
      setActiveExpenses(data.activeExpenses || []);
      setArchivedExpenses(data.archivedExpenses || []);

      // Update capital cost in the selected transaction
      if (selectedDetailTransaction && data.totalCapitalCost !== undefined) {
        setSelectedDetailTransaction({
          ...selectedDetailTransaction,
          capitalCost: data.totalCapitalCost,
        });

        // Update transactions in main lists
        setTransactions((prevTransactions) =>
          prevTransactions.map((tx) =>
            tx.id === transactionId ? { ...tx, capitalCost: data.totalCapitalCost } : tx
          )
        );

        setFilteredTransactions((prevTransactions) =>
          prevTransactions.map((tx) =>
            tx.id === transactionId ? { ...tx, capitalCost: data.totalCapitalCost } : tx
          )
        );
      }
    } catch (error) {
      console.error("Error fetching transaction expenses:", error);
      toast.error(
        `Failed to load expenses: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );

      setTransactionExpenses([]);
      setActiveExpenses([]);
      setArchivedExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  // Delete transaction
  const softDeleteTransaction = async () => {
    if (!transactionToDelete || !transactionToDelete.id) {
      toast.error("Cannot delete: No transaction selected");
      return false;
    }

    try {
      toast.loading("Archiving transaction...", { id: "deleteTransaction" });

      const response = await fetchWithAuth("/api/transactions/softDelete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: transactionToDelete.id,
          deletedBy: user?.userId,
        }),
      });

      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch {
        console.warn("Could not parse response as JSON");
        data = { message: "Transaction archived" };
      }

      if (!response.ok) {
        throw new Error(data?.message || `Server returned ${response.status}`);
      }

      toast.success(data?.message || "Transaction archived successfully", {
        id: "deleteTransaction",
      });

      // Remove from transactions list and update filtered list
      setTransactions((prev) => prev.filter((t) => t.id !== transactionToDelete.id));
      setFilteredTransactions((prev) =>
        prev.filter((t) => t.id !== transactionToDelete.id)
      );

      setDeleteDialogOpen(false);
      setTransactionToDelete(null);

      // Refresh data to ensure everything is in sync
      fetchTransactionsAndExpenses();

      return true;
    } catch (error) {
      console.error("Error in softDeleteTransaction:", error);

      let errorMessage = "Failed to archive transaction";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: "deleteTransaction" });
      return false;
    }
  };

  // Restore transaction
  const restoreTransaction = async () => {
    if (!transactionToRestore) {
      toast.error("No transaction selected for restoration");
      return;
    }

    try {
      toast.loading("Restoring transaction...", { id: "restoreTransaction" });

      const res = await fetchWithAuth("/api/transactions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: transactionToRestore.id,
          restoredBy: user?.userId,
        }),
      });

      let data;
      try {
        const responseText = await res.text();
        data = JSON.parse(responseText);
      } catch {
        console.warn("Could not parse response as JSON");
        data = { message: "Transaction restored" };
      }

      if (!res.ok) {
        throw new Error(data?.message || `Server returned ${res.status}`);
      }

      toast.success(data?.message || "Transaction restored successfully", {
        id: "restoreTransaction",
      });

      // Remove the transaction from deleted list
      setDeletedTransactions((prev) =>
        prev.filter((t) => t.id !== transactionToRestore.id)
      );
      setFilteredTransactions((prev) =>
        prev.filter((t) => t.id !== transactionToRestore.id)
      );

      // Refresh both active and deleted transaction lists
      fetchTransactionsAndExpenses();

      setRestoreDialogOpen(false);
      setTransactionToRestore(null);
    } catch (error) {
      console.error("Error restoring transaction:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to restore transaction",
        { id: "restoreTransaction" }
      );
    }
  };

  // Filter and sort transactions
  useEffect(() => {
    let result =
      viewMode === "active" ? [...transactions] : [...deletedTransactions];

    // Filter by date
    if (dateFilter.month !== null || dateFilter.year !== null) {
      result = result.filter((tx) => {
        const txDate = new Date(tx.date);
        const txMonth = txDate.getMonth();
        const txYear = txDate.getFullYear();

        if (dateFilter.month !== null && dateFilter.year !== null) {
          return txMonth === dateFilter.month && txYear === dateFilter.year;
        } else if (dateFilter.month !== null) {
          return txMonth === dateFilter.month;
        } else if (dateFilter.year !== null) {
          return txYear === dateFilter.year;
        }
        return true;
      });
    }

    // Filter by broadcast status
    if (broadcastFilter !== "Semua") {
      result = result.filter((tx) => getBroadcastStatus(tx) === broadcastFilter);
    }

    // Sort transactions
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        if (sortField === "date") {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return sortDirection === "asc"
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        } else if (["amount", "projectValue", "capitalCost"].includes(sortField)) {
          const valueA = a[sortField] || 0;
          const valueB = b[sortField] || 0;
          return sortDirection === "asc"
            ? Number(valueA) - Number(valueB)
            : Number(valueB) - Number(valueA);
        } else if (sortField === "createdBy") {
          const nameA = a.createdBy?.name || "";
          const nameB = b.createdBy?.name || "";
          return sortDirection === "asc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        } else {
          const valueA = String(a[sortField] || "").toLowerCase();
          const valueB = String(b[sortField] || "").toLowerCase();
          return sortDirection === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }
      });
    }

    setFilteredTransactions(result);
  }, [
    transactions,
    deletedTransactions,
    sortField,
    sortDirection,
    dateFilter,
    broadcastFilter,
    viewMode,
  ]);

  // Search function
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const lowerCaseSearch = searchTerm.toLowerCase();
    const dataToSearch = viewMode === "active" ? transactions : deletedTransactions;

    const results = dataToSearch.filter(
      (tx) =>
        tx.name.toLowerCase().includes(lowerCaseSearch) ||
        tx.description.toLowerCase().includes(lowerCaseSearch) ||
        (tx.email && tx.email.toLowerCase().includes(lowerCaseSearch)) ||
        (tx.phone && tx.phone.toLowerCase().includes(lowerCaseSearch)) ||
        tx.paymentStatus.toLowerCase().includes(lowerCaseSearch) ||
        tx.amount.toString().includes(lowerCaseSearch) ||
        (tx.createdBy?.name &&
          tx.createdBy.name.toLowerCase().includes(lowerCaseSearch))
    );

    setSearchResults(results);
    setShowSearchResults(true);
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Month filter handler
  const handleMonthChange = (value: string) => {
    setDateFilter((prev) => ({
      ...prev,
      month: value === "all" ? null : parseInt(value),
    }));
  };

  // Year filter handler
  const handleYearChange = (value: string) => {
    setDateFilter((prev) => ({
      ...prev,
      year: value === "all" ? null : parseInt(value),
    }));
  };

  // Broadcast status filter handler
  const handleBroadcastFilterChange = (value: string) => {
    setBroadcastFilter(value);
  };

  // Clear all filters
  const clearFilters = () => {
    setDateFilter({ month: null, year: null });
    setSortField(null);
    setSortDirection(null);
    setBroadcastFilter("Semua");
  };

  // Handle transaction row click to open detail modal
  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedDetailTransaction(transaction);
    setDetailViewTab("details");

    // If transaction has already been selected, reuse the expenses
    if (
      selectedDetailTransaction?.id === transaction.id &&
      transactionExpenses.length > 0
    ) {
      setDetailModalOpen(true);
      return;
    }

    // Otherwise fetch expenses before opening modal
    fetchTransactionExpenses(transaction.id);
    setDetailModalOpen(true);
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format date and time
  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Lunas":
        return "bg-green-100 text-green-800";
      case "DP":
        return "bg-yellow-100 text-yellow-800";
      case "Belum Bayar":
      default:
        return "bg-red-100 text-red-800";
    }
  };

  // Calculate net profit (totalProfit - capitalCost)
  const calculateNetProfit = (transaction: Transaction) => {
    const totalProfit = transaction.totalProfit || transaction.projectValue || 0;
    const capitalCost = transaction.capitalCost || 0;
    return totalProfit - capitalCost;
  };

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Transaksi</h2>

        {/* View Toggle */}
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as "active" | "deleted")}
          className="w-[400px]"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Transaksi Aktif
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Arsip Transaksi
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Dialog open={showSearchResults} onOpenChange={setShowSearchResults}>
            <DialogTrigger asChild>
              <Button onClick={handleSearch}>Cari</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Hasil Pencarian</DialogTitle>
              </DialogHeader>
              {searchResults.length > 0 ? (
                <div className="max-h-[60vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Fund</TableHead>
                        <TableHead>Nilai Proyek</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((tx) => (
                        <TableRow
                          key={tx.id}
                          className={`${
                            tx.isDeleted ? "bg-gray-50" : ""
                          } hover:bg-gray-100 cursor-pointer`}
                          onClick={() => {
                            setShowSearchResults(false);
                            handleTransactionClick(tx);
                          }}
                        >
                          <TableCell className="font-medium">{tx.name}</TableCell>
                          <TableCell>{getFundTypeDisplay(tx.fundType)}</TableCell>
                          <TableCell>
                            Rp{formatRupiah(tx.projectValue || 0)}
                          </TableCell>
                          <TableCell>{tx.paymentStatus}</TableCell>
                          <TableCell>{formatDate(tx.date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6">
                  Tidak ada transaksi yang cocok.
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setShowSearchResults(false)}>Tutup</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              onValueChange={handleMonthChange}
              value={dateFilter.month?.toString() || "all"}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {monthNames.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select
            onValueChange={handleYearChange}
            value={dateFilter.year?.toString() || "all"}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={handleBroadcastFilterChange}
            value={broadcastFilter}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status Siar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua</SelectItem>
              <SelectItem value="Belum Dimulai">Belum Dimulai</SelectItem>
              <SelectItem value="Aktif">Aktif</SelectItem>
              <SelectItem value="Akan Berakhir">Akan Berakhir</SelectItem>
              <SelectItem value="Berakhir">Berakhir</SelectItem>
            </SelectContent>
          </Select>

          {(dateFilter.month !== null ||
            dateFilter.year !== null ||
            sortField !== null ||
            broadcastFilter !== "Semua") && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Hapus filter">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2">Memuat data...</span>
        </div>
      )}

      {/* Simplified Transaction Table */}
      <Table>
        <TableCaption>
          {viewMode === "active"
            ? "Daftar transaksi aktif"
            : "Daftar transaksi yang telah diarsip"}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("name")}
                className="flex items-center p-0 hover:bg-transparent"
              >
                Nama {getSortIcon("name")}
              </Button>
            </TableHead>
            <TableHead>Fund</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("projectValue")}
                className="flex items-center p-0 hover:bg-transparent"
              >
                Nilai {getSortIcon("projectValue")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("paymentStatus")}
                className="flex items-center p-0 hover:bg-transparent"
              >
                Status Bayar {getSortIcon("paymentStatus")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("date")}
                className="flex items-center p-0 hover:bg-transparent"
              >
                Tanggal {getSortIcon("date")}
              </Button>
            </TableHead>
            <TableHead>Periode Siar</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTransactions.map((tx) => (
            <TableRow
              key={tx.id}
              className={`${
                tx.isDeleted ? "bg-gray-50" : ""
              } hover:bg-gray-100 cursor-pointer`}
              onClick={() => handleTransactionClick(tx)}
            >
              <TableCell className="font-medium">
                {tx.name}
                {tx.description && (
                  <div className="text-xs text-muted-foreground truncate max-w-xs">
                    {tx.description}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {getFundTypeDisplay(tx.fundType)}
              </TableCell>
              <TableCell>
                <div>Rp{formatRupiah(tx.projectValue || 0)}</div>
                <div className="text-xs text-muted-foreground">
                  Net: Rp{formatRupiah(calculateNetProfit(tx))}
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentStatusColor(
                    tx.paymentStatus
                  )}`}
                >
                  {tx.paymentStatus}
                </span>
              </TableCell>
              <TableCell>{formatDate(tx.date)}</TableCell>
              <TableCell>
                {tx.startDate || tx.endDate ? (
                  <div className="text-xs flex flex-col gap-1">
                    <BroadcastIndicator
                      startDate={tx.startDate}
                      endDate={tx.endDate}
                    />
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell
                className="text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-end gap-1">
                  {viewMode === "active" ? (
                    <>
                      <UpdateTransactionDialog
                        transaction={tx}
                        onTransactionUpdated={() => {
                          fetchTransactionsAndExpenses();
                        }}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setTransactionToDelete(tx);
                          setConfirmDeleteText("");
                          setDeleteDialogOpen(true);
                        }}
                        title="Archive Transaction"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTransactionToRestore(tx);
                        setRestoreDialogOpen(true);
                      }}
                      className="text-green-600"
                      title="Restore Transaction"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filteredTransactions.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6">
                {dateFilter.month !== null ||
                dateFilter.year !== null ||
                broadcastFilter !== "Semua"
                  ? "Tidak ada transaksi untuk periode yang dipilih."
                  : viewMode === "active"
                  ? "Tidak ada transaksi aktif."
                  : "Tidak ada transaksi terarsip."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Transaction Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>

          {selectedDetailTransaction && (
            <div className="flex flex-col h-full">
              <Tabs value={detailViewTab} onValueChange={setDetailViewTab}>
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="details">Informasi Transaksi</TabsTrigger>
                  <TabsTrigger value="expenses">
                    Biaya Modal
                    {(activeExpenses?.length > 0 || archivedExpenses?.length > 0) && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                        Rp{formatRupiah(selectedDetailTransaction.capitalCost || 0)}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <div className="max-h-[calc(90vh-150px)] overflow-y-auto py-4">
                  <TabsContent value="details">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold flex items-center">
                            <Info className="h-5 w-5 mr-2 text-primary" />
                            Informasi Dasar
                          </h3>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="text-sm font-medium">Nama:</div>
                            <div className="text-sm col-span-2">
                              {selectedDetailTransaction.name}
                            </div>

                            <div className="text-sm font-medium">Deskripsi:</div>
                            <div className="text-sm col-span-2">
                              {selectedDetailTransaction.description || "-"}
                            </div>

                            <div className="text-sm font-medium">Tanggal:</div>
                            <div className="text-sm col-span-2">
                              {formatDate(selectedDetailTransaction.date)}
                            </div>
                          </div>
                        </div>

                        {/* Financial Information */}
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold flex items-center">
                            <DollarSign className="h-5 w-5 mr-2 text-primary" />
                            Informasi Keuangan
                          </h3>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="text-sm font-medium">Fund:</div>
                            <div className="text-sm col-span-2">
                              {getFundTypeDisplay(selectedDetailTransaction.fundType)}
                            </div>

                            <div className="text-sm font-medium">Nilai Proyek:</div>
                            <div className="text-sm col-span-2">
                              Rp{formatRupiah(selectedDetailTransaction.projectValue || 0)}
                            </div>

                            <div className="text-sm font-medium">Biaya Modal:</div>
                            <div className="text-sm col-span-2">
                              Rp{formatRupiah(selectedDetailTransaction.capitalCost || 0)}
                            </div>

                            <div className="text-sm font-medium">Net Profit:</div>
                            <div className="text-sm col-span-2">
                              Rp{formatRupiah(
                                calculateNetProfit(selectedDetailTransaction)
                              )}
                            </div>

                            <div className="text-sm font-medium">Status Pembayaran:</div>
                            <div className="text-sm col-span-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentStatusColor(
                                  selectedDetailTransaction.paymentStatus
                                )}`}
                              >
                                {selectedDetailTransaction.paymentStatus}
                              </span>
                            </div>

                            {selectedDetailTransaction.paymentStatus === "DP" && (
                              <>
                                <div className="text-sm font-medium">DP Amount:</div>
                                <div className="text-sm col-span-2">
                                  Rp{formatRupiah(
                                    selectedDetailTransaction.downPaymentAmount || 0
                                  )}
                                </div>

                                <div className="text-sm font-medium">Remaining Amount:</div>
                                <div className="text-sm col-span-2">
                                  Rp{formatRupiah(
                                    selectedDetailTransaction.remainingAmount || 0
                                  )}
                                </div>
                              </>
                            )}

                            <div className="text-sm font-medium">Dibayarkan:</div>
                            <div className="text-sm col-span-2 text-green-600 font-semibold">
                              Rp{formatRupiah(
                                selectedDetailTransaction.paymentStatus === "Lunas"
                                  ? selectedDetailTransaction.projectValue || 0
                                  : selectedDetailTransaction.paymentStatus === "DP"
                                  ? selectedDetailTransaction.downPaymentAmount || 0
                                  : 0
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Client Information */}
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold flex items-center">
                            <User className="h-5 w-5 mr-2 text-primary" />
                            Informasi Kontak
                          </h3>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="text-sm font-medium">Client:</div>
                            <div className="text-sm col-span-2">
                              {selectedDetailTransaction.client
                                ? `${selectedDetailTransaction.client.name} (${selectedDetailTransaction.client.code})`
                                : "-"}
                            </div>

                            {selectedDetailTransaction.email && (
                              <>
                                <div className="text-sm font-medium">Email:</div>
                                <div className="text-sm col-span-2">
                                  {selectedDetailTransaction.email}
                                </div>
                              </>
                            )}

                            {selectedDetailTransaction.phone && (
                              <>
                                <div className="text-sm font-medium">Phone:</div>
                                <div className="text-sm col-span-2">
                                  {selectedDetailTransaction.phone}
                                </div>
                              </>
                            )}

                            {selectedDetailTransaction.pic && (
                              <>
                                <div className="text-sm font-medium">PIC:</div>
                                <div className="text-sm col-span-2">
                                  {selectedDetailTransaction.pic.name}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        {/* Broadcast Information */}
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold flex items-center">
                            <Calendar className="h-5 w-5 mr-2 text-primary" />
                            Informasi Periode Siar
                          </h3>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="text-sm font-medium">Tanggal Mulai:</div>
                            <div className="text-sm col-span-2">
                              {formatDate(selectedDetailTransaction.startDate)}
                            </div>

                            <div className="text-sm font-medium">Tanggal Berakhir:</div>
                            <div className="text-sm col-span-2">
                              {formatDate(selectedDetailTransaction.endDate)}
                            </div>

                            <div className="text-sm font-medium">Status Siar:</div>
                            <div className="text-sm col-span-2">
                              <BroadcastIndicator
                                startDate={selectedDetailTransaction.startDate}
                                endDate={selectedDetailTransaction.endDate}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Vendor Information */}
                        {selectedDetailTransaction.vendors &&
                          selectedDetailTransaction.vendors.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-lg font-bold flex items-center">
                                <Store className="h-5 w-5 mr-2 text-primary" />
                                Vendor/Subcon
                              </h3>
                              <div className="grid grid-cols-1 gap-1 pl-2">
                                {selectedDetailTransaction.vendors.map((vendor, index) => (
                                  <div key={vendor.id} className="text-sm">
                                    {index + 1}. {vendor.name} - {vendor.serviceDesc}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Payment Proof Link */}
                        {selectedDetailTransaction.paymentProofLink && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-bold flex items-center">
                              <LinkIcon className="h-5 w-5 mr-2 text-primary" />
                              Bukti Pembayaran
                            </h3>
                            <div className="pl-2">
                              <a
                                href={selectedDetailTransaction.paymentProofLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center text-sm"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Lihat Bukti Pembayaran
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Audit Information */}
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold">Informasi Audit</h3>
                          <div className="grid grid-cols-3 gap-1">
                            {selectedDetailTransaction.createdBy && (
                              <>
                                <div className="text-sm font-medium">
                                  Dibuat Oleh:
                                </div>
                                <div className="text-sm col-span-2">
                                  {selectedDetailTransaction.createdBy.name}
                                </div>

                                <div className="text-sm font-medium">
                                  Dibuat Pada:
                                </div>
                                <div className="text-sm col-span-2">
                                  {formatDateTime(selectedDetailTransaction.createdAt)}
                                </div>
                              </>
                            )}

                            {selectedDetailTransaction.updatedBy && (
                              <>
                                <div className="text-sm font-medium">
                                  Diperbarui Oleh:
                                </div>
                                <div className="text-sm col-span-2">
                                  {selectedDetailTransaction.updatedBy.name}
                                </div>

                                <div className="text-sm font-medium">
                                  Diperbarui Pada:
                                </div>
                                <div className="text-sm col-span-2">
                                  {formatDateTime(selectedDetailTransaction.updatedAt)}
                                </div>
                              </>
                            )}

                            {selectedDetailTransaction.deletedBy && (
                              <>
                                <div className="text-sm font-medium">
                                  Diarsipkan Oleh:
                                </div>
                                <div className="text-sm col-span-2">
                                  {selectedDetailTransaction.deletedBy.name}
                                </div>

                                <div className="text-sm font-medium">
                                  Diarsipkan Pada:
                                </div>
                                <div className="text-sm col-span-2">
                                  {formatDateTime(selectedDetailTransaction.deletedAt)}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="expenses">
                    {loadingExpenses ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2">Memuat data expense...</span>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <Tabs defaultValue="active" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="active">
                              Expenses Aktif ({activeExpenses.length})
                            </TabsTrigger>
                            <TabsTrigger value="archived">
                              Expenses Diarsipkan ({archivedExpenses.length})
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="active">
                            {activeExpenses.length > 0 ? (
                              <div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Kategori</TableHead>
                                      <TableHead>Vendor</TableHead>
                                      <TableHead>Jumlah</TableHead>
                                      <TableHead>Fund</TableHead>
                                      <TableHead>Deskripsi</TableHead>
                                      <TableHead>Tanggal</TableHead>
                                      <TableHead>Dibuat Oleh</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {activeExpenses.map((expense) => {
                                      // Cari vendor berdasarkan expense.vendorId.
                                      const vendorName =
                                        expense.vendorId &&
                                        selectedDetailTransaction.vendors?.find(
                                          (v) => v.id === expense.vendorId
                                        )?.name;
                                      return (
                                        <TableRow key={expense.id}>
                                          <TableCell className="font-medium">
                                            {expense.category}
                                          </TableCell>
                                          <TableCell>{vendorName || "N/A"}</TableCell>
                                          <TableCell>
                                            Rp{formatRupiah(expense.amount)}
                                          </TableCell>
                                          <TableCell>
                                            {getFundTypeDisplay(expense.fundType)}
                                          </TableCell>
                                          <TableCell>
                                            {expense.description || "-"}
                                          </TableCell>
                                          <TableCell>
                                            {formatDate(expense.date)}
                                          </TableCell>
                                          <TableCell>
                                            {expense.createdBy?.name || "Unknown"}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>

                                <div className="mt-4 text-right font-bold">
                                  Total: Rp{formatRupiah(selectedDetailTransaction.capitalCost || 0)}
                                </div>
                              </div>
                            ) : (
                              <div className="py-8 text-center text-muted-foreground">
                                Tidak ada expense aktif untuk transaksi ini
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="archived">
                            {archivedExpenses.length > 0 ? (
                              <div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Kategori</TableHead>
                                      <TableHead>Vendor</TableHead>
                                      <TableHead>Jumlah</TableHead>
                                      <TableHead>Fund</TableHead>
                                      <TableHead>Deskripsi</TableHead>
                                      <TableHead>Tanggal</TableHead>
                                      <TableHead>Diarsipkan Oleh</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {archivedExpenses.map((expense) => {
                                      const vendorName =
                                        expense.vendorId &&
                                        selectedDetailTransaction.vendors?.find(
                                          (v) => v.id === expense.vendorId
                                        )?.name;
                                      return (
                                        <TableRow key={expense.id} className="bg-gray-50">
                                          <TableCell className="font-medium">
                                            {expense.category}
                                          </TableCell>
                                          <TableCell>{vendorName || "N/A"}</TableCell>
                                          <TableCell>
                                            Rp{formatRupiah(expense.amount)}
                                          </TableCell>
                                          <TableCell>
                                            {getFundTypeDisplay(expense.fundType)}
                                          </TableCell>
                                          <TableCell>
                                            {expense.description || "-"}
                                          </TableCell>
                                          <TableCell>
                                            {formatDate(expense.date)}
                                          </TableCell>
                                          <TableCell>
                                            {expense.deletedBy?.name || "Unknown"}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>

                                <div className="mt-4 text-right">
                                  <p className="text-sm text-muted-foreground">
                                    Expense yang diarsipkan tidak termasuk dalam perhitungan biaya modal
                                  </p>
                                  <p className="font-medium mt-1">
                                    Total Diarsipkan: Rp
                                    {formatRupiah(
                                      archivedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
                                    )}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="py-8 text-center text-muted-foreground">
                                Tidak ada expense yang diarsipkan untuk transaksi ini
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>

              <div className="pt-4 mt-auto border-t flex justify-between items-center">
                {viewMode === "active" ? (
                  <div className="flex gap-2">
                    <UpdateStatusDialog
                      transaction={selectedDetailTransaction}
                      onStatusUpdated={() => {
                        fetchTransactionsAndExpenses();
                      }}
                    />

                    <UpdateTransactionDialog
                      transaction={selectedDetailTransaction}
                      onTransactionUpdated={() => {
                        setDetailModalOpen(false);
                        fetchTransactionsAndExpenses();
                      }}
                    />
                  </div>
                ) : (
                  <div />
                )}

                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Soft Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pengarsipan</DialogTitle>
            <DialogDescription>
              Transaksi ini akan diarsipkan dan tidak akan muncul di daftar
              transaksi aktif. Anda dapat mengembalikannya dari tampilan arsip
              jika diperlukan.
            </DialogDescription>
          </DialogHeader>
          {/* Escape quotes here */}
          <p className="mb-2">Ketik &quot;DELETE&quot; untuk mengkonfirmasi.</p>
          <Input
            value={confirmDeleteText}
            onChange={(e) => setConfirmDeleteText(e.target.value)}
            placeholder='Ketik "DELETE" untuk mengkonfirmasi'
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={softDeleteTransaction}
              disabled={confirmDeleteText !== "DELETE"}
            >
              Arsipkan Transaksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pemulihan</DialogTitle>
            <DialogDescription>
              Transaksi ini akan dipulihkan dan akan muncul kembali di daftar
              transaksi aktif.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="default"
              onClick={restoreTransaction}
              className="bg-green-600 hover:bg-green-700"
            >
              Pulihkan Transaksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}