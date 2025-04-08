"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Tag,
  Archive,
  Eye,
  Calendar,
  Wallet,
  CreditCard,
  Info,
  RepeatIcon,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Loader2,
  Package2,
  User,
  Clock
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
import { formatRupiah } from "@/lib/formatters/formatters";
import UpdateExpenseDialog from "@/components/finance/UpdateExpenseDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { fetchWithAuth } from "@/lib/api/api";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import UnpaidItemsSection from "@/components/expenses/UnpaidItemsSection";

type SortDirection = "asc" | "desc" | null;
type SortField = "category" | "amount" | "description" | "date" | "transactionId" | "createdBy" | "nextBillingDate" | null;

interface DateFilter {
  month: number | null;
  year: number | null;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  paymentProofLink?: string | null;
  transactionId?: string | null;
  transaction?: {
    id: string;
    name: string;
  } | null;
  inventoryId?: string | null;
  inventory?: {
    id: string;
    name: string;
    type: string;
    recurringType?: string | null;
    nextBillingDate?: string | null;
    isRecurring?: boolean;
  } | null;
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
  // Recurring expense fields
  isRecurringExpense?: boolean;
  recurringFrequency?: string | null;
  nextBillingDate?: string | null;
  fundType?: string;
}

export default function ExpensesTable() {
  const { user } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deletedExpenses, setDeletedExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Expense[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ month: null, year: null });
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<string | null>(null);
  const [fundTypeFilter, setFundTypeFilter] = useState<string | null>(null);
  const [recurringFilter, setRecurringFilter] = useState<boolean | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableTransactions, setAvailableTransactions] = useState<{id: string, name: string}[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // View mode state
  const [viewMode, setViewMode] = useState<"active" | "deleted" | "recurring">("active");

  // State for soft delete
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");

  // State for recurring expense management
  const [recurringExpenseDetails, setRecurringExpenseDetails] = useState<Expense | null>(null);
  const [showRecurringDetails, setShowRecurringDetails] = useState(false);
  const [cancellingRecurring, setCancellingRecurring] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Fetch expenses based on view mode
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);

      let endpoint = "/api/expenses";
      let queryParam = "";

      if (viewMode === "deleted") {
        queryParam = "?deleted=true";
      } else if (viewMode === "recurring") {
        endpoint = "/api/expenses/recurring";
      }

      const res = await fetchWithAuth(`${endpoint}${queryParam}`, { cache: "no-store" });

      if (!res.ok) {
        let errorText = "Failed to fetch expenses";
        try {
          const errorData = await res.json();
          errorText = errorData.error || errorText;
        } catch {
          // If parsing fails, use default error message
        }
        throw new Error(errorText);
      }

      let data: Expense[];
      try {
        data = await res.json();
        console.log(`Fetched ${data.length} ${viewMode} expenses`, data);
      } catch (jsonError) {
        console.error("Error parsing expense data:", jsonError);
        throw new Error("Invalid data format received from server");
      }

      if (viewMode === "deleted") {
        setDeletedExpenses(data);
        setFilteredExpenses(data);
      } else if (viewMode === "recurring") {
        setRecurringExpenses(data);
        setFilteredExpenses(data);
      } else {
        setExpenses(data);
        setFilteredExpenses(data);
      }

      // Process available filter options
      const years = [...new Set(data.map(exp => new Date(exp.date).getFullYear()))];
      setAvailableYears(years.sort((a, b) => b - a));

      const categories = [...new Set(data.map(exp => exp.category))];
      setAvailableCategories(categories.sort());

      const transactions = data
        .filter(exp => exp.transaction)
        .map(exp => ({
          id: exp.transaction!.id,
          name: exp.transaction!.name
        }));

      const uniqueTransactions = [...new Map(
        transactions.map(tx => [tx.id, tx])
      ).values()];

      setAvailableTransactions(uniqueTransactions);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error(`Failed to load expenses: ${error instanceof Error ? error.message : "Unknown error"}`);
      setFilteredExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    fetchExpenses();
  }, [viewMode, fetchExpenses]);

  // Filtering and Sorting Logic
  useEffect(() => {
    let result: Expense[] = [];

    if (viewMode === "active") {
      result = [...expenses];
    } else if (viewMode === "deleted") {
      result = [...deletedExpenses];
    } else if (viewMode === "recurring") {
      result = [...recurringExpenses];
    }

    // Apply category filter
    if (categoryFilter) {
      result = result.filter(exp => exp.category === categoryFilter);
    }

    // Apply transaction filter
    if (transactionFilter) {
      result = result.filter(exp => exp.transactionId === transactionFilter);
    }

    // Apply fund type filter
    if (fundTypeFilter) {
      result = result.filter(exp => exp.fundType === fundTypeFilter);
    }

    // Apply recurring filter
    if (recurringFilter !== null) {
      result = result.filter(exp => exp.isRecurringExpense === recurringFilter);
    }

    // Apply date filter
    if (dateFilter.month !== null || dateFilter.year !== null) {
      result = result.filter(exp => {
        const expDate = new Date(exp.date);
        const expMonth = expDate.getMonth();
        const expYear = expDate.getFullYear();
        if (dateFilter.month !== null && dateFilter.year !== null) {
          return expMonth === dateFilter.month && expYear === dateFilter.year;
        } else if (dateFilter.month !== null) {
          return expMonth === dateFilter.month;
        } else if (dateFilter.year !== null) {
          return expYear === dateFilter.year;
        }
        return true;
      });
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        if (sortField === 'date') {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return sortDirection === 'asc'
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        } else if (sortField === 'nextBillingDate') {
          const dateA = a.nextBillingDate ? new Date(a.nextBillingDate) : new Date(9999, 0, 1);
          const dateB = b.nextBillingDate ? new Date(b.nextBillingDate) : new Date(9999, 0, 1);
          return sortDirection === 'asc'
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        } else if (sortField === 'amount') {
          return sortDirection === 'asc'
            ? a[sortField] - b[sortField]
            : b[sortField] - a[sortField];
        } else if (sortField === 'transactionId') {
          const valueA = a.transaction?.name || "";
          const valueB = b.transaction?.name || "";
          return sortDirection === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        } else if (sortField === 'createdBy') {
          const nameA = a.createdBy?.name || "";
          const nameB = b.createdBy?.name || "";
          return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        } else {
          const valueA = String(a[sortField] || "").toLowerCase();
          const valueB = String(b[sortField] || "").toLowerCase();
          return sortDirection === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }
      });
    }

    setFilteredExpenses(result);
  }, [
    expenses,
    deletedExpenses,
    recurringExpenses,
    sortField,
    sortDirection,
    dateFilter,
    categoryFilter,
    transactionFilter,
    fundTypeFilter,
    recurringFilter,
    viewMode
  ]);

  // Search function - now real-time
  useEffect(() => {
    // Apply search filter to the current data
    const applySearchFilter = () => {
      if (!searchTerm.trim()) {
        // If search is empty, just use the current data set based on view mode
        if (viewMode === "active") {
          setFilteredExpenses(expenses);
        } else if (viewMode === "deleted") {
          setFilteredExpenses(deletedExpenses);
        } else if (viewMode === "recurring") {
          setFilteredExpenses(recurringExpenses);
        }
        return;
      }

      const lowerCaseSearch = searchTerm.toLowerCase();
      let dataToSearch: Expense[] = [];

      if (viewMode === "active") {
        dataToSearch = expenses;
      } else if (viewMode === "deleted") {
        dataToSearch = deletedExpenses;
      } else if (viewMode === "recurring") {
        dataToSearch = recurringExpenses;
      }

      const results = dataToSearch.filter(exp =>
        exp.category.toLowerCase().includes(lowerCaseSearch) ||
        (exp.description && exp.description.toLowerCase().includes(lowerCaseSearch)) ||
        exp.amount.toString().includes(lowerCaseSearch) ||
        (exp.transaction?.name && exp.transaction.name.toLowerCase().includes(lowerCaseSearch)) ||
        (exp.inventory?.name && exp.inventory.name.toLowerCase().includes(lowerCaseSearch)) ||
        (exp.createdBy?.name && exp.createdBy.name.toLowerCase().includes(lowerCaseSearch))
      );

      setFilteredExpenses(results);
    };

    // Apply the search filter
    applySearchFilter();
  }, [searchTerm, expenses, deletedExpenses, recurringExpenses, viewMode]);

  // Legacy search function for the search button
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Set search results to the current filtered expenses
    setSearchResults(filteredExpenses);
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

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value === "all" ? null : value);
  };

  const handleTransactionChange = (value: string) => {
    setTransactionFilter(value === "all" ? null : value);
  };

  const handleFundTypeChange = (value: string) => {
    setFundTypeFilter(value === "all" ? null : value);
  };

  const handleRecurringChange = (value: string) => {
    setRecurringFilter(value === "all" ? null : value === "recurring");
  };

  const handleYearChange = (value: string) => {
    setDateFilter(prev => ({
      ...prev,
      year: value === "all" ? null : parseInt(value)
    }));
  };

  const clearFilters = () => {
    setDateFilter({ month: null, year: null });
    setCategoryFilter(null);
    setTransactionFilter(null);
    setFundTypeFilter(null);
    setRecurringFilter(null);
    setSortField(null);
    setSortDirection(null);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-4 w-4" />;

    return sortDirection === 'asc'
      ? <ChevronUp className="ml-1 h-4 w-4" />
      : <ChevronDown className="ml-1 h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Soft delete expense function
  const softDeleteExpense = async () => {
    if (!expenseToDelete || confirmDeleteText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    try {
      toast.loading("Archiving expense...", { id: "deleteExpense" });

      const res = await fetchWithAuth("/api/expenses/softDelete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: expenseToDelete.id,
          deletedBy: user?.id
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to archive expense");
      }

      toast.success("Expense moved to archive", { id: "deleteExpense" });

      if (viewMode === "active") {
        setExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id));
        setFilteredExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id));
      } else if (viewMode === "recurring") {
        setRecurringExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id));
        setFilteredExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id));
      }

      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
      setConfirmDeleteText("");
    } catch (error) {
      console.error("Error archiving expense:", error);
      toast.error(`Failed to archive expense: ${error instanceof Error ? error.message : "Unknown error"}`,
        { id: "deleteExpense" });
    }
  };

  // Handle expense update
  const handleExpenseUpdated = (updatedExpense: Expense) => {
    if (viewMode === "active") {
      setExpenses((prev) => prev.map((exp) => (exp.id === updatedExpense.id ? updatedExpense : exp)));
    } else if (viewMode === "recurring") {
      setRecurringExpenses((prev) => prev.map((exp) => (exp.id === updatedExpense.id ? updatedExpense : exp)));
    }
    toast.success("Expense updated successfully");
  };

  // Cancel recurring expense function
  const cancelRecurringExpense = async (expenseId: string) => {
    if (!expenseId) return;

    try {
      setCancellingRecurring(expenseId);

      const res = await fetchWithAuth(`/api/expenses/recurring?id=${expenseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to cancel recurring expense");
      }

      toast.success("Recurring expense cancelled successfully");

      // Update the list to reflect cancellation
      setRecurringExpenses(prev =>
        prev.map(exp =>
          exp.id === expenseId
            ? { ...exp, isRecurringExpense: false, recurringFrequency: null, nextBillingDate: null }
            : exp
        )
      );

      setFilteredExpenses(prev =>
        prev.map(exp =>
          exp.id === expenseId
            ? { ...exp, isRecurringExpense: false, recurringFrequency: null, nextBillingDate: null }
            : exp
        )
      );

      // If viewing details of this expense, close the dialog
      if (recurringExpenseDetails?.id === expenseId) {
        setShowRecurringDetails(false);
      }
    } catch (error) {
      console.error("Error cancelling recurring expense:", error);
      toast.error(`Failed to cancel recurring expense: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setCancellingRecurring(null);
    }
  };

  // Process recurring payment manually
  const processRecurringPayment = async (expenseId: string) => {
    if (!expenseId) return;

    try {
      setProcessingPayment(expenseId);

      const res = await fetchWithAuth("/api/cron/recurring-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseIds: [expenseId]
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to process payment");
      }

      const result = await res.json();

      if (result.results && result.results.length > 0 && result.results[0].status === "success") {
        toast.success("Payment processed successfully");

        // Update the recurring expense with the new next billing date
        const updatedExpense = await fetchWithAuth(`/api/expenses/recurring?id=${expenseId}`);

        if (updatedExpense.ok) {
          const expenseData = await updatedExpense.json();

          if (Array.isArray(expenseData) && expenseData.length > 0) {
            const updated = expenseData[0];

            // Update the recurring expenses list
            setRecurringExpenses(prev =>
              prev.map(exp => exp.id === expenseId ? updated : exp)
            );

            setFilteredExpenses(prev =>
              prev.map(exp => exp.id === expenseId ? updated : exp)
            );

            // If viewing details of this expense, update it
            if (recurringExpenseDetails?.id === expenseId) {
              setRecurringExpenseDetails(updated);
            }
          }
        }
      } else {
        throw new Error("Payment processing failed or returned unexpected result");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(`Failed to process payment: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setProcessingPayment(null);
    }
  };

  const getRecurringFrequencyDisplay = (frequency: string | null | undefined) => {
    if (!frequency) return "—";

    switch (frequency) {
      case "MONTHLY":
        return "Monthly";
      case "QUARTERLY":
        return "Quarterly";
      case "ANNUALLY":
        return "Annually";
      default:
        return frequency;
    }
  };

  const getFundTypeDisplay = (fundType: string | undefined) => {
    if (!fundType) return "Petty Cash";

    switch (fundType) {
      case "petty_cash":
        return "Petty Cash";
      case "profit_bank":
        return "Profit Bank";
      default:
        return fundType;
    }
  };

  const isUpcomingBilling = (date: string | null | undefined) => {
    if (!date) return false;

    const billingDate = new Date(date);
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return billingDate <= sevenDaysFromNow && billingDate >= today;
  };

  const daysUntilDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Pengeluaran</h2>

        {/* View Toggle */}
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as "active" | "deleted" | "recurring")}
          className="w-[500px]"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Pengeluaran Aktif
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex items-center gap-2">
              <RepeatIcon className="h-4 w-4" />
              Pengeluaran Berulang
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Pengeluaran Diarsipkan
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Unpaid Items Section */}
      <UnpaidItemsSection onPaymentProcessed={fetchExpenses} />

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Dialog open={showSearchResults} onOpenChange={setShowSearchResults}>
            <DialogTrigger asChild>
              <Button onClick={handleSearch} className="hidden">Search</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Search Results</DialogTitle>
              </DialogHeader>
              {searchResults.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fund Type</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Created By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((exp) => (
                      <TableRow key={exp.id} className={exp.isDeleted ? "bg-gray-50" : ""}>
                        <TableCell className="font-medium">{exp.category}</TableCell>
                        <TableCell>{exp.description}</TableCell>
                        <TableCell>{formatRupiah(exp.amount)}</TableCell>
                        <TableCell>{getFundTypeDisplay(exp.fundType)}</TableCell>
                        <TableCell>{exp.transaction?.name || "—"}</TableCell>
                        <TableCell>{formatDate(exp.date)}</TableCell>
                        <TableCell>{exp.createdBy?.name || "Unknown"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6">No matching expenses found.</div>
              )}
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setShowSearchResults(false)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Select onValueChange={handleCategoryChange} value={categoryFilter || "all"}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableTransactions.length > 0 && (
            <Select onValueChange={handleTransactionChange} value={transactionFilter || "all"}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Transaction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                {availableTransactions.map(tx => (
                  <SelectItem key={tx.id} value={tx.id}>{tx.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select onValueChange={handleFundTypeChange} value={fundTypeFilter || "all"}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Fund Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Funds</SelectItem>
              <SelectItem value="petty_cash">Petty Cash</SelectItem>
              <SelectItem value="profit_bank">Profit Bank</SelectItem>
            </SelectContent>
          </Select>

          {viewMode === "active" && (
            <Select onValueChange={handleRecurringChange} value={recurringFilter === null ? "all" : recurringFilter ? "recurring" : "regular"}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select onValueChange={handleYearChange} value={dateFilter.year?.toString() || "all"}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(dateFilter.year !== null || categoryFilter !== null || transactionFilter !== null || fundTypeFilter !== null || recurringFilter !== null || sortField !== null) && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Loading...</span>
        </div>
      )}

      {!loading && viewMode === "recurring" && (
        <Alert className="bg-blue-50 border-blue-200">
          <RepeatIcon className="h-4 w-4 text-blue-600" />
          <AlertTitle>Recurring Expenses</AlertTitle>
          <AlertDescription>
            This view shows all recurring expenses. Click on an expense to view its payment history and details.
          </AlertDescription>
        </Alert>
      )}

      {!loading && (
        <Table>
          <TableCaption>
            {viewMode === "active"
              ? "Active expenses list"
              : viewMode === "deleted"
                ? "Archived expenses list"
                : "Recurring expenses list"}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('category')}
                  className="flex items-center p-0 hover:bg-transparent"
                >
                  Category {getSortIcon('category')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('description')}
                  className="flex items-center p-0 hover:bg-transparent"
                >
                  Description {getSortIcon('description')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('amount')}
                  className="flex items-center p-0 hover:bg-transparent"
                >
                  Amount {getSortIcon('amount')}
                </Button>
              </TableHead>
              <TableHead>
                Fund Source
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('transactionId')}
                  className="flex items-center p-0 hover:bg-transparent"
                >
                  {viewMode === "recurring" ? "Subscription" : "Transaction"} {getSortIcon('transactionId')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('date')}
                  className="flex items-center p-0 hover:bg-transparent"
                >
                  Date {getSortIcon('date')}
                </Button>
              </TableHead>
              {viewMode === "recurring" && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('nextBillingDate')}
                    className="flex items-center p-0 hover:bg-transparent"
                  >
                    Next Billing {getSortIcon('nextBillingDate')}
                  </Button>
                </TableHead>
              )}
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('createdBy')}
                  className="flex items-center p-0 hover:bg-transparent"
                >
                  Created By {getSortIcon('createdBy')}
                </Button>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.map((exp) => (
              <TableRow key={exp.id} className={exp.isDeleted ? "bg-gray-50" : ""}>
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {exp.category}
                    </span>
                    {exp.isRecurringExpense && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                        <RepeatIcon className="mr-1 h-3 w-3" />
                        {getRecurringFrequencyDisplay(exp.recurringFrequency)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{exp.description}</TableCell>
                <TableCell className="font-medium">{formatRupiah(exp.amount)}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    exp.fundType === "profit_bank"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    <Wallet className="mr-1 h-3 w-3" />
                    {getFundTypeDisplay(exp.fundType)}
                  </span>
                </TableCell>
                <TableCell>
                  {exp.transaction ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 cursor-help">
                            <Tag className="h-3 w-3 mr-1" /> {exp.transaction.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This expense is linked to a transaction</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : exp.inventory ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 cursor-help">
                            {exp.inventory.type === "SUBSCRIPTION" ? (
                              <Calendar className="h-3 w-3 mr-1" />
                            ) : (
                              <Package2 className="h-3 w-3 mr-1" />
                            )}
                            {exp.inventory.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This expense is linked to {exp.inventory.type === "SUBSCRIPTION" ? "a subscription" : "an inventory item"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-gray-500 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(exp.date)}</TableCell>
                {viewMode === "recurring" && (
                  <TableCell>
                    {exp.nextBillingDate ? (
                      <span className={`${
                        isUpcomingBilling(exp.nextBillingDate) ? "text-yellow-600 font-medium" : ""
                      }`}>
                        {formatDate(exp.nextBillingDate)}
                        {isUpcomingBilling(exp.nextBillingDate) && daysUntilDate(exp.nextBillingDate) !== null && (
                          <span className="block text-xs text-yellow-600">
                            in {daysUntilDate(exp.nextBillingDate)} days
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-xs">
                      <User className="h-3 w-3" />
                      <span>{exp.createdBy?.name || "Unknown"}</span>
                    </div>
                    {exp.createdAt && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatDateTime(exp.createdAt)}</span>
                      </div>
                    )}
                    {exp.updatedBy && exp.updatedAt && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-blue-600 cursor-help">
                              (Edited)
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <p>Last updated by: {exp.updatedBy.name}</p>
                              <p>at {formatDateTime(exp.updatedAt)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {exp.deletedBy && exp.deletedAt && (
                      <div className="flex items-center gap-1 text-xs text-red-500">
                        <span>Archived by {exp.deletedBy.name}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {viewMode === "active" ? (
                      <>
                        <UpdateExpenseDialog
                          expense={exp}
                          onExpenseUpdated={handleExpenseUpdated}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setExpenseToDelete(exp);
                            setConfirmDeleteText("");
                            setDeleteDialogOpen(true);
                          }}
                          title="Archive Expense"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </>
                    ) : viewMode === "deleted" ? (
                      <div className="text-sm text-muted-foreground">
                        Archived
                      </div>
                    ) : (
                      // Recurring expense actions
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Manage Recurring</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setRecurringExpenseDetails(exp);
                              setShowRecurringDetails(true);
                            }}
                          >
                            <Info className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => processRecurringPayment(exp.id)}
                            disabled={processingPayment === exp.id}
                          >
                            {processingPayment === exp.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Process Payment Now
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => cancelRecurringExpense(exp.id)}
                            disabled={cancellingRecurring === exp.id}
                          >
                            {cancellingRecurring === exp.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Cancelling...
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Recurring
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={viewMode === "recurring" ? 10 : 9} className="text-center py-6">
                  {(dateFilter.year !== null || categoryFilter !== null || transactionFilter !== null || fundTypeFilter !== null || recurringFilter !== null)
                    ? "No expenses found for the selected filters."
                    : viewMode === "active"
                      ? "No active expenses found."
                      : viewMode === "deleted"
                        ? "No archived expenses found."
                        : "No recurring expenses found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Soft Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Expense</DialogTitle>
            <DialogDescription>
              This expense will be archived.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="mb-2">Type "DELETE" to confirm.</p>
            <Input
              value={confirmDeleteText}
              onChange={(e) => setConfirmDeleteText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={softDeleteExpense}
              disabled={confirmDeleteText !== "DELETE"}
            >
              Archive Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring Expense Details Dialog */}
      <Dialog open={showRecurringDetails} onOpenChange={setShowRecurringDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Recurring Expense Details</DialogTitle>
            <DialogDescription>
              Review and manage this recurring expense
            </DialogDescription>
          </DialogHeader>

          {recurringExpenseDetails && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex justify-between">
                      <span>{recurringExpenseDetails.category}</span>
                      <Badge className="ml-2" variant="outline">
                        {getRecurringFrequencyDisplay(recurringExpenseDetails.recurringFrequency)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {recurringExpenseDetails.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Jumlah</dt>
                        <dd className="font-medium">{formatRupiah(recurringExpenseDetails.amount)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Sumber Dana</dt>
                        <dd className="font-medium">{getFundTypeDisplay(recurringExpenseDetails.fundType)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Pembayaran Pertama</dt>
                        <dd className="font-medium">{formatDate(recurringExpenseDetails.date)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Pembayaran Berikutnya</dt>
                        <dd className={`font-medium ${
                          isUpcomingBilling(recurringExpenseDetails.nextBillingDate) ? "text-yellow-600" : ""
                        }`}>
                          {recurringExpenseDetails.nextBillingDate ? formatDate(recurringExpenseDetails.nextBillingDate) : "—"}
                          {isUpcomingBilling(recurringExpenseDetails.nextBillingDate) && daysUntilDate(recurringExpenseDetails.nextBillingDate) !== null && (
                            <span className="block text-xs">
                              dalam {daysUntilDate(recurringExpenseDetails.nextBillingDate)} hari
                            </span>
                          )}
                        </dd>
                      </div>

                      {recurringExpenseDetails.inventory && (
                        <div className="col-span-2">
                          <dt className="text-muted-foreground">Terhubung dengan</dt>
                          <dd className="font-medium flex items-center">
                            {recurringExpenseDetails.inventory.type === "SUBSCRIPTION" ? (
                              <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                            ) : (
                              <Package2 className="h-4 w-4 mr-2 text-blue-500" />
                            )}
                            {recurringExpenseDetails.inventory.name} ({recurringExpenseDetails.inventory.type})
                          </dd>
                        </div>
                      )}

                      {recurringExpenseDetails.transaction && (
                        <div className="col-span-2">
                          <dt className="text-muted-foreground">Transaction</dt>
                          <dd className="font-medium flex items-center">
                            <Tag className="h-4 w-4 mr-2 text-purple-500" />
                            {recurringExpenseDetails.transaction.name}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Payment History</h3>
                  <Alert className="bg-gray-50">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Payment Processing</AlertTitle>
                    <AlertDescription>
                      Payments are automatically processed on the billing date.
                      You can also process a payment manually by clicking the button below.
                    </AlertDescription>
                  </Alert>

                  {/* Payment history would go here - this would need to be fetched separately */}
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Payment history is available in the regular expenses view.
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => {
                if (recurringExpenseDetails) {
                  cancelRecurringExpense(recurringExpenseDetails.id);
                  setShowRecurringDetails(false);
                }
              }}
              disabled={!recurringExpenseDetails || cancellingRecurring === recurringExpenseDetails?.id}
            >
              {cancellingRecurring === recurringExpenseDetails?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Recurring
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRecurringDetails(false)}
              >
                Close
              </Button>

              <Button
                variant="default"
                onClick={() => {
                  if (recurringExpenseDetails) {
                    processRecurringPayment(recurringExpenseDetails.id);
                  }
                }}
                disabled={!recurringExpenseDetails || processingPayment === recurringExpenseDetails?.id}
              >
                {processingPayment === recurringExpenseDetails?.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Process Payment Now
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}