// src/components/FundManagement.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import {
  DollarSign,
  Wallet,
  ArrowUpDown,
  RefreshCw,
  PlusCircle,
  CreditCard,
  AlertTriangle,
  InfoIcon
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api/api";
import { formatRupiah } from "@/lib/formatters/formatters";
import { useAuth } from "@/contexts/AuthContext";

interface FundBalance {
  id: string;
  fundType: string;
  currentBalance: number;
  calculatedBalance?: number; // New field for the corrected balance
  lastReconciledBalance?: number | null;
  lastReconciledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FundTransaction {
  id: string;
  fundType: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  sourceId?: string;
  sourceType?: string;
  referenceId?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function FundManagement() {
  const { user } = useAuth();
  const [fundBalances, setFundBalances] = useState<FundBalance[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFund, setSelectedFund] = useState<string | null>(null);

  // Dialog states
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [transferFundsOpen, setTransferFundsOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  // Form states
  const [addFundsForm, setAddFundsForm] = useState({
    fundType: "petty_cash",
    amount: "",
    description: ""
  });

  const [transferForm, setTransferForm] = useState({
    fromFundType: "petty_cash",
    toFundType: "profit_bank",
    amount: "",
    description: ""
  });

  const [reconcileForm, setReconcileForm] = useState({
    fundType: "petty_cash",
    actualBalance: "",
    description: ""
  });

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Get transaction type color
  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "income": return "text-green-600";
      case "expense": return "text-red-600";
      case "transfer_in": return "text-blue-600";
      case "transfer_out": return "text-purple-600";
      case "adjustment": return "text-amber-600";
      default: return "";
    }
  };

  // Get transaction type display
  const getTransactionTypeDisplay = (type: string) => {
    switch (type) {
      case "income": return "Income";
      case "expense": return "Expense";
      case "transfer_in": return "Transfer In";
      case "transfer_out": return "Transfer Out";
      case "adjustment": return "Adjustment";
      default: return type;
    }
  };

  // Fetch fund balances and transactions
  const fetchFundData = async () => {
    try {
      setLoading(true);

      // Fetch fund balances
      const balancesRes = await fetchWithAuth("/api/fund-balance", {
        cache: "no-store"
      });

      if (!balancesRes.ok) {
        throw new Error("Failed to fetch fund balances");
      }

      const balancesData = await balancesRes.json();
      setFundBalances(balancesData);

      // Check for any discrepancies between current and calculated balances
      balancesData.forEach((fund: FundBalance) => {
        const currentBalance = fund.currentBalance;
        const calculatedBalance = fund.calculatedBalance;

        // If calculated balance exists and differs from current balance
        if (calculatedBalance !== undefined && Math.abs(calculatedBalance - currentBalance) > 0.01) {
          console.warn(`Balance discrepancy detected for ${fund.fundType}: System shows ${currentBalance}, calculated is ${calculatedBalance}`);
        }
      });

      // Fetch transactions for the selected fund or all funds
      const transactionsRes = await fetchWithAuth(
        `/api/fund-transaction${selectedFund ? `?fundType=${selectedFund}` : ""}`,
        { cache: "no-store" }
      );

      if (!transactionsRes.ok) {
        throw new Error("Failed to fetch fund transactions");
      }

      const transactionsData = await transactionsRes.json();

      // Ensure transactions is always an array before setting the state
      if (Array.isArray(transactionsData)) {
        setTransactions(transactionsData);
      } else if (transactionsData && typeof transactionsData === 'object') {
        // Check for common API response patterns
        if (Array.isArray(transactionsData.data)) {
          setTransactions(transactionsData.data);
        } else if (Array.isArray(transactionsData.transactions)) {
          setTransactions(transactionsData.transactions);
        } else {
          console.error('Unexpected transactions API response format:', transactionsData);
          setTransactions([]);
        }
      } else {
        console.error('Invalid transactions API response:', transactionsData);
        setTransactions([]);
      }

    } catch (error) {
      console.error("Error fetching fund data:", error);
      toast.error("Failed to load fund data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundData();
  }, [selectedFund]);

  // Reset form handlers
  const resetAddFundsForm = () => {
    setAddFundsForm({
      fundType: "petty_cash",
      amount: "",
      description: ""
    });
  };

  const resetTransferForm = () => {
    setTransferForm({
      fromFundType: "petty_cash",
      toFundType: "profit_bank",
      amount: "",
      description: ""
    });
  };

  const resetReconcileForm = () => {
    setReconcileForm({
      fundType: "petty_cash",
      actualBalance: "",
      description: ""
    });
  };

  // Handle form submissions
  const handleAddFunds = async () => {
    try {
      if (!addFundsForm.amount || parseFloat(addFundsForm.amount) <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      const res = await fetchWithAuth("/api/fund-transaction", {
        method: "POST",
        body: JSON.stringify({
          fundType: addFundsForm.fundType,
          amount: parseFloat(addFundsForm.amount),
          description: addFundsForm.description,
          transactionType: "income" // Add this missing required field
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add funds");
      }

      toast.success("Funds added successfully");
      setAddFundsOpen(false);
      resetAddFundsForm();
      fetchFundData();
    } catch (error) {
      console.error("Error adding funds:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add funds");
    }
  };

  const handleTransferFunds = async () => {
    try {
      if (!transferForm.amount || parseFloat(transferForm.amount) <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (transferForm.fromFundType === transferForm.toFundType) {
        toast.error("Source and destination funds cannot be the same");
        return;
      }

      const res = await fetchWithAuth("/api/fund-transfer", {
        method: "POST",
        body: JSON.stringify({
          fromFundType: transferForm.fromFundType,
          toFundType: transferForm.toFundType,
          amount: parseFloat(transferForm.amount),
          description: transferForm.description
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to transfer funds");
      }

      toast.success("Funds transferred successfully");
      setTransferFundsOpen(false);
      resetTransferForm();
      fetchFundData();
    } catch (error) {
      console.error("Error transferring funds:", error);
      toast.error(error instanceof Error ? error.message : "Failed to transfer funds");
    }
  };

  const handleReconcile = async () => {
    try {
      if (!reconcileForm.actualBalance || isNaN(parseFloat(reconcileForm.actualBalance))) {
        toast.error("Please enter a valid balance");
        return;
      }

      const res = await fetchWithAuth("/api/fund-balance", {
        method: "POST",
        body: JSON.stringify({
          fundType: reconcileForm.fundType,
          actualBalance: parseFloat(reconcileForm.actualBalance),
          description: reconcileForm.description || "Manual reconciliation"
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reconcile fund");
      }

      toast.success("Fund reconciled successfully");
      setReconcileOpen(false);
      resetReconcileForm();
      fetchFundData();
    } catch (error) {
      console.error("Error reconciling fund:", error);
      toast.error(error instanceof Error ? error.message : "Failed to reconcile fund");
    }
  };

  // Get fund balance by type - UPDATED to use calculatedBalance if available
  const getFundBalance = (type: string) => {
    const fund = fundBalances.find(f => f.fundType === type);
    if (!fund) return 0;

    // Use calculatedBalance if available, otherwise fall back to currentBalance
    return typeof fund.calculatedBalance !== 'undefined' ? fund.calculatedBalance : fund.currentBalance;
  };

  // Check if there's a discrepancy between current and calculated balance
  const hasBalanceDiscrepancy = (type: string) => {
    const fund = fundBalances.find(f => f.fundType === type);
    if (!fund || typeof fund.calculatedBalance === 'undefined') return false;

    // Return true if there's a significant difference (more than 1 unit of currency)
    return Math.abs(fund.currentBalance - fund.calculatedBalance) > 1;
  };

  // Get the current database balance (not the calculated one)
  const getDatabaseBalance = (type: string) => {
    const fund = fundBalances.find(f => f.fundType === type);
    return fund ? fund.currentBalance : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">Fund Management</h2>

        <div className="flex items-center gap-2">
          <Button onClick={() => setAddFundsOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Funds
          </Button>

          <Button onClick={() => setTransferFundsOpen(true)} variant="outline">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Transfer
          </Button>

          <Button onClick={() => setReconcileOpen(true)} variant="secondary">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reconcile
          </Button>
        </div>
      </div>

      {/* Warning Alert for Balance Discrepancies */}
      {(hasBalanceDiscrepancy("petty_cash") || hasBalanceDiscrepancy("profit_bank")) && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Balance Discrepancy Detected</AlertTitle>
          <AlertDescription className="text-amber-700">
            The calculated fund balances differ from the system balances. This could be due to archived
            transactions or expenses. Consider using the Reconcile function to adjust the balances.
          </AlertDescription>
        </Alert>
      )}

      {/* Fund Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Petty Cash */}
        <Card className={`bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 ${
          hasBalanceDiscrepancy("petty_cash") ? "border-amber-300" : ""
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Wallet className="mr-2 h-5 w-5 text-blue-600" />
              Petty Cash
              {hasBalanceDiscrepancy("petty_cash") && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Discrepancy
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800">
              {formatRupiah(getFundBalance("petty_cash"))}
            </div>

            {hasBalanceDiscrepancy("petty_cash") && (
              <div className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-md px-2 py-1">
                <div className="flex justify-between">
                  <span>System Balance:</span>
                  <span>{formatRupiah(getDatabaseBalance("petty_cash"))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Calculated Balance:</span>
                  <span>{formatRupiah(getFundBalance("petty_cash"))}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-2 text-sm">
              <span className="text-muted-foreground">
                Last reconciled: {
                  fundBalances.find(f => f.fundType === "petty_cash")?.lastReconciledAt
                    ? formatDate(fundBalances.find(f => f.fundType === "petty_cash")?.lastReconciledAt)
                    : "Never"
                }
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-800"
                onClick={() => {
                  setSelectedFund("petty_cash");
                  setActiveTab("transactions");
                }}
              >
                View History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profit Bank */}
        <Card className={`bg-gradient-to-br from-green-50 to-green-100 border-green-200 ${
          hasBalanceDiscrepancy("profit_bank") ? "border-amber-300" : ""
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-green-600" />
              Profit Bank
              {hasBalanceDiscrepancy("profit_bank") && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Discrepancy
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800">
              {formatRupiah(getFundBalance("profit_bank"))}
            </div>

            {hasBalanceDiscrepancy("profit_bank") && (
              <div className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-md px-2 py-1">
                <div className="flex justify-between">
                  <span>System Balance:</span>
                  <span>{formatRupiah(getDatabaseBalance("profit_bank"))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Calculated Balance:</span>
                  <span>{formatRupiah(getFundBalance("profit_bank"))}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-2 text-sm">
              <span className="text-muted-foreground">
                Last reconciled: {
                  fundBalances.find(f => f.fundType === "profit_bank")?.lastReconciledAt
                    ? formatDate(fundBalances.find(f => f.fundType === "profit_bank")?.lastReconciledAt)
                    : "Never"
                }
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-800"
                onClick={() => {
                  setSelectedFund("profit_bank");
                  setActiveTab("transactions");
                }}
              >
                View History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Overview and Transactions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions
            {selectedFund && (
              <span className="ml-2">
                ({selectedFund === "petty_cash" ? "Petty Cash" : "Profit Bank"})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fund Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${hasBalanceDiscrepancy("petty_cash") ? "bg-blue-50 border border-amber-300" : "bg-blue-50"}`}>
                    <div className="text-sm text-muted-foreground">Petty Cash</div>
                    <div className="text-2xl font-bold text-blue-800">
                      Rp{formatRupiah(getFundBalance("petty_cash"))}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${hasBalanceDiscrepancy("profit_bank") ? "bg-green-50 border border-amber-300" : "bg-green-50"}`}>
                    <div className="text-sm text-muted-foreground">Profit Bank</div>
                    <div className="text-2xl font-bold text-green-800">
                      Rp{formatRupiah(getFundBalance("profit_bank"))}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Available Funds</div>
                  <div className="text-2xl font-bold">
                    Rp{formatRupiah(
                      getFundBalance("petty_cash") + getFundBalance("profit_bank")
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    Last updated: {formatDate(new Date().toISOString())}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchFundData}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-20">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions && Array.isArray(transactions) && transactions.length > 0 ? (
                      transactions.slice(0, 5).map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                          <TableCell className={getTransactionTypeColor(transaction.transactionType)}>
                            {getTransactionTypeDisplay(transaction.transactionType)}
                          </TableCell>
                          <TableCell>
                            {transaction.fundType === "petty_cash" ? "Petty Cash" : "Profit Bank"}
                          </TableCell>
                          <TableCell className={`text-right ${
                            transaction.amount >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {transaction.amount >= 0 ? "+" : ""}
                            {formatRupiah(Math.abs(transaction.amount))}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.description}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("transactions")}
                >
                  View All Transactions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fund Transactions</CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedFund || "all"}
                  onValueChange={(value) => setSelectedFund(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select fund" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funds</SelectItem>
                    <SelectItem value="petty_cash">Petty Cash</SelectItem>
                    <SelectItem value="profit_bank">Profit Bank</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchFundData}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found for {selectedFund ? selectedFund === "petty_cash" ? "Petty Cash" : "Profit Bank" : "any fund"}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableCaption>
                      Transaction history for {selectedFund ? selectedFund === "petty_cash" ? "Petty Cash" : "Profit Bank" : "all funds"}
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Type</TableHead>
                        {!selectedFund && <TableHead>Fund</TableHead>}
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                          <TableCell className={`whitespace-nowrap ${getTransactionTypeColor(transaction.transactionType)}`}>
                            {getTransactionTypeDisplay(transaction.transactionType)}
                          </TableCell>
                          {!selectedFund && (
                            <TableCell className="whitespace-nowrap">
                              {transaction.fundType === "petty_cash" ? "Petty Cash" : "Profit Bank"}
                            </TableCell>
                          )}
                          <TableCell className={`text-right whitespace-nowrap ${
                            transaction.amount >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {transaction.amount >= 0 ? "+" : ""}
                            Rp{formatRupiah(Math.abs(transaction.amount))}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            Rp{formatRupiah(transaction.balanceAfter)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {transaction.createdBy?.name || "System"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Funds Dialog */}
      <Dialog open={addFundsOpen} onOpenChange={setAddFundsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds</DialogTitle>
            <DialogDescription>
              Add funds to your petty cash or profit bank account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fund Type</label>
              <Select
                value={addFundsForm.fundType}
                onValueChange={(value) => setAddFundsForm(prev => ({ ...prev, fundType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fund type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  <SelectItem value="profit_bank">Profit Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (Rp)</label>
              <Input
                type="number"
                min="0"
                value={addFundsForm.amount}
                onChange={(e) => setAddFundsForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                value={addFundsForm.description}
                onChange={(e) => setAddFundsForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFundsOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFunds}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Funds Dialog */}
      <Dialog open={transferFundsOpen} onOpenChange={setTransferFundsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Funds</DialogTitle>
            <DialogDescription>
              Transfer funds between petty cash and profit bank.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <Select
                value={transferForm.fromFundType}
                onValueChange={(value) => setTransferForm(prev => ({ ...prev, fromFundType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source fund" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  <SelectItem value="profit_bank">Profit Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Select
                value={transferForm.toFundType}
                onValueChange={(value) => setTransferForm(prev => ({ ...prev, toFundType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination fund" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  <SelectItem value="profit_bank">Profit Bank</SelectItem>
                </SelectContent>
              </Select>
              {transferForm.fromFundType === transferForm.toFundType && (
                <p className="text-sm text-red-500 mt-1">
                  Source and destination funds cannot be the same
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (Rp)</label>
              <Input
                type="number"
                min="0"
                value={transferForm.amount}
                onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
              />
              <p className="text-xs text-muted-foreground">
                Available: Rp{formatRupiah(getFundBalance(transferForm.fromFundType))}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                value={transferForm.description}
                onChange={(e) => setTransferForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferFundsOpen(false)}>Cancel</Button>
            <Button
              onClick={handleTransferFunds}
              disabled={
                transferForm.fromFundType === transferForm.toFundType ||
                !transferForm.amount ||
                parseFloat(transferForm.amount) <= 0 ||
                parseFloat(transferForm.amount) > getFundBalance(transferForm.fromFundType)
              }
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Transfer Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconcile Funds Dialog */}
      <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile Fund Balance</DialogTitle>
            <DialogDescription>
              Adjust the system balance to match the actual balance in your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fund Type</label>
              <Select
                value={reconcileForm.fundType}
                onValueChange={(value) => setReconcileForm(prev => ({ ...prev, fundType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fund type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  <SelectItem value="profit_bank">Profit Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">System Balance</label>
              <div className="p-2 bg-gray-50 rounded-md border">
                Rp{formatRupiah(getDatabaseBalance(reconcileForm.fundType))}
              </div>
            </div>

            {hasBalanceDiscrepancy(reconcileForm.fundType) && (
              <div className="space-y-2">
                <div className="flex items-center">
                  <InfoIcon className="h-4 w-4 mr-2 text-blue-500" />
                  <label className="text-sm font-medium">Calculated Balance</label>
                </div>
                <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
                  Rp{formatRupiah(getFundBalance(reconcileForm.fundType))}
                </div>
                <p className="text-xs text-blue-600">
                  This is the calculated balance based on active transactions and expenses.
                  You may want to use this as your actual balance.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReconcileForm(prev => ({
                    ...prev,
                    actualBalance: getFundBalance(reconcileForm.fundType).toString()
                  }))}
                  className="w-full"
                >
                  Use Calculated Balance
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Actual Balance (Rp)</label>
              <Input
                type="number"
                min="0"
                value={reconcileForm.actualBalance}
                onChange={(e) => setReconcileForm(prev => ({ ...prev, actualBalance: e.target.value }))}
                placeholder="Enter actual balance"
              />
              <p className="text-xs text-muted-foreground">
                Enter the actual balance from your physical cash or bank account
              </p>
            </div>

            {reconcileForm.actualBalance && !isNaN(parseFloat(reconcileForm.actualBalance)) && (
              <div className="p-2 rounded-md border bg-blue-50">
                <div className="font-medium text-sm">Adjustment Summary</div>
                <div className="flex justify-between mt-1">
                  <span>Current System Balance:</span>
                  <span>Rp{formatRupiah(getDatabaseBalance(reconcileForm.fundType))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Actual Balance:</span>
                  <span>Rp{formatRupiah(parseFloat(reconcileForm.actualBalance))}</span>
                </div>
                <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                  <span>Adjustment Amount:</span>
                  <span className={parseFloat(reconcileForm.actualBalance) - getDatabaseBalance(reconcileForm.fundType) >= 0 ? "text-green-600" : "text-red-600"}>
                    {parseFloat(reconcileForm.actualBalance) - getDatabaseBalance(reconcileForm.fundType) >= 0 ? "+" : ""}
                    Rp{formatRupiah(Math.abs(parseFloat(reconcileForm.actualBalance) - getDatabaseBalance(reconcileForm.fundType)))}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Reconciliation Note</label>
              <Textarea
                value={reconcileForm.description}
                onChange={(e) => setReconcileForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Why is this adjustment needed? (required)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReconcile}
              disabled={
                !reconcileForm.actualBalance ||
                isNaN(parseFloat(reconcileForm.actualBalance)) ||
                !reconcileForm.description
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reconcile Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}