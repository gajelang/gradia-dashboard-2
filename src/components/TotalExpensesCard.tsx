// src/components/TotalExpensesCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";
import { ArrowUpIcon, ArrowDownIcon, Loader2, TrendingDown, PieChart, RefreshCw } from "lucide-react";
import { fetchComprehensiveFinancialData } from "@/lib/apiController";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function TotalExpensesCard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const financialData = await fetchComprehensiveFinancialData();
      
      if (financialData && financialData.expenses) {
        setData(financialData);
      } else {
        throw new Error("Invalid expense data");
      }
    } catch (err) {
      console.error("Error fetching expense data:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      
      // Set default data
      setData({
        expenses: {
          currentAmount: 0,
          previousAmount: 0,
          percentageChange: 0,
          operationalAmount: 0,
          projectAmount: 0,
          month: new Date().toLocaleString('default', { month: 'long' }),
          year: new Date().getFullYear()
        },
        operationalVsProject: {
          operational: 0,
          project: 0,
          total: 0
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
            {expenses.month} {expenses.year}
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
          <TrendingDown className="h-5 w-5 text-red-500" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="text-2xl font-bold">Rp{formatRupiah(expenses.currentAmount)}</div>
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
                  <span className="ml-1 font-medium">Rp{formatRupiah(breakdown.operational)}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mr-1.5"></div>
                  <span className="text-muted-foreground">Project:</span>
                  <span className="ml-1 font-medium">Rp{formatRupiah(breakdown.project)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}