"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatRupiah } from "@/lib/formatters/formatters";
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
  Treemap,
  Scatter,
  ScatterChart,
  ZAxis,
  LabelList
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Users,
  Briefcase,
  Layers,
  PieChart as PieChartIcon,
  BarChart4,
  LayoutGrid
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

interface ResourceAllocationAnalysisProps {
  projectsData: any[];
  isLoading: boolean;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export default function ResourceAllocationAnalysis({
  projectsData,
  isLoading,
  dateRange,
}: ResourceAllocationAnalysisProps) {
  const [chartType, setChartType] = useState<"category" | "treemap" | "bubble">("category");
  const [categoryType, setCategoryType] = useState<"expense" | "resource">("expense");

  // Extract expense categories from projects
  const expenseCategories = useMemo(() => {
    if (!projectsData.length) return [];

    const categories = new Map<string, { total: number, count: number, projects: any[] }>();

    projectsData.forEach(project => {
      if (!project.expenses || !project.expenses.length) return;

      project.expenses.forEach((expense: any) => {
        const category = expense.category || "Uncategorized";

        if (!categories.has(category)) {
          categories.set(category, { total: 0, count: 0, projects: [] });
        }

        const categoryData = categories.get(category)!;
        categoryData.total += expense.amount || 0;
        categoryData.count += 1;

        if (!categoryData.projects.includes(project)) {
          categoryData.projects.push(project);
        }
      });
    });

    return Array.from(categories.entries()).map(([name, data]) => ({
      name,
      value: data.total,
      count: data.count,
      projectCount: data.projects.length,
      projects: data.projects
    }));
  }, [projectsData]);

  // Extract resource types from projects
  const resourceTypes = useMemo(() => {
    if (!projectsData.length) return [];

    // Define common resource types
    const types = [
      { key: "talent", name: "Talent & Crew", keywords: ["talent", "crew", "actor", "presenter", "host", "model"] },
      { key: "equipment", name: "Equipment", keywords: ["equipment", "camera", "lighting", "sound", "gear", "alat"] },
      { key: "location", name: "Location", keywords: ["location", "venue", "studio", "tempat", "lokasi"] },
      { key: "transportation", name: "Transportation", keywords: ["transport", "travel", "car", "mobil", "bensin", "fuel"] },
      { key: "food", name: "Food & Catering", keywords: ["food", "catering", "meal", "makan", "konsumsi"] },
      { key: "postProduction", name: "Post-Production", keywords: ["editing", "post", "production", "pasca", "render"] },
      { key: "permits", name: "Permits & Licenses", keywords: ["permit", "license", "izin", "legal"] },
      { key: "marketing", name: "Marketing", keywords: ["marketing", "promotion", "promosi", "iklan", "ad"] },
      { key: "other", name: "Other", keywords: [] }
    ];

    const resourceData = types.map(type => ({
      ...type,
      value: 0,
      count: 0,
      projectCount: 0,
      projects: [] as any[]
    }));

    projectsData.forEach(project => {
      if (!project.expenses || !project.expenses.length) return;

      project.expenses.forEach((expense: any) => {
        const description = (expense.description || "").toLowerCase();
        const category = (expense.category || "").toLowerCase();

        // Find matching resource type
        let matchedType = resourceData.find(type =>
          type.key === "other" // Default to "other"
        );

        // Check for keyword matches
        for (const type of resourceData) {
          if (type.keywords.some(keyword =>
            description.includes(keyword) || category.includes(keyword)
          )) {
            matchedType = type;
            break;
          }
        }

        if (matchedType) {
          matchedType.value += expense.amount || 0;
          matchedType.count += 1;

          if (!matchedType.projects.some(p => p.id === project.id)) {
            matchedType.projects.push(project);
            matchedType.projectCount += 1;
          }
        }
      });
    });

    // Filter out types with no data
    return resourceData.filter(type => type.value > 0);
  }, [projectsData]);

  // Get data based on selected category type
  const categoryData = useMemo(() => {
    return categoryType === "expense" ? expenseCategories : resourceTypes;
  }, [categoryType, expenseCategories, resourceTypes]);

  // Prepare data for treemap
  const treemapData = useMemo(() => {
    return {
      name: "Resources",
      children: categoryData.map(category => ({
        name: category.name,
        size: category.value,
        count: category.count,
        projectCount: category.projectCount
      }))
    };
  }, [categoryData]);

  // Prepare data for bubble chart
  const bubbleData = useMemo(() => {
    return categoryData.map(category => ({
      name: category.name,
      x: category.projectCount, // x-axis: number of projects
      y: category.count, // y-axis: number of expenses
      z: category.value, // bubble size: total amount
      value: category.value
    }));
  }, [categoryData]);

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return categoryData.reduce((sum, category) => sum + category.value, 0);
  }, [categoryData]);

  // Custom tooltip for category chart
  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="p-2 bg-white shadow-md border">
          <p className="font-medium">{data.name}</p>
          <div className="text-sm space-y-1 mt-1">
            <p>
              Total: <span className="font-medium">{formatRupiah(data.value)}</span>
            </p>
            <p>
              Percentage: <span className="font-medium">{((data.value / totalExpenses) * 100).toFixed(1)}%</span>
            </p>
            <p>
              Expenses: <span className="font-medium">{data.count}</span>
            </p>
            <p>
              Projects: <span className="font-medium">{data.projectCount}</span>
            </p>
          </div>
        </Card>
      );
    }
    return null;
  };

  // Custom tooltip for treemap
  const CustomTreemapTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="p-2 bg-white shadow-md border">
          <p className="font-medium">{data.name}</p>
          <div className="text-sm space-y-1 mt-1">
            <p>
              Total: <span className="font-medium">{formatRupiah(data.size)}</span>
            </p>
            <p>
              Percentage: <span className="font-medium">{((data.size / totalExpenses) * 100).toFixed(1)}%</span>
            </p>
            <p>
              Expenses: <span className="font-medium">{data.count}</span>
            </p>
            <p>
              Projects: <span className="font-medium">{data.projectCount}</span>
            </p>
          </div>
        </Card>
      );
    }
    return null;
  };

  // Custom tooltip for bubble chart
  const CustomBubbleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="p-2 bg-white shadow-md border">
          <p className="font-medium">{data.name}</p>
          <div className="text-sm space-y-1 mt-1">
            <p>
              Total: <span className="font-medium">{formatRupiah(data.z)}</span>
            </p>
            <p>
              Projects: <span className="font-medium">{data.x}</span>
            </p>
            <p>
              Expenses: <span className="font-medium">{data.y}</span>
            </p>
            <p>
              Avg per Project: <span className="font-medium">{formatRupiah(data.x > 0 ? data.z / data.x : 0)}</span>
            </p>
          </div>
        </Card>
      );
    }
    return null;
  };

  // Get color for category
  const getCategoryColor = (index: number) => {
    const colors = [
      "#3b82f6", "#10b981", "#f97316", "#8b5cf6",
      "#ec4899", "#14b8a6", "#f59e0b", "#6366f1"
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resource Allocation Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Resource Allocation</CardTitle>
              <CardDescription>
                Analyze how resources are distributed across projects
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={categoryType} onValueChange={(value: "expense" | "resource") => setCategoryType(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense Categories</SelectItem>
                  <SelectItem value="resource">Resource Types</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={chartType === "category" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("category")}
              >
                <BarChart4 className="h-4 w-4 mr-2" />
                Bar Chart
              </Button>
              <Button
                variant={chartType === "treemap" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("treemap")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Treemap
              </Button>
              <Button
                variant={chartType === "bubble" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("bubble")}
              >
                <PieChartIcon className="h-4 w-4 mr-2" />
                Bubble Chart
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <div className="h-[500px]">
              {chartType === "category" && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
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
                    <Tooltip content={<CustomCategoryTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="value"
                      name="Total Amount"
                      radius={[4, 4, 0, 0]}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getCategoryColor(index)}
                        />
                      ))}
                      <LabelList
                        dataKey="name"
                        position="top"
                        style={{ fontSize: '12px', fill: '#6b7280' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartType === "treemap" && (
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treemapData.children}
                    dataKey="size"
                    aspectRatio={4/3}
                    stroke="#fff"
                    fill="#8884d8"
                  >
                    <Tooltip content={<CustomTreemapTooltip />} />
                    {treemapData.children.map((item, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getCategoryColor(index)}
                      />
                    ))}
                  </Treemap>
                </ResponsiveContainer>
              )}

              {chartType === "bubble" && (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Projects"
                      label={{
                        value: "Number of Projects",
                        position: "bottom",
                        offset: 10
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Expenses"
                      label={{
                        value: "Number of Expenses",
                        angle: -90,
                        position: "insideLeft",
                        offset: -10
                      }}
                    />
                    <ZAxis
                      type="number"
                      dataKey="z"
                      range={[100, 1000]}
                      name="Total Amount"
                    />
                    <Tooltip content={<CustomBubbleTooltip />} />
                    <Legend />
                    <Scatter
                      name="Resource Allocation"
                      data={bubbleData}
                      fill="#8884d8"
                    >
                      {bubbleData.map((item, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getCategoryColor(index)}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p className="text-muted-foreground">No resource allocation data available</p>
                <p className="text-sm text-muted-foreground mt-1">Try changing your date range</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource Allocation Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Resource Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Resource Categories</CardTitle>
            <CardDescription>
              Categories with highest allocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.slice(0, 5).map((category, index) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getCategoryColor(index) }}
                      ></div>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <Badge variant="outline">
                      {formatRupiah(category.value)}
                    </Badge>
                  </div>
                  <Progress
                    value={(category.value / totalExpenses) * 100}
                    className="h-2"
                    style={{ '--progress-foreground': getCategoryColor(index) } as React.CSSProperties}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{category.count} expenses</span>
                    <span>{((category.value / totalExpenses) * 100).toFixed(1)}% of total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resource Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Efficiency</CardTitle>
            <CardDescription>
              Analysis of resource utilization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Average Cost per Project */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium">Average Cost per Project</h3>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {formatRupiah(totalExpenses / (projectsData.length || 1))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on {projectsData.length} projects and {formatRupiah(totalExpenses)} total expenses
                </p>
              </div>

              {/* Resource Distribution */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-5 w-5 text-purple-500" />
                  <h3 className="font-medium">Resource Distribution</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Categories</div>
                    <div className="text-xl font-medium">{categoryData.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Expenses</div>
                    <div className="text-xl font-medium">
                      {categoryData.reduce((sum, cat) => sum + cat.count, 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resource Concentration */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-medium">Resource Concentration</h3>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Top 3 categories represent
                </div>
                {(() => {
                  const top3Total = categoryData.slice(0, 3).reduce((sum, cat) => sum + cat.value, 0);
                  const percentage = totalExpenses > 0 ? (top3Total / totalExpenses) * 100 : 0;

                  return (
                    <>
                      <div className="text-2xl font-bold mb-1">
                        {percentage.toFixed(1)}% of total
                      </div>
                      <Progress value={percentage} className="h-2 mt-2" />
                    </>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
