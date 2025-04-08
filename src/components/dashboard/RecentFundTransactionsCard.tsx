// src/components/RecentFundTransactionsCard.tsx - Fixed version
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchWithAuth } from "@/lib/api/api";
import { formatRupiah } from "@/lib/formatters/formatters";
import { Loader2, ExternalLink, ArrowUpDown, RefreshCw, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AlertDescription } from "@/components/ui/alert";

interface FundTransaction {
  id: string;
  fundType: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function RecentFundTransactionsCard() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useFallbackData, setUseFallbackData] = useState<boolean>(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetchWithAuth("/api/fund-transaction?limit=10", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch fund transactions");
      }

      const responseData = await response.json();

      // Ensure transactions is always an array before setting the state
      let transactionsData: FundTransaction[] = [];
      if (Array.isArray(responseData)) {
        transactionsData = responseData;
      } else if (responseData && typeof responseData === 'object') {
        // Check for common API response patterns
        if (Array.isArray(responseData.transactions)) {
          transactionsData = responseData.transactions;
        } else if (Array.isArray(responseData.data)) {
          transactionsData = responseData.data;
        } else {
          console.error('Unexpected transactions API response format:', responseData);
          throw new Error("Unexpected response format");
        }
      }

      setTransactions(transactionsData);
      setUseFallbackData(false);
      setError(null);
    } catch (err) {
      console.error("Error fetching fund transactions:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");

      // Don't use fallback data if we already have data
      if (transactions.length === 0) {
        setUseFallbackData(true);
        setTransactions([
          {
            id: "default-1",
            fundType: "petty_cash",
            transactionType: "income",
            amount: 1500000,
            balanceAfter: 1500000,
            description: "Default transaction data",
            createdAt: new Date().toISOString(),
          },
          {
            id: "default-2",
            fundType: "profit_bank",
            transactionType: "expense",
            amount: -500000,
            balanceAfter: 2000000,
            description: "Default transaction data",
            createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          }
        ]);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  // Get transaction type color
  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "income": return "text-green-600";
      case "expense": return "text-red-600";
      case "transfer_in": return "text-blue-600";
      case "transfer_out": return "text-purple-600";
      case "adjustment": return "text-amber-600";
      default: return "text-gray-600";
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

  // Get fund type display
  const getFundTypeDisplay = (type: string) => {
    switch (type) {
      case "petty_cash": return "Petty Cash";
      case "profit_bank": return "Profit Bank";
      default: return type;
    }
  };

  const handleViewAllClick = () => {
    router.push('/fund-management');
  };

  if (loading && transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center">
            <ArrowUpDown className="mr-2 h-5 w-5 text-purple-600" />
            Recent Fund Transactions
            {useFallbackData && <span className="text-xs text-amber-500 ml-2">(Default Data)</span>}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={fetchTransactions}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      {error && !useFallbackData && (
        <div className="px-4 py-2">
          <div className="bg-amber-50 text-amber-800 p-2 rounded text-xs flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {error}
          </div>
        </div>
      )}

      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No recent transactions found
          </div>
        ) : (
          <ScrollArea className="h-[240px] px-4">
            <div className="space-y-3 py-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex flex-col bg-white p-3 rounded-md shadow-sm border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className={`text-sm font-medium ${getTransactionTypeColor(transaction.transactionType)}`}>
                        {getTransactionTypeDisplay(transaction.transactionType)}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</div>
                    </div>
                    <div className={`text-right ${transaction.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      <div className="font-medium">
                        {transaction.amount >= 0 ? "+" : ""}
                        {formatRupiah(Math.abs(transaction.amount))}
                      </div>
                      <div className="text-xs text-gray-500">{getFundTypeDisplay(transaction.fundType)}</div>
                    </div>
                  </div>
                  {transaction.description && (
                    <div className="mt-2 text-xs text-gray-600 line-clamp-1">
                      {transaction.description}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-500 flex justify-between items-center">
                    <span>Balance: {formatRupiah(transaction.balanceAfter)}</span>
                    <span>{transaction.createdBy?.name || "System"}</span>
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