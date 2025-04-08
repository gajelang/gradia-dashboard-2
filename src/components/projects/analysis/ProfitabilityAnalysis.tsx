"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
  PieChart,
  Pie,
  Sector
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  SortAsc,
  Clock,
  BarChart4,
  PieChart as PieChartIcon
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

interface ProfitabilityAnalysisProps {
  projectsData: any[];
  isLoading: boolean;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export default function ProfitabilityAnalysis({
  projectsData,
  isLoading,
  dateRange,
}: ProfitabilityAnalysisProps) {
  const [sortByPercentage, setSortByPercentage] = useState(true);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [activeIndex, setActiveIndex] = useState(0);

  // Calculate profitability data
  const profitabilityData = useMemo(() => {
    if (!projectsData.length) return [];

    return projectsData.map(project => {
      // Calculate total expenses
      const totalExpenses = project.expenses?.reduce(
        (sum: number, expense: any) => sum + (expense.amount || 0),
        0
      ) || 0;

      // Calculate revenue based on payment status
      let revenue = 0;
      if (project.paymentStatus === "Lunas") {
        revenue = project.projectValue || 0;
      } else if (project.paymentStatus === "DP") {
        revenue = project.downPaymentAmount || 0;
      }

      // Calculate profit
      const profit = revenue - totalExpenses;

      // Calculate profit margin
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      // Determine if project is in progress
      const isInProgress = project.paymentStatus === "DP" ||
        (project.endDate && new Date(project.endDate) > new Date());

      return {
        id: project.id,
        name: project.name,
        profitMargin,
        profit,
        revenue,
        expenses: totalExpenses,
        inProgress: isInProgress,
        client: project.client?.name || "Unknown Client",
        paymentStatus: project.paymentStatus,
        startDate: project.startDate,
        endDate: project.endDate
      };
    });
  }, [projectsData]);

  // Sort projects by profit margin or profit amount
  const sortedProjects = useMemo(() => {
    if (!profitabilityData.length) return [];

    return [...profitabilityData].sort((a, b) => {
      if (sortByPercentage) {
        return b.profitMargin - a.profitMargin;
      } else {
        return b.profit - a.profit;
      }
    });
  }, [profitabilityData, sortByPercentage]);

  // Prepare data for pie chart
  const pieChartData = useMemo(() => {
    if (!profitabilityData.length) return [];

    // Group by profitability ranges
    const ranges = [
      { name: "Loss", min: -Infinity, max: 0 },
      { name: "0-10%", min: 0, max: 10 },
      { name: "10-20%", min: 10, max: 20 },
      { name: "20-30%", min: 20, max: 30 },
      { name: "30-40%", min: 30, max: 40 },
      { name: "40%+", min: 40, max: Infinity }
    ];

    const data = ranges.map(range => {
      const projects = profitabilityData.filter(
        p => p.profitMargin >= range.min && p.profitMargin < range.max
      );

      return {
        name: range.name,
        value: projects.length,
        projects
      };
    });

    // Filter out ranges with no projects
    return data.filter(d => d.value > 0);
  }, [profitabilityData]);

  // Calculate overall profitability metrics
  const profitabilityMetrics = useMemo(() => {
    if (!profitabilityData.length) {
      return {
        totalProfit: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        averageProfitMargin: 0,
        profitableProjects: 0,
        unprofitableProjects: 0,
        highestProfitMargin: 0,
        lowestProfitMargin: 0,
        highestProfitProject: null as any,
        lowestProfitProject: null as any
      };
    }

    let totalProfit = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let profitableProjects = 0;
    let unprofitableProjects = 0;
    let highestProfitMargin = -Infinity;
    let lowestProfitMargin = Infinity;
    let highestProfitProject = null;
    let lowestProfitProject = null;

    profitabilityData.forEach(project => {
      totalProfit += project.profit;
      totalRevenue += project.revenue;
      totalExpenses += project.expenses;

      if (project.profit > 0) {
        profitableProjects++;
      } else {
        unprofitableProjects++;
      }

      if (project.profitMargin > highestProfitMargin) {
        highestProfitMargin = project.profitMargin;
        highestProfitProject = project;
      }

      if (project.profitMargin < lowestProfitMargin) {
        lowestProfitMargin = project.profitMargin;
        lowestProfitProject = project;
      }
    });

    const averageProfitMargin = totalRevenue > 0
      ? (totalProfit / totalRevenue) * 100
      : 0;

    return {
      totalProfit,
      totalRevenue,
      totalExpenses,
      averageProfitMargin,
      profitableProjects,
      unprofitableProjects,
      highestProfitMargin,
      lowestProfitMargin,
      highestProfitProject,
      lowestProfitProject
    };
  }, [profitabilityData]);

  // Get bar color based on profit margin
  const getBarColor = (profitMargin: number) => {
    if (profitMargin < 0) return "#ef4444"; // Red for negative
    if (profitMargin < 10) return "#f97316"; // Orange for low
    if (profitMargin < 20) return "#eab308"; // Yellow for medium-low
    if (profitMargin < 30) return "#84cc16"; // Light green for medium
    if (profitMargin < 40) return "#22c55e"; // Green for medium-high
    return "#10b981"; // Emerald for high
  };

  // Get pie chart colors
  const getPieColor = (index: number) => {
    const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#10b981"];
    return colors[index % colors.length];
  };

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="p-2 bg-white shadow-md border">
          <p className="font-medium">{data.name}</p>
          <div className="text-sm space-y-1 mt-1">
            <p>
              Profit Margin: <span className="font-medium">{data.profitMargin.toFixed(1)}%</span>
            </p>
            <p>
              Profit: <span className="font-medium">{formatRupiah(data.profit)}</span>
            </p>
            <p>
              Revenue: <span className="font-medium">{formatRupiah(data.revenue)}</span>
            </p>
            <p>
              Expenses: <span className="font-medium">{formatRupiah(data.expenses)}</span>
            </p>
            <p>
              Status: <span className="font-medium">{data.inProgress ? "In Progress" : "Completed"}</span>
            </p>
          </div>
        </Card>
      );
    }
    return null;
  };

  // Custom label for bar chart
  const CustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width + 5}
        y={y + 15}
        fill="#6b7280"
        fontSize={12}
        textAnchor="start"
      >
        {value.toFixed(1)}%
      </text>
    );
  };

  // Render active shape for pie chart
  const renderActiveShape = (props: any) => {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value
    } = props;

    return (
      <g>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#888">
          {payload.name}
        </text>
        <text x={cx} y={cy} textAnchor="middle" fill="#333" fontSize={18} fontWeight={500}>
          {value} projects
        </text>
        <text x={cx} y={cy} dy={20} textAnchor="middle" fill="#888">
          {(percent * 100).toFixed(1)}%
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={innerRadius - 5}
          outerRadius={outerRadius}
          fill={fill}
        />
      </g>
    );
  };

  // Handle pie chart hover
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profitability Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Profit */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRupiah(profitabilityMetrics.totalProfit)}
            </div>
            <div className="flex items-center mt-1 text-xs">
              <div className="flex items-center">
                <span className="text-muted-foreground">
                  From {formatRupiah(profitabilityMetrics.totalRevenue)} revenue
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Profit Margin */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Profit Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profitabilityMetrics.averageProfitMargin.toFixed(1)}%
            </div>
            <div className="flex items-center mt-1 text-xs">
              <div className="flex items-center">
                <span className="text-muted-foreground">
                  Across {profitabilityData.length} projects
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profitable vs Unprofitable */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profitable vs Unprofitable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profitabilityMetrics.profitableProjects} / {profitabilityMetrics.unprofitableProjects}
            </div>
            <div className="flex items-center mt-1 text-xs">
              <div className="flex items-center">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-600 mr-2">
                  {profitabilityMetrics.profitableProjects} profitable
                </span>
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-red-600">
                  {profitabilityMetrics.unprofitableProjects} unprofitable
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Highest Profit Margin */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highest Profit Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profitabilityMetrics.highestProfitMargin.toFixed(1)}%
            </div>
            <div className="flex items-center mt-1 text-xs">
              <div className="flex items-center">
                <span className="text-muted-foreground">
                  {profitabilityMetrics.highestProfitProject?.name || "N/A"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profitability Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Project Profitability</CardTitle>
              <CardDescription>
                Analyze profit margins and amounts across projects
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={chartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("bar")}
              >
                <BarChart4 className="h-4 w-4 mr-2" />
                Bar Chart
              </Button>
              <Button
                variant={chartType === "pie" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("pie")}
              >
                <PieChartIcon className="h-4 w-4 mr-2" />
                Pie Chart
              </Button>
              {chartType === "bar" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortByPercentage(!sortByPercentage)}
                >
                  <SortAsc className="h-4 w-4 mr-2" />
                  Sort by {sortByPercentage ? "Profit Amount" : "Profit Margin"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedProjects.length > 0 ? (
            <div className="h-[500px]">
              {chartType === "bar" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={sortedProjects.slice(0, 15)} // Limit to top 15 for readability
                    margin={{ top: 20, right: 70, left: 120, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => sortByPercentage ? `${value}%` : formatRupiah(value)}
                      domain={sortByPercentage ? [0, 100] : [0, 'auto']}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tick={({ x, y, payload }) => {
                        const project = sortedProjects.find(p => p.name === payload.value);
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={-10} y={0} dy={4} textAnchor="end" fill="#6b7280" fontSize={12}>
                              {payload.value.length > 15
                                ? `${payload.value.substring(0, 15)}...`
                                : payload.value}
                              {project?.inProgress && " 🔄"}
                            </text>
                          </g>
                        );
                      }}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar
                      dataKey={sortByPercentage ? "profitMargin" : "profit"}
                      name={sortByPercentage ? "Profit Margin %" : "Profit Amount"}
                      radius={[0, 4, 4, 0]}
                    >
                      {sortedProjects.slice(0, 15).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getBarColor(entry.profitMargin)}
                        />
                      ))}
                      {sortByPercentage && (
                        <LabelList
                          dataKey="profitMargin"
                          position="right"
                          content={<CustomBarLabel />}
                        />
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={140}
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getPieColor(index)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p className="text-muted-foreground">No profitability data available</p>
                <p className="text-sm text-muted-foreground mt-1">Try changing your date range</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profitability Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Profitability Details</CardTitle>
          <CardDescription>
            Detailed breakdown of project profitability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Project</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Expenses</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Profit</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Margin</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((project) => (
                  <tr key={project.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-muted-foreground">{project.client}</div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      {formatRupiah(project.revenue)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-rose-600">
                      {formatRupiah(project.expenses)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      <span className={project.profit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {formatRupiah(Math.abs(project.profit))}
                        {project.profit < 0 && " (Loss)"}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <Badge className={
                        project.profitMargin < 0 ? "bg-red-100 text-red-800" :
                        project.profitMargin < 10 ? "bg-orange-100 text-orange-800" :
                        project.profitMargin < 20 ? "bg-amber-100 text-amber-800" :
                        project.profitMargin < 30 ? "bg-lime-100 text-lime-800" :
                        "bg-green-100 text-green-800"
                      }>
                        {project.profitMargin.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Badge className={
                          project.paymentStatus === "Lunas" ? "bg-green-100 text-green-800" :
                          project.paymentStatus === "DP" ? "bg-amber-100 text-amber-800" :
                          "bg-red-100 text-red-800"
                        }>
                          {project.paymentStatus}
                        </Badge>
                        {project.inProgress && (
                          <Badge variant="outline" className="ml-2">
                            <Clock className="h-3 w-3 mr-1" />
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
