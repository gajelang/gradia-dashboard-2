"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  PieChart,
  Pie,
  Sector,
  LineChart,
  Line
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Users,
  Building,
  PieChart as PieChartIcon,
  BarChart4,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Clock,
  Calendar
} from "lucide-react";
import { format, parseISO, subMonths, isValid, isSameMonth, isSameYear } from "date-fns";
import { id } from "date-fns/locale";

interface ClientContributionAnalysisProps {
  projectsData: any[];
  isLoading: boolean;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export default function ClientContributionAnalysis({
  projectsData,
  isLoading,
  dateRange,
}: ClientContributionAnalysisProps) {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [sortBy, setSortBy] = useState<"revenue" | "projects" | "profit">("revenue");
  const [activeIndex, setActiveIndex] = useState(0);

  // Extract client data from projects
  const clientData = useMemo(() => {
    if (!projectsData.length) return [];

    const clients = new Map<string, {
      id: string;
      name: string;
      revenue: number;
      expenses: number;
      profit: number;
      projects: any[];
      projectCount: number;
      completedProjects: number;
      ongoingProjects: number;
      avgProjectValue: number;
      lastProject: Date | null;
      firstProject: Date | null;
    }>();

    projectsData.forEach(project => {
      const clientId = project.clientId || "unknown";
      const clientName = project.client?.name || "Unknown Client";

      if (!clients.has(clientId)) {
        clients.set(clientId, {
          id: clientId,
          name: clientName,
          revenue: 0,
          expenses: 0,
          profit: 0,
          projects: [],
          projectCount: 0,
          completedProjects: 0,
          ongoingProjects: 0,
          avgProjectValue: 0,
          lastProject: null,
          firstProject: null
        });
      }

      const clientInfo = clients.get(clientId)!;

      // Calculate revenue based on payment status
      let revenue = 0;
      if (project.paymentStatus === "Lunas") {
        revenue = project.projectValue || 0;
      } else if (project.paymentStatus === "DP") {
        revenue = project.downPaymentAmount || 0;
      }

      // Calculate expenses
      const expenses = project.expenses?.reduce(
        (sum: number, expense: any) => sum + (expense.amount || 0),
        0
      ) || 0;

      // Update client data
      clientInfo.revenue += revenue;
      clientInfo.expenses += expenses;
      clientInfo.profit += (revenue - expenses);
      clientInfo.projects.push(project);
      clientInfo.projectCount += 1;

      if (project.paymentStatus === "Lunas") {
        clientInfo.completedProjects += 1;
      } else {
        clientInfo.ongoingProjects += 1;
      }

      // Track first and last project dates
      if (project.startDate && isValid(parseISO(project.startDate))) {
        const startDate = parseISO(project.startDate);

        if (!clientInfo.firstProject || startDate < clientInfo.firstProject) {
          clientInfo.firstProject = startDate;
        }

        if (!clientInfo.lastProject || startDate > clientInfo.lastProject) {
          clientInfo.lastProject = startDate;
        }
      }
    });

    // Calculate average project value
    clients.forEach(client => {
      client.avgProjectValue = client.projectCount > 0
        ? client.revenue / client.projectCount
        : 0;
    });

    // Convert to array and sort
    return Array.from(clients.values());
  }, [projectsData]);

  // Sort client data
  const sortedClientData = useMemo(() => {
    if (!clientData.length) return [];

    return [...clientData].sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return b.revenue - a.revenue;
        case "projects":
          return b.projectCount - a.projectCount;
        case "profit":
          return b.profit - a.profit;
        default:
          return b.revenue - a.revenue;
      }
    });
  }, [clientData, sortBy]);

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    return clientData.reduce((sum, client) => sum + client.revenue, 0);
  }, [clientData]);

  // Calculate total profit
  const totalProfit = useMemo(() => {
    return clientData.reduce((sum, client) => sum + client.profit, 0);
  }, [clientData]);

  // Calculate client engagement over time
  const clientEngagement = useMemo(() => {
    if (!projectsData.length || !dateRange.from || !dateRange.to) return [];

    // Create a map of months
    const months = new Map<string, {
      month: string;
      date: Date;
      uniqueClients: Set<string>;
      revenue: number;
      newClients: Set<string>;
    }>();

    // Initialize months in the date range
    let currentDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);

    while (currentDate <= endDate) {
      const monthKey = format(currentDate, "yyyy-MM");
      const monthName = format(currentDate, "MMM yyyy", { locale: id });

      months.set(monthKey, {
        month: monthName,
        date: new Date(currentDate),
        uniqueClients: new Set(),
        revenue: 0,
        newClients: new Set()
      });

      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }

    // Track all clients we've seen before each month
    const seenClients = new Set<string>();

    // Process projects
    projectsData.forEach(project => {
      if (!project.startDate || !isValid(parseISO(project.startDate))) return;

      const startDate = parseISO(project.startDate);
      const monthKey = format(startDate, "yyyy-MM");

      if (!months.has(monthKey)) return; // Skip if outside date range

      const clientId = project.clientId || "unknown";
      const monthData = months.get(monthKey)!;

      // Add to unique clients for this month
      monthData.uniqueClients.add(clientId);

      // Calculate revenue based on payment status
      let revenue = 0;
      if (project.paymentStatus === "Lunas") {
        revenue = project.projectValue || 0;
      } else if (project.paymentStatus === "DP") {
        revenue = project.downPaymentAmount || 0;
      }

      monthData.revenue += revenue;

      // Check if this is a new client
      if (!seenClients.has(clientId)) {
        monthData.newClients.add(clientId);
        seenClients.add(clientId);
      }
    });

    // Convert to array and sort by date
    return Array.from(months.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(data => ({
        name: data.month,
        clients: data.uniqueClients.size,
        revenue: data.revenue,
        newClients: data.newClients.size
      }));
  }, [projectsData, dateRange]);

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="p-2 bg-white shadow-md border">
          <p className="font-medium">{data.name}</p>
          <div className="text-sm space-y-1 mt-1">
            <p>
              Revenue: <span className="font-medium">{formatRupiah(data.revenue)}</span>
            </p>
            <p>
              Profit: <span className="font-medium">{formatRupiah(data.profit)}</span>
            </p>
            <p>
              Projects: <span className="font-medium">{data.projectCount}</span>
            </p>
            <p>
              Avg Project Value: <span className="font-medium">{formatRupiah(data.avgProjectValue)}</span>
            </p>
          </div>
        </Card>
      );
    }
    return null;
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
          {formatRupiah(value)}
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

  // Get color for client
  const getClientColor = (index: number) => {
    const colors = [
      "#3b82f6", "#10b981", "#f97316", "#8b5cf6",
      "#ec4899", "#14b8a6", "#f59e0b", "#6366f1"
    ];
    return colors[index % colors.length];
  };

  // Calculate client loyalty metrics
  const loyaltyMetrics = useMemo(() => {
    if (!clientData.length) {
      return {
        repeatClients: 0,
        repeatRate: 0,
        avgProjectsPerClient: 0,
        topClient: null
      };
    }

    const repeatClients = clientData.filter(client => client.projectCount > 1).length;
    const repeatRate = (repeatClients / clientData.length) * 100;
    const avgProjectsPerClient = projectsData.length / clientData.length;
    let topClient = clientData.length > 0 ? clientData[0] : null;
    for (let i = 1; i < clientData.length; i++) {
      if (clientData[i].projectCount > (topClient?.projectCount || 0)) {
        topClient = clientData[i];
      }
    }

    return {
      repeatClients,
      repeatRate,
      avgProjectsPerClient,
      topClient
    };
  }, [clientData, projectsData.length]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
      {/* Client Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientData.length}
            </div>
            <div className="flex items-center mt-1 text-xs">
              <div className="flex items-center">
                <span className="text-muted-foreground">
                  With {projectsData.length} total projects
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Loyalty */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Client Loyalty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loyaltyMetrics.repeatRate.toFixed(1)}%
            </div>
            <div className="flex items-center mt-1 text-xs">
              <div className="flex items-center">
                <span className="text-muted-foreground">
                  {loyaltyMetrics.repeatClients} repeat clients ({loyaltyMetrics.avgProjectsPerClient.toFixed(1)} projects per client)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Client */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loyaltyMetrics.topClient?.name || "N/A"}
            </div>
            <div className="flex items-center mt-1 text-xs">
              <div className="flex items-center">
                <span className="text-muted-foreground">
                  {loyaltyMetrics.topClient?.projectCount || 0} projects (
                  {formatRupiah(loyaltyMetrics.topClient?.revenue || 0)} revenue)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Contribution Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Client Contribution</CardTitle>
              <CardDescription>
                Analyze revenue and project distribution by client
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="projects">Project Count</SelectItem>
                  <SelectItem value="profit">Profit</SelectItem>
                </SelectContent>
              </Select>

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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedClientData.length > 0 ? (
            <div className="h-[400px]">
              {chartType === "bar" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedClientData.slice(0, 10)} // Show top 10 clients
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      tickMargin={20}
                    />
                    <YAxis
                      tickFormatter={(value) => `Rp${formatRupiah(value)}`}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar
                      dataKey={sortBy === "projects" ? "projectCount" : (sortBy === "profit" ? "profit" : "revenue")}
                      name={sortBy === "projects" ? "Project Count" : (sortBy === "profit" ? "Profit" : "Revenue")}
                      radius={[4, 4, 0, 0]}
                    >
                      {sortedClientData.slice(0, 10).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getClientColor(index)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={sortedClientData.slice(0, 10)}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={140}
                      dataKey={sortBy === "projects" ? "projectCount" : (sortBy === "profit" ? "profit" : "revenue")}
                      onMouseEnter={onPieEnter}
                    >
                      {sortedClientData.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getClientColor(index)} />
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
                <p className="text-muted-foreground">No client data available</p>
                <p className="text-sm text-muted-foreground mt-1">Try changing your date range</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Engagement Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Client Engagement Over Time</CardTitle>
          <CardDescription>
            Track client acquisition and revenue trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientEngagement.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={clientEngagement}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tickFormatter={(value) => `${value}`}
                    label={{ value: 'Clients', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `Rp${formatRupiah(value)}`}
                    label={{ value: 'Revenue', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="clients"
                    name="Active Clients"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="newClients"
                    name="New Clients"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p className="text-muted-foreground">No engagement data available</p>
                <p className="text-sm text-muted-foreground mt-1">Try changing your date range</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
          <CardDescription>
            Detailed breakdown of client performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Project</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClientData.map((client) => {
                  const profitMargin = client.revenue > 0
                    ? (client.profit / client.revenue) * 100
                    : 0;

                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-right">{client.projectCount}</TableCell>
                      <TableCell className="text-right">{formatRupiah(client.revenue)}</TableCell>
                      <TableCell className="text-right">
                        <span className={client.profit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          {formatRupiah(Math.abs(client.profit))}
                          {client.profit < 0 && " (Loss)"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={
                          profitMargin < 0 ? "bg-red-100 text-red-800" :
                          profitMargin < 10 ? "bg-orange-100 text-orange-800" :
                          profitMargin < 20 ? "bg-amber-100 text-amber-800" :
                          profitMargin < 30 ? "bg-lime-100 text-lime-800" :
                          "bg-green-100 text-green-800"
                        }>
                          {profitMargin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client.ongoingProjects > 0 ? (
                          <Badge className="bg-blue-100 text-blue-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.lastProject
                          ? format(client.lastProject, "dd MMM yyyy", { locale: id })
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
