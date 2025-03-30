// src/components/RecentFundTransactionsCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchWithAuth } from "@/lib/api";
import { formatRupiah } from "@/lib/formatters";
import { Loader2, ExternalLink, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";

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

// Default transactions to use if API fails
const defaultTransactions: FundTransaction[] = [
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
  },
  {
    id: "default-3",
    fundType: "petty_cash",
    transactionType: "transfer_out",
    amount: -300000,
    balanceAfter: 1200000,
    description: "Default transfer to profit bank",
    createdAt: new Date(Date.now() - 172800000).toISOString(), // Two days ago
  },
  {
    id: "default-4",
    fundType: "profit_bank",
    transactionType: "transfer_in",
    amount: 300000,
    balanceAfter: 2300000,
    description: "Default transfer from petty cash",
    createdAt: new Date(Date.now() - 172800000).toISOString(), // Two days ago
  },
];

export default function RecentFundTransactionsCard() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallbackData, setUseFallbackData] = useState<boolean>(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth("/api/fund-transaction?limit=10", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch fund transactions");
        }

        const responseText = await response.text();
        
        // Check if response is empty
        if (!responseText || responseText.trim() === '') {
          console.warn("Empty response from fund transactions API");
          throw new Error("Empty response from server");
        }
        
        try {
          // Try to parse JSON
          const parsedData = JSON.parse(responseText);
          
          // Handle various response formats
          let transactionsData: FundTransaction[] = [];
          
          if (Array.isArray(parsedData)) {
            transactionsData = parsedData;
          } else if (parsedData && typeof parsedData === 'object') {
            // Check for common API response patterns
            if (Array.isArray(parsedData.data)) {
              transactionsData = parsedData.data;
            } else if (Array.isArray(parsedData.transactions)) {
              transactionsData = parsedData.transactions;
            } else {
              console.warn('Unexpected transactions API response format:', parsedData);
              throw new Error("Unexpected response format");
            }
          } else {
            console.warn('Invalid transactions API response:', parsedData);
            throw new Error("Invalid response format");
          }
          
          // Validate and clean each transaction
          const sanitizedTransactions = transactionsData.map((tx: any) => ({
            id: tx.id || `tx-${Math.random().toString(36).substring(2, 9)}`,
            fundType: typeof tx.fundType === 'string' ? tx.fundType : 'unknown',
            transactionType: typeof tx.transactionType === 'string' ? tx.transactionType : 'unknown',
            amount: typeof tx.amount === 'number' ? tx.amount : 0,
            balanceAfter: typeof tx.balanceAfter === 'number' ? tx.balanceAfter : 0,
            description: tx.description || '',
            createdAt: typeof tx.createdAt === 'string' ? tx.createdAt : new Date().toISOString(),
            createdBy: tx.createdBy || null
          }));
          
          setTransactions(sanitizedTransactions);
          setUseFallbackData(false);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.error("Raw response:", responseText);
          throw new Error("Invalid JSON response");
        }
      } catch (err) {
        console.error("Error fetching fund transactions:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        
        // Use fallback data
        setTransactions(defaultTransactions);
        setUseFallbackData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

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

  if (loading) {
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

  if (error && transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Failed to load transaction data</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate height for 2 cards (each card is about 112px with padding and margin)
  const cardHeight = "240px";

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <ArrowUpDown className="mr-2 h-5 w-5 text-purple-600" />
          Recent Fund Transactions
          {useFallbackData && <span className="text-xs text-amber-500 ml-2">(Default Data)</span>}
        </CardTitle>
      </CardHeader>
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
                        Rp{formatRupiah(Math.abs(transaction.amount))}
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
                    <span>Balance: Rp{formatRupiah(transaction.balanceAfter)}</span>
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