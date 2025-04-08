// src/components/ExpenseBreakdownChart.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { fetchWithAuth } from "@/lib/api/api";
import { formatRupiah } from "@/lib/formatters/formatters";
import { Loader2 } from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
} from "recharts";

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface ChartData {
  categories: CategoryData[];
  period: string;
  totalAmount: number;
}

const COLORS = ['#4ade80', '#60a5fa', '#f87171', '#facc15', '#c084fc', '#34d399', '#a3a3a3'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip bg-white p-3 border border-gray-200 shadow-md rounded-md">
        <p className="font-medium text-sm">{data.name}</p>
        <p className="text-sm mt-1">
          <span className="text-muted-foreground">Amount: </span>
          <span className="font-medium">Rp{formatRupiah(data.value)}</span>
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Percentage: </span>
          <span className="font-medium">{data.percentage.toFixed(1)}%</span>
        </p>
      </div>
    );
  }

  return null;
};

export default function ExpenseBreakdownChart() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpenseCategoryData = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth(`/api/analytics/expenses/categories?period=${selectedPeriod}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch expense category data");
        }

        const categoryData = await response.json();
        setData(categoryData);
      } catch (err) {
        console.error("Error fetching expense category data:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchExpenseCategoryData();
  }, [selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500 p-4 text-center">
            Failed to load expense category data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground p-4 text-center">
            No expense data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Expense Breakdown</CardTitle>
        <Select
          value={selectedPeriod}
          onValueChange={handlePeriodChange}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.categories}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
              labelLine={false}
            >
              {data.categories.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || COLORS[index % COLORS.length]} 
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              layout="vertical" 
              verticalAlign="middle" 
              align="right"
              formatter={(value, entry, index) => (
                <span className="text-xs">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="w-full">
          <h4 className="text-sm font-medium mb-2">Category Breakdown</h4>
          <div className="space-y-1">
            {data.categories.map((category, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: category.color || COLORS[index % COLORS.length] }}
                  />
                  <span>{category.name}</span>
                </div>
                <span>Rp{formatRupiah(category.value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t flex justify-between text-xs">
            <span className="font-medium">Total Expenses:</span>
            <span className="font-medium">Rp{formatRupiah(data.totalAmount)}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}