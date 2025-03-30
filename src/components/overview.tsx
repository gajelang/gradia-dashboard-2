// src/components/overview.tsx
"use client";

import { useState } from "react";
import InsightCards from "@/components/InsightCards";
import { TransactionProfitabilityCard } from "@/components/TransactionProfitabilityCard";
import TopExpenseCategories from "@/components/TopExpenseCategories";
import OperationalCostAnalysis from "@/components/OperationalCostAnalysis";
import ProjectCalendar from "@/components/ProjectCalendar";
import { DateRange } from "react-day-picker";

// Define a DateRange for chart components
interface ChartDateRange {
  from: Date;
  to: Date;
}

export default function Overview() {
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);

  // Handle date range changes for the chart
  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    setSelectedDateRange(dateRange);
    console.log("Date range changed in Overview:", dateRange); // Debug log
  };

  // Convert DateRange to a ChartDateRange type for the chart components
  const getChartDateRange = (): ChartDateRange | undefined => {
    if (selectedDateRange?.from && selectedDateRange?.to) {
      return {
        from: selectedDateRange.from,
        to: selectedDateRange.to
      };
    }
    return undefined;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <InsightCards onDateRangeChange={handleDateRangeChange} />
      
      {/* Transaction Profitability Card (Full Width) */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <TransactionProfitabilityCard />
      </div>
      
      {/* TopExpenseCategories and OperationalCostAnalysis Side by Side */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <div>
          <TopExpenseCategories 
            currentPeriod={getChartDateRange()} 
            limit={5} 
          />
        </div>
        <div>
          <OperationalCostAnalysis 
            currentPeriod={getChartDateRange()} 
          />
        </div>
      </div>
      
      {/* ProjectCalendar Full Width Below */}
      <div className="mt-4">
        <ProjectCalendar />
      </div>
    </div>
  );
}