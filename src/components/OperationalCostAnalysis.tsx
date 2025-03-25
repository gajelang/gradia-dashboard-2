"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWithAuth } from "@/lib/api";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/formatters";
import { toast } from "sonner";

interface DateRange {
  from: Date;
  to: Date;
}

interface ExpenseData {
  isDeleted: any;
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  transactionId?: string;
}

interface TransactionData {
  isDeleted: any;
  id: string;
  amount: number;
  date: string;
}

interface MonthlyData {
  month: string;
  expenses: number;
  revenue: number;
  ratio: number;
  breakdownByCategory: {
    [category: string]: number;
  };
}

interface OperationalCostAnalysisProps {
  currentPeriod?: DateRange;
}

export default function OperationalCostAnalysis({ currentPeriod }: OperationalCostAnalysisProps) {
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ category: string; percentage: number }[]>([]);
  const [activeView, setActiveView] = useState<"trend" | "breakdown">("trend");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch expenses and transactions in parallel
        const [expensesRes, transactionsRes] = await Promise.all([
          fetchWithAuth("/api/expenses", { cache: "no-store" }),
          fetchWithAuth("/api/transactions", { cache: "no-store" })
        ]);

        if (!expensesRes.ok || !transactionsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        let expensesData = await expensesRes.json();
        let transactionsData = await transactionsRes.json();

        // Filter out deleted expenses and transactions
        expensesData = expensesData.filter((exp: ExpenseData) => !exp.isDeleted);
        transactionsData = transactionsData.filter((tx: TransactionData) => !tx.isDeleted);

        // Apply date filtering if currentPeriod is provided
        if (currentPeriod?.from && currentPeriod?.to) {
          const fromDate = currentPeriod.from;
          const toDate = currentPeriod.to;

          expensesData = expensesData.filter((exp: ExpenseData) => {
            const expDate = new Date(exp.date);
            return expDate >= fromDate && expDate <= toDate;
          });

          transactionsData = transactionsData.filter((tx: TransactionData) => {
            const txDate = new Date(tx.date);
            return txDate >= fromDate && txDate <= toDate;
          });
        }

        setExpenses(expensesData);
        setTransactions(transactionsData);

        processMonthlyData(expensesData, transactionsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load operational cost data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPeriod]);

  const processMonthlyData = (expensesData: ExpenseData[], transactionsData: TransactionData[]) => {
    // Group expenses by month and category
    interface MonthData {
      monthLabel: string;
      total: number;
      [category: string]: string | number;
    }
    
    const monthlyExpenses: Record<string, MonthData> = {};
    const monthlyRevenue: Record<string, number> = {};

    // Process expenses
    expensesData.forEach((expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthLabel = new Date(date.getFullYear(), date.getMonth(), 1)
        .toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

      // Initialize month data if not exists
      if (!monthlyExpenses[monthKey]) {
        monthlyExpenses[monthKey] = {
          monthLabel: monthLabel,
          total: 0
        };
      }

      // Add expense amount to total
      monthlyExpenses[monthKey].total = (monthlyExpenses[monthKey].total || 0) + expense.amount;

      // Group by category
      if (!monthlyExpenses[monthKey][expense.category]) {
        monthlyExpenses[monthKey][expense.category] = 0;
      }
      monthlyExpenses[monthKey][expense.category] = (monthlyExpenses[monthKey][expense.category] as number) + expense.amount;
    });

    // Process transactions (revenue)
    transactionsData.forEach((transaction) => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      // Initialize month revenue if not exists
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = 0;
      }

      // Add transaction amount to total revenue
      monthlyRevenue[monthKey] += transaction.amount;
    });

    // Convert to array format for charts
    const data: MonthlyData[] = Object.keys(monthlyExpenses)
      .sort() // Sort by month
      .map(monthKey => {
        const expenses = monthlyExpenses[monthKey].total || 0;
        const revenue = monthlyRevenue[monthKey] || 0;
        const ratio = revenue > 0 ? (expenses / revenue) * 100 : 0;

        // Extract breakdown by category
        const breakdownByCategory: { [category: string]: number } = {};
        for (const key in monthlyExpenses[monthKey]) {
          if (key !== 'monthLabel' && key !== 'total') {
            breakdownByCategory[key] = monthlyExpenses[monthKey][key] as number;
          }
        }

        return {
          month: monthlyExpenses[monthKey].monthLabel,
          expenses,
          revenue,
          ratio,
          breakdownByCategory
        };
      });

    setMonthlyData(data);

    // Generate alerts for significant increases
    if (data.length >= 2) {
      const currentMonth = data[data.length - 1];
      const previousMonth = data[data.length - 2];

      // Compare current and previous month categories
      const categoryAlerts = [];

      for (const category in currentMonth.breakdownByCategory) {
        const currentAmount = currentMonth.breakdownByCategory[category] || 0;
        const previousAmount = previousMonth.breakdownByCategory[category] || 0;

        if (previousAmount > 0 && currentAmount > previousAmount) {
          const increasePercentage = ((currentAmount - previousAmount) / previousAmount) * 100;
          if (increasePercentage > 20) { // Alert if increase is more than 20%
            categoryAlerts.push({
              category,
              percentage: increasePercentage
            });
          }
        }
      }

      // Sort alerts by percentage (highest first)
      categoryAlerts.sort((a, b) => b.percentage - a.percentage);
      setAlerts(categoryAlerts);
    }
  };

  // Toggle between views
  const toggleView = () => {
    setActiveView(activeView === "trend" ? "breakdown" : "trend");
  };

  // Custom tooltip for the trend chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="text-sm font-medium mb-1">{label}</p>
          <div className="grid gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="mr-4">Expenses:</span>
              <span className="font-medium text-rose-600">Rp{formatRupiah(payload[0].value)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="mr-4">Revenue:</span>
              <span className="font-medium text-emerald-600">Rp{formatRupiah(payload[1].value)}</span>
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t">
              <span className="mr-4">Expense Ratio:</span>
              <span className="font-medium">{payload[2].value.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Get the latest expense ratio
  const getLatestExpenseRatio = () => {
    if (monthlyData.length === 0) return 0;
    return monthlyData[monthlyData.length - 1].ratio;
  };

  // Get ratio change
  const getRatioChange = () => {
    if (monthlyData.length < 2) return { direction: 'neutral', change: 0 };
    
    const currentRatio = monthlyData[monthlyData.length - 1].ratio;
    const previousRatio = monthlyData[monthlyData.length - 2].ratio;
    
    const change = currentRatio - previousRatio;
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    
    return { direction, change: Math.abs(change) };
  };

  // Handle healthy expense ratio
  const isHealthyRatio = (ratio: number) => {
    return ratio < 60; // Example threshold: expense ratio below 60% is considered healthy
  };

  // Render the trend chart
  const renderTrendChart = () => {
    return (
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={monthlyData}
            margin={{ top: 5, right: 5, left: 0, bottom: 15 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
            />
            <YAxis 
              yAxisId="left"
              orientation="left" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value) => `${value < 1000000 ? Math.round(value / 1000) : Math.round(value / 1000000)}${value < 1000000 ? 'k' : 'M'}`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="right"
              orientation="right" 
              tickFormatter={(value) => `${value.toFixed(0)}%`}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="expenses" 
              name="Expenses" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="revenue" 
              name="Revenue" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="ratio" 
              name="Expense Ratio" 
              stroke="#6366f1" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render the breakdown chart
  const renderBreakdownChart = () => {
    if (monthlyData.length === 0) return null;
    
    // Get the latest month's data
    const latestMonth = monthlyData[monthlyData.length - 1];
    
    // Convert the breakdown data to chart format
    const breakdownData = Object.entries(latestMonth.breakdownByCategory)
      .map(([category, amount]) => ({
        category,
        amount
      }))
      .sort((a, b) => b.amount - a.amount);
    
    return (
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={breakdownData}
            margin={{ top: 5, right: 5, left: 0, bottom: 15 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
            <XAxis 
              type="number"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value) => `${value < 1000000 ? Math.round(value / 1000) : Math.round(value / 1000000)}${value < 1000000 ? 'k' : 'M'}`}
              tickLine={false}
            />
            <YAxis 
              type="category"
              dataKey="category" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip
              formatter={(value: number) => [`Rp${formatRupiah(value)}`, 'Amount']}
              labelFormatter={(label) => `Category: ${label}`}
              cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
            />
            <Bar 
              dataKey="amount" 
              fill="#6366f1"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Analisis Biaya Operasional</CardTitle>
        <Button variant="outline" size="sm" onClick={toggleView}>
          {activeView === "trend" ? "Lihat Breakdown" : "Lihat Tren"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-60 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Memuat data analisis biaya...</div>
          </div>
        ) : monthlyData.length === 0 ? (
          <div className="h-60 flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <p>Tidak ada data biaya operasional tersedia.</p>
              <p className="text-sm mt-1">Tambahkan transaksi dan pengeluaran untuk melihat analisis.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Section */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Expense Ratio</div>
                <div className="flex items-center">
                  <span className={`text-xl font-bold ${isHealthyRatio(getLatestExpenseRatio()) ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {getLatestExpenseRatio().toFixed(1)}%
                  </span>
                  <div className="ml-2">
                    {getRatioChange().direction === 'up' && (
                      <TrendingUp className="h-4 w-4 text-rose-600" />
                    )}
                    {getRatioChange().direction === 'down' && (
                      <TrendingDown className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getRatioChange().direction === 'up' ? 
                    `Meningkat ${getRatioChange().change.toFixed(1)}% dari bulan lalu` : 
                    getRatioChange().direction === 'down' ? 
                    `Menurun ${getRatioChange().change.toFixed(1)}% dari bulan lalu` : 
                    'Tetap stabil dari bulan lalu'}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                {alerts.length > 0 ? (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Kategori Meningkat</div>
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-amber-500 mr-1.5" />
                      <span className="text-sm font-medium text-amber-800">
                        {alerts[0].category}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Meningkat {alerts[0].percentage.toFixed(0)}% dari bulan lalu
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Status Kategori</div>
                    <div className="flex items-center text-emerald-600">
                      <span className="text-sm font-medium">Semua kategori stabil</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Tidak ada peningkatan signifikan
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart Section */}
            {activeView === "trend" ? renderTrendChart() : renderBreakdownChart()}

            {/* Alerts Section */}
            {alerts.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-medium flex items-center mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mr-1.5" />
                  Peringatan Kenaikan Biaya
                </h4>
                <div className="flex flex-wrap gap-2">
                  {alerts.slice(0, 3).map((alert, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="bg-amber-50 text-amber-800 border-amber-200"
                    >
                      {alert.category}: +{alert.percentage.toFixed(0)}%
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}