// src/components/ProjectProfitabilityChart.tsx
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
import { fetchWithAuth } from "@/lib/api/api";
import { formatRupiah } from "@/lib/formatters";
import { Loader2, SortAsc, Clock } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LabelList,
  Cell
} from "recharts";

interface ProjectData {
  name: string;
  profitMargin: number;
  profit: number;
  inProgress: boolean;
}

interface ChartData {
  projects: ProjectData[];
  period: string;
}

const periodOptions = [
  { value: "month", label: "Current Month" },
  { value: "quarter", label: "Current Quarter" },
  { value: "ytd", label: "Year to Date" },
  { value: "all", label: "All Time" }
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip bg-white p-3 border border-gray-200 shadow-md rounded-md">
        <p className="font-medium text-sm">{data.name}</p>
        <p className="text-sm mt-1">
          <span className="text-blue-600">Profit Margin: </span>
          <span className="font-medium">{data.profitMargin.toFixed(1)}%</span>
        </p>
        <p className="text-sm">
          <span className="text-green-600">Profit Amount: </span>
          <span className="font-medium">Rp{formatRupiah(data.profit)}</span>
        </p>
        {data.inProgress && (
          <p className="text-xs mt-1 flex items-center text-amber-600">
            <Clock className="h-3 w-3 mr-1" />
            <span>Project in progress</span>
          </p>
        )}
      </div>
    );
  }

  return null;
};

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text 
      x={x + width + 5} 
      y={y + 12} 
      fill="#6b7280" 
      textAnchor="start" 
      fontSize={12}
    >
      {value}%
    </text>
  );
};

export default function ProjectProfitabilityChart() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
  const [sortByPercentage, setSortByPercentage] = useState<boolean>(true);
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectProfitabilityData = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth(`/api/projects/profitability?period=${selectedPeriod}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch project profitability data");
        }

        const profitabilityData = await response.json();
        setData(profitabilityData);
      } catch (err) {
        console.error("Error fetching project profitability data:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectProfitabilityData();
  }, [selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const toggleSortMode = () => {
    setSortByPercentage(!sortByPercentage);
  };

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Project Profitability</CardTitle>
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
          <CardTitle className="text-lg font-medium">Project Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500 p-8 text-center">
            Failed to load project profitability data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.projects.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Project Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground p-8 text-center">
            No project data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort and limit to top projects
  const sortedProjects = [...data.projects].sort((a, b) => {
    if (sortByPercentage) {
      return b.profitMargin - a.profitMargin;
    } else {
      return b.profit - a.profit;
    }
  }).slice(0, 7);

  // Calculate gradients for bars based on profitability
  const getBarColor = (profitMargin: number, index: number) => {
    // Determine the color intensity based on profitability
    const intensity = Math.min(100, Math.max(0, profitMargin));
    
    // Higher margins get darker/more saturated colors
    return `rgba(${74 - intensity/3}, ${222 - intensity/2}, ${128 + intensity/3}, 0.8)`;
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Project Profitability</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortMode}
            className="flex items-center gap-1"
          >
            <SortAsc className="h-4 w-4" />
            <span>Sort by {sortByPercentage ? "Margin %" : "Total Profit"}</span>
          </Button>
          <Select
            value={selectedPeriod}
            onValueChange={handlePeriodChange}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={sortedProjects}
            margin={{ top: 20, right: 70, left: 30, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
            <XAxis 
              type="number" 
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={150}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tick={({ x, y, payload }) => {
                const project = sortedProjects.find(p => p.name === payload.value);
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={-10} y={0} dy={4} textAnchor="end" fill="#6b7280" fontSize={12}>
                      {payload.value.length > 18 
                        ? `${payload.value.substring(0, 18)}...` 
                        : payload.value}
                      {project?.inProgress && " 🔄"}
                    </text>
                  </g>
                );
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey={sortByPercentage ? "profitMargin" : "profit"}
              name={sortByPercentage ? "Profit Margin %" : "Profit Amount"}
              radius={[0, 4, 4, 0]}
            >
              {sortedProjects.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.profitMargin, index)} 
                />
              ))}
              {sortByPercentage && (
                <LabelList 
                  dataKey="profitMargin" 
                  position="right" 
                  content={<CustomLabel />}
                />
              )}
              {!sortByPercentage && (
                <LabelList 
                  dataKey="profit" 
                  position="right" 
                  formatter={(value: number) => `Rp${formatRupiah(value)}`}
                  fill="#6b7280"
                  fontSize={12}
                />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}