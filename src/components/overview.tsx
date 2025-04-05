// src/components/overview.tsx
"use client";

import { useState } from "react";
import TotalRevenueCard from "@/components/TotalRevenueCard";
import TotalExpensesCard from "@/components/TotalExpensesCard";
import NetProfitCard from "@/components/NetProfitCard";
import RecentFundTransactionsCard from "@/components/RecentFundTransactionsCard";
import RecentTransactionsCard from "@/components/RecentTransactionsCard";
import AccountBalanceComparisonCard from "@/components/AccountBalanceComparisonCard";
import TimeRangeFilter from "@/components/TimeRangeFilter";
import { TimeRange } from "@/lib/apiController";
import ProjectCalendar from "./ProjectCalendar";

export default function Overview() {
  const [timeRange, setTimeRange] = useState<TimeRange>({ type: 'all_time' });
  const [dataVersion, setDataVersion] = useState(0);
  
  const handleFilterChange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
    setDataVersion(prev => prev + 1); // Increment to trigger refreshes
  };

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