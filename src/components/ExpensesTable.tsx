"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  Search,
  // Removed unused Calendar import
  X,
  ExternalLink,
  Tag,
  Archive,
  RefreshCw,
  User,
  Clock,
  Eye
} from "lucide-react"
import { toast } from "react-hot-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatRupiah } from "@/lib/formatters"
import UpdateExpenseDialog from "@/components/UpdateExpenseDialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { fetchWithAuth } from "@/lib/api" // Import the authentication utility
import { useAuth } from "@/contexts/AuthContext" // Import auth context for current user
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Removed unused Badge import

type SortDirection = "asc" | "desc" | null;
type SortField = "category" | "amount" | "description" | "date" | "transactionId" | "createdBy" | null;

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
  isDeleted?: boolean; // Flag for soft delete
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

export default function ExpensesTable() {
  const { user } = useAuth(); // Get current user from auth context
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deletedExpenses, setDeletedExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Expense[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ month: null, year: null });
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableTransactions, setAvailableTransactions] = useState<{id: string, name: string}[]>([]);

  // View mode state (active or deleted expenses)
  const [viewMode, setViewMode] = useState<"active" | "deleted">("active");

  // State for soft delete
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  
  // State for restore
  const [expenseToRestore, setExpenseToRestore] = useState<Expense | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  
  // Loading state
  const [loading, setLoading] = useState(false);

  // Wrap fetchExpenses in useCallback to prevent unnecessary re-renders
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      // Add query parameter to filter active or deleted items
      const queryParam = viewMode === "deleted" ? "?deleted=true" : "";
      
      const res = await fetchWithAuth(`/api/expenses${queryParam}`, { cache: "no-store" });
      
      if (!res.ok) {
        // Get more detailed error information
        let errorText = "Failed to fetch expenses";
        try {
          const errorData = await res.json();
          errorText = errorData.error || errorText;
        } catch {
          // If parsing fails, use default error message
        }
        
        throw new Error(errorText);
      }
      
      // Parse the response data
      let data: Expense[];
      try {
        data = await res.json();
        console.log(`Fetched ${data.length} ${viewMode} expenses`, data);
      } catch (jsonError) { // Changed from e to jsonError to avoid using an unused variable
        console.error("Error parsing expense data:", jsonError);
        throw new Error("Invalid data format received from server");
      }
      
      // Log details about the fetched data
      if (viewMode === "deleted") {
        console.log("Archived expenses data:", data);
        const hasIsDeletedFlag = data.some(exp => exp.isDeleted === true);
        console.log("Contains isDeleted=true flag:", hasIsDeletedFlag);
      }
      
      if (viewMode === "active") {
        setExpenses(data);
        setFilteredExpenses(data);
      } else {
        setDeletedExpenses(data);
        setFilteredExpenses(data);
      }
      
      // Extract and sort available years
      const years = [...new Set(data.map(exp => new Date(exp.date).getFullYear()))];
      setAvailableYears(years.sort((a, b) => b - a));
      
      // Extract unique transactions for filtering
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
      
      // Set empty arrays as fallback
      if (viewMode === "active") {
        setExpenses([]);
        setFilteredExpenses([]);
      } else {
        setDeletedExpenses([]);
        setFilteredExpenses([]);
      }
    } finally {
      setLoading(false);
    }
  }, [viewMode]); // Add dependencies for useCallback

  useEffect(() => {
    fetchExpenses();
  }, [viewMode, fetchExpenses]); // Added fetchExpenses to dependency array

  // Filtering and Sorting Logic
  useEffect(() => {
    let result = viewMode === "active" ? [...expenses] : [...deletedExpenses];
    
    if (categoryFilter) {
      result = result.filter(exp => exp.category === categoryFilter);
    }
    
    if (transactionFilter) {
      result = result.filter(exp => exp.transactionId === transactionFilter);
    }
    
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
    
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        if (sortField === 'date') {
          const dateA = new Date(a[sortField]);
          const dateB = new Date(b[sortField]);
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
  }, [expenses, deletedExpenses, sortField, sortDirection, dateFilter, categoryFilter, transactionFilter, viewMode]);

  // Search and Filtering Handlers
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    const dataToSearch = viewMode === "active" ? expenses : deletedExpenses;
    
    const results = dataToSearch.filter(exp => 
      exp.category.toLowerCase().includes(lowerCaseSearch) ||
      (exp.description && exp.description.toLowerCase().includes(lowerCaseSearch)) ||
      exp.amount.toString().includes(lowerCaseSearch) ||
      (exp.transaction?.name && exp.transaction.name.toLowerCase().includes(lowerCaseSearch)) ||
      (exp.createdBy?.name && exp.createdBy.name.toLowerCase().includes(lowerCaseSearch))
    );
    
    setSearchResults(results);
    setShowSearchResults(true);
  }

  // Utility Functions
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

  // Format datetime for audit display
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
      // Show a loading message
      toast.loading("Archiving expense...", { id: "deleteExpense" });

      const res = await fetchWithAuth("/api/expenses/softDelete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: expenseToDelete.id,
          deletedBy: user?.userId
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to archive expense");
      }

      toast.success("Expense moved to archive", { id: "deleteExpense" });
      
      // Remove from active expenses list
      if (viewMode === "active") {
        setExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id));
        setFilteredExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id));
      } else {
        // Refresh the deleted expenses list
        fetchExpenses();
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

  // Restore expense function
  const restoreExpense = async () => {
    if (!expenseToRestore) return;

    try {
      // Show a loading message
      toast.loading("Restoring expense...", { id: "restoreExpense" });

      const res = await fetchWithAuth("/api/expenses/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: expenseToRestore.id,
          restoredBy: user?.userId
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to restore expense");
      }

      toast.success("Expense restored successfully", { id: "restoreExpense" });
      
      // Remove from deleted expenses list
      setDeletedExpenses(prev => prev.filter(exp => exp.id !== expenseToRestore.id));
      setFilteredExpenses(prev => prev.filter(exp => exp.id !== expenseToRestore.id));
      
      setRestoreDialogOpen(false);
      setExpenseToRestore(null);
    } catch (error) {
      console.error("Error restoring expense:", error);
      toast.error(`Failed to restore expense: ${error instanceof Error ? error.message : "Unknown error"}`, 
        { id: "restoreExpense" });
    }
  };

  // Handle expense update
  const handleExpenseUpdated = (updatedExpense: Expense) => {
    setExpenses((prev) => prev.map((exp) => (exp.id === updatedExpense.id ? updatedExpense : exp)));
    toast.success("Expense updated successfully");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Expenses</h2>
        
        {/* View Toggle */}
        <Tabs 
          value={viewMode} 
          onValueChange={(value) => setViewMode(value as "active" | "deleted")}
          className="w-[400px]"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Active Expenses
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archived Expenses
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Dialog open={showSearchResults} onOpenChange={setShowSearchResults}>
            <DialogTrigger asChild>
              <Button onClick={handleSearch}>Search</Button>
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
                        <TableCell>Rp{formatRupiah(exp.amount)}</TableCell>
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
                {["gaji", "bonus", "Pembelian", "lembur", "produksi"].map(category => (
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
          {(dateFilter.year !== null || categoryFilter !== null || transactionFilter !== null || sortField !== null) && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Loading...</span>
        </div>
      )}

      {!loading && (
        <Table>
          <TableCaption>
            {viewMode === "active" 
              ? "Active expenses list" 
              : "Archived expenses list"}
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
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('transactionId')}
                  className="flex items-center p-0 hover:bg-transparent"
                >
                  Transaction {getSortIcon('transactionId')}
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
              <TableHead>Payment Proof</TableHead>
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
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {exp.category}
                  </span>
                </TableCell>
                <TableCell>{exp.description}</TableCell>
                <TableCell className="font-medium">Rp{formatRupiah(exp.amount)}</TableCell>
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
                  ) : (
                    <span className="text-gray-500 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(exp.date)}</TableCell>
                <TableCell>
                  {exp.paymentProofLink ? (
                    <a 
                      href={exp.paymentProofLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      View <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  ) : (
                    <span className="text-gray-500 text-sm">Not available</span>
                  )}
                </TableCell>
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
                      // Actions for active expenses
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
                    ) : (
                      // Actions for archived expenses
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExpenseToRestore(exp);
                          setRestoreDialogOpen(true);
                        }}
                        className="text-green-600"
                        title="Restore Expense"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  {(dateFilter.year !== null || categoryFilter !== null || transactionFilter !== null) 
                    ? "No expenses found for the selected filters." 
                    : viewMode === "active"
                      ? "No active expenses found."
                      : "No archived expenses found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Soft Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Archive</DialogTitle>
            <DialogDescription>
              This expense will be archived and won&apos;t appear in the active expenses list.
              You can restore it from the archive view if needed.
            </DialogDescription>
          </DialogHeader>
          <p className="mb-2">Type &quot;DELETE&quot; to confirm.</p>
          <Input
            value={confirmDeleteText}
            onChange={(e) => setConfirmDeleteText(e.target.value)}
            placeholder="Type DELETE to confirm"
          />
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

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Restore</DialogTitle>
            <DialogDescription>
              This expense will be restored and will appear in the active expenses list again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="default" 
              onClick={restoreExpense}
              className="bg-green-600 hover:bg-green-700"
            >
              Restore Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}