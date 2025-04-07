// src/components/overview.tsx
"use client";

import { useState, useEffect } from "react";
import TotalRevenueCard from "@/components/TotalRevenueCard";
import TotalExpensesCard from "@/components/TotalExpensesCard";
import NetProfitCard from "@/components/NetProfitCard";
import RecentFundTransactionsCard from "@/components/RecentFundTransactionsCard";
import RecentTransactionsCard from "@/components/RecentTransactionsCard";
import AccountBalanceComparisonCard from "@/components/AccountBalanceComparisonCard";
import TimeRangeFilter from "@/components/TimeRangeFilter";
import { TimeRange } from "@/lib/apiController";
import ProjectCalendar from "./ProjectCalendar";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Overview() {
  const [timeRange, setTimeRange] = useState<TimeRange>({ type: 'all_time' });
  const [dataVersion, setDataVersion] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleFilterChange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
    setDataVersion(prev => prev + 1); // Increment to trigger refreshes
  };

  const handleRefresh = () => {
    setDataVersion(prev => prev + 1);
    setHasError(false);
  };

  // Simulate checking for data loading state
  useEffect(() => {
    setIsLoading(true);
    // This would normally be replaced with actual data loading checks
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [dataVersion]);

  if (hasError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was an error loading the dashboard data.
            <Button
              variant="link"
              onClick={handleRefresh}
              className="p-0 h-auto font-normal"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>

        <TimeRangeFilter
          timeRange={timeRange}
          onFilterChange={handleFilterChange}
        />

        <EmptyState
          icon={AlertCircle}
          title="Failed to load dashboard data"
          description="There was an error loading your financial data. Please try refreshing the page."
          actionLabel="Refresh"
          actionIcon={RefreshCw}
          onAction={handleRefresh}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <TimeRangeFilter
          timeRange={timeRange}
          onFilterChange={handleFilterChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border bg-card shadow animate-pulse opacity-70" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-xl border bg-card shadow animate-pulse opacity-70" />
          ))}
        </div>

        <div className="h-64 rounded-xl border bg-card shadow animate-pulse opacity-70" />
        <div className="h-96 rounded-xl border bg-card shadow animate-pulse opacity-70" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Range Filter */}
      <TimeRangeFilter
        timeRange={timeRange}
        onFilterChange={handleFilterChange}
      />

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TotalRevenueCard key={`revenue-${dataVersion}`} timeRange={timeRange} />
        <TotalExpensesCard key={`expenses-${dataVersion}`} timeRange={timeRange} />
        <NetProfitCard key={`profit-${dataVersion}`} timeRange={timeRange} />
      </div>

      {/* Middle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RecentFundTransactionsCard />
        <AccountBalanceComparisonCard />
      </div>

      {/* Bottom Card */}
      <div className="grid grid-cols-1 gap-4">
        <RecentTransactionsCard timeRange={timeRange} />
      </div>

      <div>
        <ProjectCalendar/>
      </div>
    </div>
  );
}