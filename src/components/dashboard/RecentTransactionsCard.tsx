// src/components/RecentTransactionsCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchWithAuth } from "@/lib/api/api";
import { formatRupiah } from "@/lib/formatters/formatters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import {
  Activity,
  Loader2,
  Calendar,
  RefreshCw,
  CreditCard,
  Wallet,
  CreditCard as PaymentIcon,
  Calendar as ProjectIcon
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TimeRange, getDateRangeFromTimeRange, formatTimePeriodLabel } from "@/lib/api/apiController";

interface RecentTransactionsCardProps {
  timeRange?: TimeRange;
}

export default function RecentTransactionsCard({ timeRange = { type: 'all_time' } }: RecentTransactionsCardProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const fetchTransactions = async () => {
    try {
      setIsRefreshing(true);
      // Use the same API endpoint as the transaction table
      const response = await fetchWithAuth("/api/transactions", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();

      // Filter transactions based on timeRange
      const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);

      // Ensure we have an array of transactions
      let transactionsData: any[] = [];
      if (Array.isArray(data)) {
        transactionsData = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        transactionsData = data.data;
      } else {
        console.warn('Unexpected API response format:', data);
      }

      // IMPORTANT: Filter out deleted transactions AND apply time range filter
      const filteredTransactions = transactionsData.filter(tx => {
        if (tx.isDeleted) return false;

        const txDate = new Date(tx.date);
        return txDate >= startDate && txDate <= endDate;
      });

      // Sort by date (newest first)
      const sortedTransactions = filteredTransactions.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(sortedTransactions);
      setError(null);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [timeRange]); // Add timeRange as a dependency

  // Get broadcast status
  const getBroadcastStatus = (tx: any): string => {
    if (!tx.startDate && !tx.endDate) return "Tidak Ada";

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
  };

  const getFilteredTransactions = () => {
    return transactions.filter(tx => {
      // Filter by payment status
      if (paymentFilter !== "all" && tx.paymentStatus.toLowerCase() !== paymentFilter.toLowerCase()) {
        return false;
      }

      // Filter by project/broadcast status
      if (projectFilter !== "all" && getBroadcastStatus(tx) !== projectFilter) {
        return false;
      }

      return true;
    });
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate net profit (projectValue - capitalCost)
  const calculateNetProfit = (transaction: any) => {
    const totalProfit = transaction.projectValue || 0;
    const capitalCost = transaction.capitalCost || 0;
    return totalProfit - capitalCost;
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Belum Dimulai": return "bg-blue-500";
      case "Aktif": return "bg-green-500";
      case "Akan Berakhir": return "bg-yellow-500";
      case "Berakhir": return "bg-neutral-500";
      default: return "bg-gray-500";
    }
  };

  // Get payment status badge style
  const getPaymentStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "lunas":
        return "bg-green-100 text-green-800 border-green-200";
      case "dp":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "belum bayar":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get fund type display
  const getFundTypeDisplay = (fundType: string) => {
    if (fundType === "petty_cash") {
      return <div className="flex items-center text-xs"><Wallet className="h-3 w-3 mr-1 text-amber-500" /> Petty Cash</div>;
    } else if (fundType === "profit_bank") {
      return <div className="flex items-center text-xs"><CreditCard className="h-3 w-3 mr-1 text-green-500" /> Profit Bank</div>;
    } else {
      return <div className="text-xs">{fundType}</div>;
    }
  };

  const handleTransactionClick = (id: string) => {
    // Navigate to transaction details
    router.push(`/transactions/${id}`);
  };

  const handleViewAllClick = () => {
    router.push('/transactions');
  };

  if (loading && transactions.length === 0) {
    return (
      <Card className="bg-gradient-to-br border-indigo-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Activity className="mr-2 h-5 w-5 text-indigo-600" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </CardContent>
      </Card>
    );
  }

  const filteredTransactions = getFilteredTransactions();

  return (
    <Card className="bg-gradient-to-br border-indigo-200">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium flex items-center">
            <Activity className="mr-2 h-5 w-5 text-indigo-600" />
            Recent Transactions
          </CardTitle>
          {timeRange.type !== 'all_time' && (
            <p className="text-xs text-muted-foreground">
              {formatTimePeriodLabel(timeRange)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={fetchTransactions}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {error && (
        <Alert variant="destructive" className="mx-4 my-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="px-4 py-2 flex space-x-2">
        <div className="flex items-center space-x-2 flex-1">
          <PaymentIcon className="h-4 w-4 text-muted-foreground" />
          <Select
            value={paymentFilter}
            onValueChange={setPaymentFilter}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="lunas">Lunas</SelectItem>
              <SelectItem value="dp">DP</SelectItem>
              <SelectItem value="belum bayar">Belum Bayar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 flex-1">
          <ProjectIcon className="h-4 w-4 text-muted-foreground" />
          <Select
            value={projectFilter}
            onValueChange={setProjectFilter}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="Belum Dimulai">Belum Dimulai</SelectItem>
              <SelectItem value="Aktif">Aktif</SelectItem>
              <SelectItem value="Akan Berakhir">Akan Berakhir</SelectItem>
              <SelectItem value="Berakhir">Berakhir</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <CardContent className="p-0">
        {filteredTransactions.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">
            {loading ? "Loading transactions..." : "No transactions match the selected filters"}
          </div>
        ) : (
          <ScrollArea className="h-[240px]">
            <div className="space-y-3 py-3 px-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleTransactionClick(transaction.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{transaction.name}</h4>
                      {transaction.description && (
                        <p className="text-xs text-gray-500 truncate">{transaction.description}</p>
                      )}
                    </div>

                    <div className="text-right ml-2">
                      <Badge
                        variant="outline"
                        className={getPaymentStatusStyle(transaction.paymentStatus)}
                      >
                        {transaction.paymentStatus}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Value</div>
                      <div className="text-sm font-medium">
                        {formatRupiah(transaction.projectValue || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Net Profit</div>
                      <div className="text-sm font-medium text-green-600">
                        {formatRupiah(calculateNetProfit(transaction))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(transaction.date)}
                      </div>

                      {(transaction.startDate || transaction.endDate) && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-white text-[10px] ${getStatusBadgeColor(getBroadcastStatus(transaction))}`}
                        >
                          {getBroadcastStatus(transaction)}
                        </span>
                      )}
                    </div>

                    <div>
                      {getFundTypeDisplay(transaction.fundType)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}