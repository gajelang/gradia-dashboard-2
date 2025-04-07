// src/components/TotalRevenueCard.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";
import { ArrowUpIcon, ArrowDownIcon, Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { fetchComprehensiveFinancialData, TimeRange, formatTimePeriodLabel } from "@/lib/apiController";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import useDataFetching from "@/hooks/useDataFetching";

interface TotalRevenueCardProps {
  timeRange?: TimeRange;
}

export default function TotalRevenueCard({ timeRange = { type: 'all_time' } }: TotalRevenueCardProps) {
  // Default data to use when API fails
  const defaultData = {
    revenue: {
      currentAmount: 0,
      previousAmount: 0,
      percentageChange: 0,
      month: timeRange.type === 'all_time' ? 'All Time' :
             new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear()
    },
    funds: {
      pettyCash: 0,
      profitBank: 0,
      total: 0
    }
  };

  // Use our custom data fetching hook
  const {
    data,
    isLoading: loading,
    error,
    isRefreshing,
    refresh: loadFinancialData
  } = useDataFetching<typeof defaultData>({
    // We're not actually using this URL directly, but using fetchComprehensiveFinancialData instead
    // which fetches from multiple endpoints
    url: '/api/fund-balance', // This is just a placeholder
    dependencies: [timeRange],
    initialData: defaultData,
    transform: async (_responseData) => {
      // Instead of using the response from the URL, we'll use fetchComprehensiveFinancialData
      // which combines data from multiple endpoints
      try {
        return await fetchComprehensiveFinancialData(timeRange);
      } catch (error) {
        console.error("Error in transform function:", error);
        return defaultData;
      }
    },
    onError: (err) => {
      console.error("Error fetching revenue data:", err);
      return defaultData;
    }
  });

  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
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
          <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Gagal memuat data pendapatan</div>
          <Button onClick={loadFinancialData} variant="outline" size="sm" className="mt-2">
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.revenue) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Tidak ada data tersedia</div>
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
            Total Pendapatan
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatTimePeriodLabel(timeRange)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={loadFinancialData}
            disabled={isRefreshing}
            title="Segarkan data"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="text-2xl font-bold">{formatRupiah(revenue.currentAmount)}</div>
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
              ? "Tidak ada perubahan"
              : `${Math.abs(revenue.percentageChange).toFixed(1)}% ${
                  isPositive ? "kenaikan" : "penurunan"
                }`}
          </span>
        </div>

        {/* Display error but don't clear existing data */}
        {error && (
          <Alert variant="destructive" className="mt-2 py-2">
            <AlertDescription className="text-xs text-red-600">
              {error.message || 'Gagal memuat data'} - Menggunakan data yang dimuat sebelumnya.
            </AlertDescription>
          </Alert>
        )}

        {funds && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-blue-50 rounded-md">
              <div className="text-muted-foreground mb-1">Kas Kecil</div>
              <div className="font-medium">{formatRupiah(funds.pettyCash)}</div>
            </div>
            <div className="p-2 bg-green-50 rounded-md">
              <div className="text-muted-foreground mb-1">Bank Keuntungan</div>
              <div className="font-medium">{formatRupiah(funds.profitBank)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}