// src/components/NetProfitCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";
import { ArrowUpIcon, ArrowDownIcon, Loader2, AlertCircle, CheckCircle, CircleOff, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchProfitData, ProfitData, TimeRange, formatTimePeriodLabel } from "@/lib/apiController";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Default data if API fails
const defaultProfitData = {
  currentAmount: 0,
  previousAmount: 0,
  percentageChange: 0,
  profitMargin: 0,
  isAboveTarget: false,
  targetProfit: 0,
  month: 'All Time',
  year: new Date().getFullYear()
};

interface NetProfitCardProps {
  timeRange?: TimeRange;
}

export default function NetProfitCard({ timeRange = { type: 'all_time' } }: NetProfitCardProps) {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallbackData, setUseFallbackData] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadProfitData = async () => {
    try {
      setIsRefreshing(true);
      
      // Fetch profit data from API controller
      const profitData = await fetchProfitData(timeRange);
      
      // Validate the data
      if (profitData && typeof profitData.currentAmount === 'number' && !isNaN(profitData.currentAmount)) {
        setData(profitData);
        setUseFallbackData(false);
        setError(null);
      } else {
        console.warn("Invalid profit data returned:", profitData);
        if (!data) {
          setData(defaultProfitData);
          setUseFallbackData(true);
        }
        throw new Error("Invalid profit data format");
      }
    } catch (err) {
      console.error("Error calculating profit data:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      if (!data) {
        setData(defaultProfitData);
        setUseFallbackData(true);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfitData();
  }, [timeRange]);

  if (loading && !data) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Failed to calculate profit data</div>
          <Button onClick={loadProfitData} variant="outline" size="sm" className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No data available</div>
        </CardContent>
      </Card>
    );
  }

  // Determine status with safety checks for NaN values
  const isProfit = !isNaN(data.currentAmount) && data.currentAmount > 0;
  const isLoss = !isNaN(data.currentAmount) && data.currentAmount < 0;
  const isBreakeven = !isNaN(data.currentAmount) && data.currentAmount === 0;
  
  // Determine change status with safety checks for NaN values
  const isPositive = !isNaN(data.percentageChange) && data.percentageChange > 0;
  const isNegative = !isNaN(data.percentageChange) && data.percentageChange < 0;
  const isNoChange = !isNaN(data.percentageChange) && data.percentageChange === 0;

  return (
    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium">
            Net Profit
            {useFallbackData && <span className="text-xs text-amber-500 ml-2">(Default Data)</span>}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatTimePeriodLabel(timeRange)}
          </p>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0"
          onClick={loadProfitData}
          disabled={isRefreshing}
          title="Refresh data"
        >
          {isRefreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-2xl font-bold ${
                isProfit ? "text-green-600" : isLoss ? "text-red-600" : "text-gray-600"
              }`}>
                {isLoss ? "-" : ""}Rp{formatRupiah(Math.abs(data.currentAmount))}
              </p>
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
                  {isNoChange || isNaN(data.percentageChange) ? "No change" : `${Math.abs(data.percentageChange).toFixed(1)}%`}
                  {isPositive ? " increase" : isNegative ? " decrease" : ""}
                </span>
              </div>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100">
                    {data.isAboveTarget ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : isBreakeven ? (
                      <CircleOff className="h-6 w-6 text-gray-500" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-amber-500" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {data.isAboveTarget
                      ? "Above target"
                      : isBreakeven
                      ? "Breakeven"
                      : "Below target"} 
                    (Target: Rp{formatRupiah(data.targetProfit)})
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Display error but don't clear existing data */}
          {error && (
            <Alert variant="destructive" className="mt-2 py-2">
              <AlertDescription className="text-xs text-red-600">
                {error} - Using previously loaded data.
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Profit Margin</span>
              <span className={`text-sm font-medium ${
                !isNaN(data.profitMargin) && data.profitMargin > 0 ? "text-green-600" : 
                !isNaN(data.profitMargin) && data.profitMargin < 0 ? "text-red-600" : "text-gray-600"
              }`}>
                {!isNaN(data.profitMargin) ? data.profitMargin.toFixed(1) : "0.0"}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}