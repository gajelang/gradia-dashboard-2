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
  Eye
} from "lucide-react";
import { toast } from "react-hot-toast";
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
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import our new components
import FundTypeIndicator from "@/components/common/FundTypeIndicator";
import StatusBadge from "@/components/common/StatusBadge";
import TransactionTableActions from "../TransactionTable/TransactionActions";
import TransactionDetails from "./TransactionDetails/Index";
import ConfirmDialog from "../common/ConfirmDialog";
// Types
type SortDirection = "asc" | "desc" | null;
type SortField = "name" | "amount" | "projectValue" | "paymentStatus" | "date" | "capitalCost" | "createdBy" | null;
type ViewMode = "active" | "deleted";

interface DateFilter {
  month: number | null;
  year: number | null;
}

// Get broadcast status based on start and end dates
function getBroadcastStatus(tx: any): string {
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
  const status = getBroadcastStatus({ startDate, endDate });
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

  // Data state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [deletedTransactions, setDeletedTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Filter state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    month: null,
    year: null,
  });
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [broadcastFilter, setBroadcastFilter] = useState("Semua");

  // UI state
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("active");

  // Transaction action state
  const [transactionToDelete, setTransactionToDelete] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");

  // Transaction details state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailTransaction, setSelectedDetailTransaction] = useState<any | null>(null);

  // -------------------------------------------------------------
  // Fetch Transactions
  // -------------------------------------------------------------
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const queryParam = viewMode === "deleted" ? "?deleted=true" : "";
      const resTransactions = await fetchWithAuth(
        `/api/transactions${queryParam}`,
        {
          cache: "no-store",
        }
      );

      if (!resTransactions.ok) throw new Error("Failed to fetch transactions");
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
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  // Fetch data when component mounts or viewMode changes
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // -------------------------------------------------------------
  // Transaction Actions
  // -------------------------------------------------------------

  // Soft delete transaction
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
          deletedBy: user?.id,
        }),
      });

      const data = await response.json();

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
      fetchTransactions();

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

  // Handle transaction update
  const handleTransactionUpdated = (updatedTransaction: any) => {
    // Update transaction in list
    setTransactions(prevTransactions =>
      prevTransactions.map(tx =>
        tx.id === updatedTransaction.id ? updatedTransaction : tx
      )
    );

    // Update filtered transactions
    setFilteredTransactions(prevTransactions =>
      prevTransactions.map(tx =>
        tx.id === updatedTransaction.id ? updatedTransaction : tx
      )
    );

    // Update selected transaction
    if (selectedDetailTransaction?.id === updatedTransaction.id) {
      setSelectedDetailTransaction(updatedTransaction);
    }
  };

  // -------------------------------------------------------------
  // Filtering & Sorting
  // -------------------------------------------------------------

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

  // Real-time search function
  useEffect(() => {
    // Apply search filter to the current data
    const applySearchFilter = () => {
      if (!searchTerm.trim()) {
        // If search is empty, just use the current data set based on view mode
        if (viewMode === "active") {
          setFilteredTransactions(transactions);
        } else if (viewMode === "deleted") {
          setFilteredTransactions(deletedTransactions);
        }
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

      setFilteredTransactions(results);
    };

    // Apply the search filter
    applySearchFilter();
  }, [searchTerm, transactions, deletedTransactions, viewMode]);

  // Legacy search function for the search button
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Set search results to the current filtered transactions
    setSearchResults(filteredTransactions);
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

  // -------------------------------------------------------------
  // UI Handlers
  // -------------------------------------------------------------

  // Handle transaction row click to open detail modal
  const handleTransactionClick = (transaction: any) => {
    setSelectedDetailTransaction(transaction);
    setDetailModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate net profit (totalProfit - capitalCost)
  const calculateNetProfit = (transaction: any) => {
    const totalProfit = transaction.totalProfit || transaction.projectValue || 0;
    const capitalCost = transaction.capitalCost || 0;
    return totalProfit - capitalCost;
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
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
          onValueChange={(value) => setViewMode(value as ViewMode)}
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
            />
          </div>
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
                <FundTypeIndicator fundType={tx.fundType || "petty_cash"} size="sm" />
              </TableCell>
              <TableCell>
                <div>{formatRupiah(tx.projectValue || 0)}</div>
                <div className="text-xs text-muted-foreground">
                  Net: {formatRupiah(calculateNetProfit(tx))}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={tx.paymentStatus} />
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
                {viewMode === "active" ? (
                  <TransactionTableActions
                    transaction={tx}
                    onViewDetails={() => handleTransactionClick(tx)}
                    onArchive={() => {
                      setTransactionToDelete(tx);
                      setConfirmDeleteText("");
                      setDeleteDialogOpen(true);
                    }}
                  />
                ) : (
                  <span className="text-xs text-gray-500">Archived</span>
                )}
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
      {selectedDetailTransaction && (
        <TransactionDetails
          transaction={selectedDetailTransaction}
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          onTransactionUpdated={handleTransactionUpdated}
        />
      )}

      {/* Soft Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Konfirmasi Pengarsipan"
        description="Transaksi ini akan diarsipkan dan tidak akan muncul di daftar transaksi aktif."
        confirmText="DELETE"
        actionLabel="Arsipkan Transaksi"
        actionVariant="destructive"
        confirmPlaceholder={'Ketik "DELETE" untuk mengkonfirmasi'}
        onConfirm={softDeleteTransaction}
        confirmValue={confirmDeleteText}
        onConfirmValueChange={(value) => setConfirmDeleteText(value)}
      />
    </div>
  );
}
