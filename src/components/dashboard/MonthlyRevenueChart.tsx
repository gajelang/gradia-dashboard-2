// src/components/MonthlyRevenueChart.tsx
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
import { fetchWithAuth } from "@/lib/api/api";
import { formatRupiah } from "@/lib/formatters/formatters";
import { Loader2 } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  ComposedChart,
  Rectangle,
} from "recharts";

interface MonthlyData {
  month: string;
  revenue: number;
  previousYearRevenue: number;
  percentageChange: number;
}

interface ChartData {
  year: number;
  data: MonthlyData[];
  availableYears: number[];
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const currentYearData = payload[0].payload;
    return (
      <div className="custom-tooltip bg-white p-3 border border-gray-200 shadow-md rounded-md">
        <p className="font-medium">{label}</p>
        <p className="text-sm">
          <span className="text-green-600">Revenue: </span>
          <span>Rp{formatRupiah(currentYearData.revenue)}</span>
        </p>
        {currentYearData.previousYearRevenue > 0 && (
          <p className="text-sm">
            <span className="text-blue-600">Previous Year: </span>
            <span>Rp{formatRupiah(currentYearData.previousYearRevenue)}</span>
          </p>
        )}
        {currentYearData.percentageChange !== 0 && (
          <p className={`text-sm font-medium ${
            currentYearData.percentageChange > 0 ? "text-green-600" : "text-red-600"
          }`}>
            {currentYearData.percentageChange > 0 ? "+" : ""}
            {currentYearData.percentageChange.toFixed(1)}% vs last year
          </p>
        )}
      </div>
    );
  }

  return null;
};

// Custom bar shape for better aesthetics
const CustomBar = (props: any) => {
  const { x, y, width, height, radius } = props;
  return <Rectangle 
    x={x}
    y={y}
    width={width}
    height={height}
    fill={props.fill}
    radius={[radius, radius, 0, 0]}
  />;
};

export default function MonthlyRevenueChart() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonthlyRevenueData = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth(`/api/analytics/revenue/monthly?year=${selectedYear}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch monthly revenue data");
        }

        const revenueData = await response.json();
        setData(revenueData);
      } catch (err) {
        console.error("Error fetching monthly revenue data:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyRevenueData();
  }, [selectedYear]);

  const handleYearChange = (year: string) => {
    setSelectedYear(parseInt(year));
  };

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Monthly Revenue</CardTitle>
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
          <CardTitle className="text-lg font-medium">Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500 p-8 text-center">
            Failed to load monthly revenue data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground p-8 text-center">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure we have data for all months, filling in any missing values
  const chartData = monthNames.map((month, index) => {
    const monthData = data.data.find(d => d.month === month) || {
      month,
      revenue: 0,
      previousYearRevenue: 0,
      percentageChange: 0
    };
    
    return {
      ...monthData,
    };
  });

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Monthly Revenue</CardTitle>
        <Select
          value={selectedYear.toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {data.availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
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
            <Bar 
              dataKey="revenue" 
              name={`${selectedYear} Revenue`}
              fill="#4ade80" 
              barSize={40} 
              radius={[4, 4, 0, 0]}
              shape={<CustomBar radius={4} />}
            />
            <Line 
              type="monotone" 
              dataKey="previousYearRevenue" 
              name={`${selectedYear-1} Revenue`}
              stroke="#60a5fa" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
