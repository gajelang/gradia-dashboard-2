"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { DatePickerWithRange } from "@/components/DatePickerWithRange";
import { fetchWithAuth } from "@/lib/api/api";
import { formatRupiah } from "@/lib/formatters";
import { addMonths, format, subMonths } from "date-fns";
import { id } from "date-fns/locale";

// Import sub-components for each analysis type
import ProjectPerformanceDashboard from "./project-analysis/ProjectPerformanceDashboard";
import FinancialTimelineView from "./project-analysis/FinancialTimelineView";
import ProfitabilityAnalysis from "./project-analysis/ProfitabilityAnalysis";
import ResourceAllocationAnalysis from "./project-analysis/ResourceAllocationAnalysis";
import ClientContributionAnalysis from "./project-analysis/ClientContributionAnalysis";
import CashFlowProjection from "./project-analysis/CashFlowProjection";

// Import DateRange type from react-day-picker
import { DateRange } from "react-day-picker";

export default function ProjectAnalysis() {
  // State for date range
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  // State for active tab
  const [activeTab, setActiveTab] = useState("performance");

  // State for projects data
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects data
  const fetchProjectsData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fromDate = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "";
      const toDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "";

      const response = await fetchWithAuth(
        `/api/transactions?from=${fromDate}&to=${toDate}&includeExpenses=true`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch projects data");
      }

      const data = await response.json();
      setProjectsData(data);
    } catch (err) {
      console.error("Error fetching projects data:", err);
      setError("Failed to load projects data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when date range changes
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchProjectsData();
    }
  }, [dateRange]);

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchProjectsData();
  };

  // Predefined date ranges
  const setLastMonth = () => {
    const today = new Date();
    setDateRange({
      from: subMonths(today, 1),
      to: today,
    });
  };

  const setLast3Months = () => {
    const today = new Date();
    setDateRange({
      from: subMonths(today, 3),
      to: today,
    });
  };

  const setLast6Months = () => {
    const today = new Date();
    setDateRange({
      from: subMonths(today, 6),
      to: today,
    });
  };

  const setLastYear = () => {
    const today = new Date();
    setDateRange({
      from: subMonths(today, 12),
      to: today,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Project Analysis</h1>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={setLastMonth}>
            1 Bulan
          </Button>
          <Button variant="outline" size="sm" onClick={setLast3Months}>
            3 Bulan
          </Button>
          <Button variant="outline" size="sm" onClick={setLast6Months}>
            6 Bulan
          </Button>
          <Button variant="outline" size="sm" onClick={setLastYear}>
            1 Tahun
          </Button>

          <DatePickerWithRange
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <ProjectPerformanceDashboard
            projectsData={projectsData}
            isLoading={isLoading}
            dateRange={{
              from: dateRange.from,
              to: dateRange.to || undefined
            }}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <FinancialTimelineView
            projectsData={projectsData}
            isLoading={isLoading}
            dateRange={{
              from: dateRange.from,
              to: dateRange.to || undefined
            }}
          />
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4">
          <ProfitabilityAnalysis
            projectsData={projectsData}
            isLoading={isLoading}
            dateRange={{
              from: dateRange.from,
              to: dateRange.to || undefined
            }}
          />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <ResourceAllocationAnalysis
            projectsData={projectsData}
            isLoading={isLoading}
            dateRange={{
              from: dateRange.from,
              to: dateRange.to || undefined
            }}
          />
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <ClientContributionAnalysis
            projectsData={projectsData}
            isLoading={isLoading}
            dateRange={{
              from: dateRange.from,
              to: dateRange.to || undefined
            }}
          />
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <CashFlowProjection
            projectsData={projectsData}
            isLoading={isLoading}
            dateRange={{
              from: dateRange.from,
              to: dateRange.to || undefined
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
