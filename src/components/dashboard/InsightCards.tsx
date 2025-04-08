// src/components/InsightCards.tsx
"use client";

import TotalRevenueCard from "@/components/dashboard/TotalRevenueCard";
import TotalExpensesCard from "@/components/dashboard/TotalExpensesCard";
import NetProfitCard from "@/components/dashboard/NetProfitCard";
import RecentFundTransactionsCard from "./RecentFundTransactionsCard";
import AccountBalanceComparisonCard from "./AccountBalanceComparisonCard";
import RecentTransactionsCard from "./RecentTransactionsCard";
import DateRangePicker from "@/components/DateRangePicker"; // Import DateRangePicker
import { DateRange } from "react-day-picker";

interface InsightCardsProps {
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export default function InsightCards({ onDateRangeChange }: InsightCardsProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Key Metrics</h2>
        <DateRangePicker onDateRangeChange={onDateRangeChange} />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TotalRevenueCard />
        <TotalExpensesCard />
        <NetProfitCard />
        <RecentFundTransactionsCard/>
        <AccountBalanceComparisonCard />
        <RecentTransactionsCard />
      </div>
    </div>
  );
}
