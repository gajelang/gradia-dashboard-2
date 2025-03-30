// src/components/TotalRevenueCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";
import { ArrowUpIcon, ArrowDownIcon, Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { fetchComprehensiveFinancialData } from "@/lib/apiController";
import { Button } from "@/components/ui/button";

export default function TotalRevenueCard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const financialData = await fetchComprehensiveFinancialData();
      
      if (financialData && financialData.revenue) {
        setData(financialData);
      } else {
        throw new Error("Invalid revenue data");
      }
    } catch (err) {
      console.error("Error fetching revenue data:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      
      // Set default data
      setData({
        revenue: {
          currentAmount: 0,
          previousAmount: 0,
          percentageChange: 0,
          month: new Date().toLocaleString('default', { month: 'long' }),
          year: new Date().getFullYear()
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Failed to load revenue data</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.revenue) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No data available</div>
        </CardContent>
      </Card>
    );
  }

  const revenue = data.revenue;
  const funds = data.funds;
  
  // Determine if change is positive, negative, or zero
  const isPositive = revenue.percentageChange > 0;
  const isNegative = revenue.percentageChange < 0;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium">
            Total Revenue
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {revenue.month} {revenue.year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={loadFinancialData}
            title="Refresh data"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="text-2xl font-bold">Rp{formatRupiah(revenue.currentAmount)}</div>
        <div className="flex items-center mt-1">
          {isPositive ? (
            <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
          ) : isNegative ? (
            <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
          ) : null}
          <span
            className={`text-xs font-medium ${
              isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-gray-500"
            }`}
          >
            {revenue.percentageChange === 0
              ? "No change"
              : `${Math.abs(revenue.percentageChange).toFixed(1)}% ${
                  isPositive ? "increase" : "decrease"
                }`}
          </span>
        </div>
        
        {funds && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-blue-50 rounded-md">
              <div className="text-muted-foreground mb-1">Petty Cash</div>
              <div className="font-medium">Rp{formatRupiah(funds.pettyCash)}</div>
            </div>
            <div className="p-2 bg-green-50 rounded-md">
              <div className="text-muted-foreground mb-1">Profit Bank</div>
              <div className="font-medium">Rp{formatRupiah(funds.profitBank)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}