"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  Line,
  ComposedChart
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";

interface ProjectPerformanceDashboardProps {
  projectsData: any[];
  isLoading: boolean;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export default function ProjectPerformanceDashboard({
  projectsData,
  isLoading,
  dateRange,
}: ProjectPerformanceDashboardProps) {
  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!projectsData.length) {
      return {
        totalProjects: 0,
        totalValue: 0,
        totalPaid: 0,
        totalRemaining: 0,
        collectionRate: 0,
        completedProjects: 0,
        inProgressProjects: 0,
        completionRate: 0,
      };
    }

    let totalValue = 0;
    let totalPaid = 0;
    let completedProjects = 0;
    let inProgressProjects = 0;

    projectsData.forEach((project) => {
      const projectValue = project.projectValue || 0;
      totalValue += projectValue;

      if (project.paymentStatus === "Lunas") {
        totalPaid += projectValue;
        completedProjects++;
      } else if (project.paymentStatus === "DP") {
        totalPaid += project.downPaymentAmount || 0;
        inProgressProjects++;
      } else {
        inProgressProjects++;
      }
    });

    const totalRemaining = totalValue - totalPaid;
    const collectionRate = totalValue > 0 ? (totalPaid / totalValue) * 100 : 0;
    const completionRate = projectsData.length > 0
      ? (completedProjects / projectsData.length) * 100
      : 0;

    return {
      totalProjects: projectsData.length,
      totalValue,
      totalPaid,
      totalRemaining,
      collectionRate,
      completedProjects,
      inProgressProjects,
      completionRate,
    };
  }, [projectsData]);

  // Prepare monthly performance data
  const monthlyPerformanceData = useMemo(() => {
    if (!projectsData.length) return [];

    const monthlyData = new Map();

    projectsData.forEach((project) => {
      const startDate = project.startDate ? new Date(project.startDate) : null;
      if (!startDate) return;

      const monthKey = startDate.toISOString().substring(0, 7); // YYYY-MM
      const monthName = startDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          name: monthName,
          expected: 0,
          paid: 0,
          remaining: 0,
          count: 0,
        });
      }

      const monthData = monthlyData.get(monthKey);
      const projectValue = project.projectValue || 0;

      monthData.expected += projectValue;
      monthData.count += 1;

      if (project.paymentStatus === "Lunas") {
        monthData.paid += projectValue;
      } else if (project.paymentStatus === "DP") {
        monthData.paid += project.downPaymentAmount || 0;
        monthData.remaining += project.remainingAmount || (projectValue - (project.downPaymentAmount || 0));
      } else {
        monthData.remaining += projectValue;
      }
    });

    // Convert Map to array and sort by month
    return Array.from(monthlyData.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projectsData]);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-2 bg-white shadow-md border">
          <p className="font-medium">{label}</p>
          <div className="text-sm space-y-1 mt-1">
            <p className="text-gray-600">
              Expected: <span className="font-medium">{formatRupiah(payload[0].value)}</span>
            </p>
            <p className="text-emerald-600">
              Paid: <span className="font-medium">{formatRupiah(payload[1].value)}</span>
            </p>
            <p className="text-rose-600">
              Remaining: <span className="font-medium">{formatRupiah(payload[2].value)}</span>
            </p>
          </div>
        </Card>
      );
    }
    return null;
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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Project Value */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Project Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRupiah(kpis.totalValue)}
            </div>
            <div className="flex items-center mt-1 text-xs">
              <div className="flex items-center">
                <span className="text-muted-foreground">
                  {kpis.totalProjects} projects
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.collectionRate.toFixed(1)}%
            </div>
            <div className="mt-2">
              <Progress value={kpis.collectionRate} className="h-2" />
            </div>
            <div className="flex justify-between mt-1 text-xs">
              <span className="text-muted-foreground">
                Paid: {formatRupiah(kpis.totalPaid)}
              </span>
              <span className="text-muted-foreground">
                Remaining: {formatRupiah(kpis.totalRemaining)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Project Completion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Project Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.completionRate.toFixed(1)}%
            </div>
            <div className="mt-2">
              <Progress value={kpis.completionRate} className="h-2" />
            </div>
            <div className="flex justify-between mt-1 text-xs">
              <span className="text-muted-foreground">
                <CheckCircle2 className="inline h-3 w-3 mr-1 text-green-500" />
                Completed: {kpis.completedProjects}
              </span>
              <span className="text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1 text-amber-500" />
                In Progress: {kpis.inProgressProjects}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Average Project Value */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Project Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRupiah(kpis.totalProjects > 0 ? kpis.totalValue / kpis.totalProjects : 0)}
            </div>
            <div className="flex items-center mt-1 text-xs">
              <div className="flex items-center">
                <span className="text-muted-foreground">
                  Based on {kpis.totalProjects} projects
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Project Performance</CardTitle>
          <CardDescription>
            Comparison of expected, paid, and remaining values by month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {monthlyPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(value) => `Rp${formatRupiah(value)}`}
                    width={100}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 'auto']}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="expected"
                    name="Expected Value"
                    fill="#94a3b8"
                    barSize={20}
                    yAxisId="left"
                  />
                  <Bar
                    dataKey="paid"
                    name="Paid"
                    fill="#10b981"
                    barSize={20}
                    yAxisId="left"
                  />
                  <Bar
                    dataKey="remaining"
                    name="Remaining"
                    fill="#ef4444"
                    barSize={20}
                    yAxisId="left"
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Project Count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    yAxisId="right"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-muted-foreground">No project data available for the selected period</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Project Status Summary</CardTitle>
          <CardDescription>
            Overview of project statuses and payment conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Payment Status */}
            <div>
              <h3 className="font-medium mb-3">Payment Status</h3>
              <div className="space-y-2">
                {[
                  { status: "Lunas", color: "bg-green-100 text-green-800" },
                  { status: "DP", color: "bg-amber-100 text-amber-800" },
                  { status: "Belum Bayar", color: "bg-red-100 text-red-800" },
                ].map((item) => {
                  const count = projectsData.filter(
                    (p) => p.paymentStatus === item.status
                  ).length;
                  const percentage = projectsData.length > 0
                    ? (count / projectsData.length) * 100
                    : 0;

                  return (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge className={item.color} variant="outline">
                          {item.status}
                        </Badge>
                        <span className="ml-2">{count} projects</span>
                      </div>
                      <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Project Timeline */}
            <div>
              <h3 className="font-medium mb-3">Project Timeline</h3>
              <div className="space-y-2">
                {(() => {
                  const now = new Date();

                  const onTime = projectsData.filter(p => {
                    if (!p.endDate) return false;
                    const endDate = new Date(p.endDate);
                    return endDate >= now || p.paymentStatus === "Lunas";
                  }).length;

                  const delayed = projectsData.filter(p => {
                    if (!p.endDate) return false;
                    const endDate = new Date(p.endDate);
                    return endDate < now && p.paymentStatus !== "Lunas";
                  }).length;

                  const noEndDate = projectsData.filter(p => !p.endDate).length;

                  const onTimePercentage = projectsData.length > 0
                    ? (onTime / projectsData.length) * 100
                    : 0;

                  const delayedPercentage = projectsData.length > 0
                    ? (delayed / projectsData.length) * 100
                    : 0;

                  const noEndDatePercentage = projectsData.length > 0
                    ? (noEndDate / projectsData.length) * 100
                    : 0;

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Badge className="bg-green-100 text-green-800" variant="outline">
                            On Time
                          </Badge>
                          <span className="ml-2">{onTime} projects</span>
                        </div>
                        <span className="font-medium">{onTimePercentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Badge className="bg-red-100 text-red-800" variant="outline">
                            Delayed
                          </Badge>
                          <span className="ml-2">{delayed} projects</span>
                        </div>
                        <span className="font-medium">{delayedPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Badge className="bg-gray-100 text-gray-800" variant="outline">
                            No End Date
                          </Badge>
                          <span className="ml-2">{noEndDate} projects</span>
                        </div>
                        <span className="font-medium">{noEndDatePercentage.toFixed(1)}%</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Value Distribution */}
            <div>
              <h3 className="font-medium mb-3">Value Distribution</h3>
              <div className="space-y-2">
                {(() => {
                  // Define value ranges
                  const ranges = [
                    { name: "< 5 Juta", max: 5000000 },
                    { name: "5-20 Juta", min: 5000000, max: 20000000 },
                    { name: "20-50 Juta", min: 20000000, max: 50000000 },
                    { name: "50-100 Juta", min: 50000000, max: 100000000 },
                    { name: "> 100 Juta", min: 100000000 },
                  ];

                  return ranges.map(range => {
                    const count = projectsData.filter(p => {
                      const value = p.projectValue || 0;
                      if (range.min && range.max) {
                        return value >= range.min && value < range.max;
                      } else if (range.min) {
                        return value >= range.min;
                      } else if (range.max) {
                        return value < range.max;
                      }
                      return false;
                    }).length;

                    const percentage = projectsData.length > 0
                      ? (count / projectsData.length) * 100
                      : 0;

                    return (
                      <div key={range.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Badge className="bg-blue-100 text-blue-800" variant="outline">
                            {range.name}
                          </Badge>
                          <span className="ml-2">{count} projects</span>
                        </div>
                        <span className="font-medium">{percentage.toFixed(1)}%</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
