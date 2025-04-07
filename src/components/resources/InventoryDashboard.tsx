"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/formatters";
import { formatDate } from "@/lib/dateUtils";
import {
  Package2,
  AlertTriangle,
  Calendar,
  Tag,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Percent,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ShoppingCart,
  Building,
  CalendarClock,
  CheckCircle
} from "lucide-react";
import { ResourceErrorBoundary } from "./ResourceErrorBoundary";
import useInventoryData from "@/hooks/useInventoryData";
import useSubscriptionData from "@/hooks/useSubscriptionData";
import ResourceStats from "./ResourceStats";
import ResourceEmptyState from "./ResourceEmptyState";

// Dummy chart component - in a real app, you would use a charting library like recharts
const DummyChart = ({ type, height = 300 }: { type: string, height?: number }) => {
  return (
    <div
      className="flex items-center justify-center bg-muted/20 rounded-md border"
      style={{ height: `${height}px` }}
    >
      <div className="text-center">
        <div className="mb-2">
          {type === 'bar' && <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto" />}
          {type === 'pie' && <PieChart className="h-10 w-10 text-muted-foreground mx-auto" />}
          {type === 'line' && <LineChart className="h-10 w-10 text-muted-foreground mx-auto" />}
        </div>
        <p className="text-sm text-muted-foreground">
          {type === 'bar' && 'Bar Chart'}
          {type === 'pie' && 'Pie Chart'}
          {type === 'line' && 'Line Chart'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          (Placeholder - Implement with actual chart library)
        </p>
      </div>
    </div>
  );
};

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Use our custom hooks for data
  const {
    inventory,
    archivedInventory,
    categories,
    loading: inventoryLoading,
    error: inventoryError,
    stats,
    refreshData: refreshInventory,
  } = useInventoryData({ includeArchived: true });

  const {
    subscriptions,
    dueSoon,
    loading: subscriptionLoading,
    error: subscriptionError,
    refreshData: refreshSubscriptions,
  } = useSubscriptionData();

  const loading = inventoryLoading || subscriptionLoading;
  const error = inventoryError || subscriptionError;

  // Refresh all data
  const refreshAllData = () => {
    refreshInventory();
    refreshSubscriptions();
  };

  // Calculate inventory by category for pie chart
  const inventoryByCategory = categories.map(category => {
    // Filter out archived items
    const items = inventory.filter(item => item.category === category && !item.isDeleted);
    const totalValue = items.reduce((sum, item) => {
      const value = typeof item.totalValue === 'string' ? parseFloat(item.totalValue) : (item.totalValue || 0);
      return sum + value;
    }, 0);
    return { category, count: items.length, totalValue };
  }).sort((a, b) => b.totalValue - a.totalValue);

  // Get low stock items
  const lowStockItems = inventory.filter(item =>
    !item.isDeleted &&
    item.type !== "SUBSCRIPTION" &&
    (item.quantity || 0) <= (item.minimumStock || 0) &&
    (item.quantity || 0) > 0
  ).sort((a, b) => (a.quantity || 0) - (b.quantity || 0));

  // Get upcoming subscription renewals
  const upcomingRenewals = subscriptions
    .filter(sub => sub.nextBillingDate)
    .sort((a, b) =>
      new Date(a.nextBillingDate || '').getTime() -
      new Date(b.nextBillingDate || '').getTime()
    )
    .slice(0, 5);

  // Calculate total inventory value trend (dummy data for now)
  const valueTrend = {
    percentage: 12.5,
    isPositive: true,
    label: "vs. last month"
  };

  // Calculate subscription cost trend (dummy data for now)
  const subscriptionTrend = {
    percentage: 5.2,
    isPositive: false,
    label: "vs. last month"
  };

  return (
    <ResourceErrorBoundary onReset={refreshAllData}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold">Inventory Dashboard</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </>
            )}
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error.message}
              <Button
                variant="link"
                className="p-0 h-auto font-normal ml-2"
                onClick={refreshAllData}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <ResourceStats stats={stats} isLoading={loading} />

        {/* Low stock warning */}
        {!loading && stats.lowStockItems > 0 && (
          <Alert className="bg-amber-50 border-amber-200 mb-6">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Low Stock Warning</AlertTitle>
            <AlertDescription>
              {stats.lowStockItems} items are below minimum stock levels. Please consider restocking soon.
            </AlertDescription>
          </Alert>
        )}

        {/* Upcoming renewals warning */}
        {!loading && stats.upcomingRenewals > 0 && (
          <Alert className="bg-blue-50 border-blue-200 mb-6">
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertTitle>Upcoming Subscription Renewals</AlertTitle>
            <AlertDescription>
              {stats.upcomingRenewals} subscriptions are due for renewal in the next 30 days.
            </AlertDescription>
          </Alert>
        )}

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package2 className="h-4 w-4" />
              Inventory Analysis
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Subscription Analysis
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Value and Cost Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Total Inventory Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold">{formatRupiah(stats.totalValue)}</p>
                      <p className="flex items-center text-sm mt-1">
                        {valueTrend.isPositive ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={valueTrend.isPositive ? "text-green-500" : "text-red-500"}>
                          {valueTrend.percentage}%
                        </span>
                        <span className="text-muted-foreground ml-1">{valueTrend.label}</span>
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full">
                      <TrendingUp className="h-6 w-6 text-green-500" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <DummyChart type="line" height={200} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Monthly Subscription Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold">{formatRupiah(stats.subscriptionCost)}</p>
                      <p className="flex items-center text-sm mt-1">
                        {subscriptionTrend.isPositive ? (
                          <ArrowUpRight className="h-4 w-4 text-red-500 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-green-500 mr-1" />
                        )}
                        <span className={subscriptionTrend.isPositive ? "text-red-500" : "text-green-500"}>
                          {subscriptionTrend.percentage}%
                        </span>
                        <span className="text-muted-foreground ml-1">{subscriptionTrend.label}</span>
                      </p>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-full">
                      <CreditCard className="h-6 w-6 text-rose-500" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <DummyChart type="line" height={200} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock and Upcoming Renewals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                    Low Stock Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lowStockItems.length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-muted-foreground">All items are well stocked</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {lowStockItems.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-amber-600 font-medium">{item.quantity} / {item.minimumStock}</p>
                            <p className="text-xs text-muted-foreground">Current / Minimum</p>
                          </div>
                        </div>
                      ))}

                      {lowStockItems.length > 5 && (
                        <p className="text-sm text-center text-muted-foreground pt-2">
                          + {lowStockItems.length - 5} more items
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center">
                    <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                    Upcoming Renewals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingRenewals.length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-muted-foreground">No upcoming renewals in the next 30 days</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingRenewals.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="font-medium">{sub.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Building className="h-3 w-3 mr-1" />
                              {sub.vendor?.name || 'No vendor'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-blue-600 font-medium">{formatDate(sub.nextBillingDate)}</p>
                            <p className="text-xs text-muted-foreground">{formatRupiah(sub.cost)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Inventory Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Inventory Distribution by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <DummyChart type="pie" height={300} />
                  </div>
                  <div className="space-y-4">
                    {inventoryByCategory.slice(0, 6).map((cat, index) => (
                      <div key={cat.category || 'uncategorized'} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full bg-${
                            ['blue', 'green', 'amber', 'purple', 'rose', 'indigo'][index % 6]
                          }-500 mr-2`}></div>
                          <span className="font-medium">{cat.category || 'Uncategorized'}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatRupiah(cat.totalValue)}</p>
                          <p className="text-xs text-muted-foreground">{cat.count} items</p>
                        </div>
                      </div>
                    ))}

                    {inventoryByCategory.length > 6 && (
                      <p className="text-sm text-center text-muted-foreground pt-2">
                        + {inventoryByCategory.length - 6} more categories
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Analysis Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Inventory Value by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <DummyChart type="bar" height={350} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Inventory Quantity by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <DummyChart type="bar" height={350} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Inventory Value Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <DummyChart type="line" height={350} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Top Inventory by Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inventory
                      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
                      .slice(0, 5)
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatRupiah(item.totalValue || 0)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Top Inventory by Quantity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inventory
                      .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
                      .slice(0, 5)
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{item.quantity} units</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Recently Added</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inventory
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 5)
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Subscription Analysis Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Monthly Subscription Cost Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <DummyChart type="line" height={350} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Subscription Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <DummyChart type="pie" height={350} />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Upcoming Payments Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {subscriptions
                      .filter(sub => sub.nextBillingDate)
                      .sort((a, b) =>
                        new Date(a.nextBillingDate || '').getTime() -
                        new Date(b.nextBillingDate || '').getTime()
                      )
                      .slice(0, 10)
                      .map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="font-medium">{sub.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Building className="h-3 w-3 mr-1" />
                              {sub.vendor?.name || 'No vendor'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium flex items-center justify-end">
                              <CalendarClock className="h-3 w-3 mr-1" />
                              {formatDate(sub.nextBillingDate)}
                            </p>
                            <p className="text-sm">Rp{formatRupiah(sub.cost)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Top Subscriptions by Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {subscriptions
                      .sort((a, b) => b.cost - a.cost)
                      .slice(0, 10)
                      .map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="font-medium">{sub.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Building className="h-3 w-3 mr-1" />
                              {sub.vendor?.name || 'No vendor'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">Rp{formatRupiah(sub.cost)}</p>
                            <p className="text-xs text-muted-foreground">{sub.recurringType || 'One-time'}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ResourceErrorBoundary>
  );
}
