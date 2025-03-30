// src/components/RevenueVsExpensesChart.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/api";
import { formatRupiah } from "@/lib/formatters";
import { Loader2 } from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

interface ChartData {
  data: MonthlyData[];
  averageProfitMargin: number;
  timeRange: string;
}

const timeRangeOptions = [
  { value: "3", label: "Last 3 Months" },
  { value: "6", label: "Last 6 Months" },
  { value: "12", label: "Last 12 Months" }
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip bg-white p-3 border border-gray-200 shadow-md rounded-md">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-sm mt-1">
          <span className="text-green-600">Revenue: </span>
          <span className="font-medium">Rp{formatRupiah(data.revenue)}</span>
        </p>
        <p className="text-sm">
          <span className="text-red-600">Expenses: </span>
          <span className="font-medium">Rp{formatRupiah(data.expenses)}</span>
        </p>
        <p className="text-sm">
          <span className="text-blue-600">Profit: </span>
          <span className={`font-medium ${data.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
            Rp{formatRupiah(Math.abs(data.profit))}
            {data.profit < 0 ? " (Loss)" : ""}
          </span>
        </p>
        <p className="text-sm">
          <span className="text-purple-600">Profit Margin: </span>
          <span className="font-medium">{data.profitMargin.toFixed(1)}%</span>
        </p>
      </div>
    );
  }

  return null;
};

export default function RevenueVsExpensesChart() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("6");
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinancialComparisonData = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth(`/api/analytics/financial-comparison?months=${selectedTimeRange}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch financial comparison data");
        }

        const comparisonData = await response.json();
        setData(comparisonData);
      } catch (err) {
        console.error("Error fetching financial comparison data:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialComparisonData();
  }, [selectedTimeRange]);

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
  };

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Revenue vs Expenses</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Revenue vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500 p-8 text-center">
            Failed to load financial comparison data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Revenue vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground p-8 text-center">
            No data available for the selected time range
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-medium">Revenue vs Expenses</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Average Profit Margin: <span className="font-medium">{data.averageProfitMargin.toFixed(1)}%</span>
          </p>
        </div>
        <Select
          value={selectedTimeRange}
          onValueChange={handleTimeRangeChange}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {timeRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.data}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis 
              dataKey="month" 
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tickFormatter={(value) => `Rp${formatRupiah(value)}`} 
              width={80}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine 
              y={0} 
              stroke="#64748b" 
              strokeDasharray="3 3" 
              label={{ 
                value: "Break Even", 
                position: "insideBottomRight", 
                fill: "#64748b", 
                fontSize: 12 
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              name="Revenue"
              stroke="#4ade80" 
              strokeWidth={2}
              fill="url(#colorRevenue)" 
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Area 
              type="monotone" 
              dataKey="expenses" 
              name="Expenses"
              stroke="#ef4444" 
              strokeWidth={2}
              fill="url(#colorExpenses)" 
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Area 
              type="monotone" 
              dataKey="profit" 
              name="Profit"
              stroke="#60a5fa" 
              strokeWidth={2}
              fill="url(#colorProfit)" 
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}