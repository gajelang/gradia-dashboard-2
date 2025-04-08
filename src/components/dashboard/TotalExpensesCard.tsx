// src/components/TotalExpensesCard.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters/formatters";
import { ArrowUpIcon, ArrowDownIcon, Loader2, TrendingDown, RefreshCw } from "lucide-react";
import { fetchComprehensiveFinancialData, TimeRange, formatTimePeriodLabel } from "@/lib/api/apiController";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import useDataFetching from "@/hooks/useDataFetching";

interface TotalExpensesCardProps {
  timeRange?: TimeRange;
}

export default function TotalExpensesCard({ timeRange = { type: 'all_time' } }: TotalExpensesCardProps) {
  // Default data to use when API fails
  const defaultData = {
    expenses: {
      currentAmount: 0,
      previousAmount: 0,
      percentageChange: 0,
      operationalAmount: 0,
      projectAmount: 0,
      month: timeRange.type === 'all_time' ? 'All Time' :
             new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear()
    },
    operationalVsProject: {
      operational: 0,
      project: 0,
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
    url: '/api/fund-balance', // This is just a placeholder
    dependencies: [timeRange],
    initialData: defaultData,
    transform: async (_responseData) => {
      // Instead of using the response from the URL, we'll use fetchComprehensiveFinancialData
      try {
        return await fetchComprehensiveFinancialData(timeRange);
      } catch (error) {
        console.error("Error in transform function:", error);
        return defaultData;
      }
    },
    onError: (err) => {
      console.error("Error fetching expense data:", err);
      return defaultData;
    }
  });

  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
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
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Failed to load expense data</div>
          <Button onClick={loadFinancialData} variant="outline" size="sm" className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.expenses) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No data available</div>
        </CardContent>
      </Card>
    );
  }

  const expenses = data.expenses;
  const breakdown = data.operationalVsProject;

  // With expenses, a decrease is positive (green) and an increase is negative (red)
  const isPositive = expenses.percentageChange < 0;
  const isNegative = expenses.percentageChange > 0;

  // Calculate percentages for the breakdown
  const operationalPercentage = breakdown.total > 0
    ? (breakdown.operational / breakdown.total) * 100
    : 0;

  const projectPercentage = breakdown.total > 0
    ? (breakdown.project / breakdown.total) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium">
            Total Expenses
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
            title="Refresh data"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
          <TrendingDown className="h-5 w-5 text-red-500" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="text-2xl font-bold">{formatRupiah(expenses.currentAmount)}</div>
        <div className="flex items-center mt-1">
          {isPositive ? (
            <ArrowDownIcon className="h-4 w-4 text-green-500 mr-1" />
          ) : isNegative ? (
            <ArrowUpIcon className="h-4 w-4 text-red-500 mr-1" />
          ) : null}
          <span
            className={`text-xs font-medium ${
              isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-gray-500"
            }`}
          >
            {expenses.percentageChange === 0
              ? "No change"
              : `${Math.abs(expenses.percentageChange).toFixed(1)}% ${
                  isNegative ? "increase" : "decrease"
                }`}
          </span>
        </div>

        {/* Display error but don't clear existing data */}
        {error && (
          <Alert variant="destructive" className="mt-2 py-2">
            <AlertDescription className="text-xs text-red-600">
              {error.message || 'Error loading data'} - Using previously loaded data.
            </AlertDescription>
          </Alert>
        )}

        {breakdown && breakdown.total > 0 && (
          <>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Operational vs Project</span>
                <span>{operationalPercentage.toFixed(0)}% / {projectPercentage.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="flex h-full">
                  <div
                    className="bg-orange-500 h-full"
                    style={{ width: `${operationalPercentage}%` }}
                  />
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${projectPercentage}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 text-xs gap-2">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-1.5"></div>
                  <span className="text-muted-foreground">Operational:</span>
                  <span className="ml-1 font-medium">{formatRupiah(breakdown.operational)}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mr-1.5"></div>
                  <span className="text-muted-foreground">Project:</span>
                  <span className="ml-1 font-medium">{formatRupiah(breakdown.project)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}