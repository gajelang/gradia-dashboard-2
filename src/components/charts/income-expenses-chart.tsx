"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchWithAuth } from "@/lib/api" // Import the authentication utility

interface ChartData {
  label: string;
  date: string; // Original date string for sorting and filtering
  income: number;
  expenses: number;
  profit: number; // Pre-calculated profit
}

interface Transaction {
  id: string;
  name: string;
  amount: number;
  paymentStatus: string;
  date: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface IncomeExpensesChartProps {
  selectedRange?: DateRange;
}

// Different views for the chart
type ViewMode = '7d' | '30d' | '90d' | 'custom';

// Types for custom components
interface TooltipProps {
  active?: boolean;
  payload?: {
    name: string;
    value: number;
    color: string;
  }[];
  label?: string;
}

interface LegendProps {
  payload?: {
    value: string;
    color: string;
    type?: string;
    dataKey?: string;
  }[];
}

export function IncomeExpensesChart({ selectedRange }: IncomeExpensesChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [allData, setAllData] = useState<ChartData[]>([]);
  const [trend, setTrend] = useState<{
    direction: 'up' | 'down';
    percentage: number;
  }>({ direction: 'up', percentage: 0 });
  const [dateRangeLabel, setDateRangeLabel] = useState<string>("All time");
  const [viewMode, setViewMode] = useState<ViewMode>('30d');
  const [isLoading, setIsLoading] = useState(true);

  // Format a number with Rupiah currency
  const formatRupiah = (value: number): string => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  // Filter data based on view mode
  const filterDataByViewMode = (data: ChartData[], mode: ViewMode): ChartData[] => {
    if (mode === 'custom' || !data.length) return data;
    
    const now = new Date();
    let startDate: Date;
    
    switch (mode) {
      case '7d':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
    }

    return data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate;
    });
  };

  // Update view mode when selected range changes
  useEffect(() => {
    if (selectedRange?.from && selectedRange?.to) {
      setViewMode('custom');
    }
  }, [selectedRange]);

  // Main data fetching effect
  useEffect(() => {
    async function fetchFinancialData() {
      setIsLoading(true);
      try {
        // Fetch both transactions and expenses using fetchWithAuth
        const [transactionRes, expenseRes] = await Promise.all([
          fetchWithAuth("/api/transactions", { cache: "no-store" }),
          fetchWithAuth("/api/expenses", { cache: "no-store" })
        ]);

        if (!transactionRes.ok) throw new Error("Failed to fetch transactions");
        if (!expenseRes.ok) throw new Error("Failed to fetch expenses");

        let transactions: Transaction[] = await transactionRes.json();
        let expenses: Expense[] = await expenseRes.json();

        // Apply date range filter if provided
        if (selectedRange?.from && selectedRange?.to) {
          transactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= selectedRange.from! && txDate <= selectedRange.to!;
          });

          expenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= selectedRange.from! && expDate <= selectedRange.to!;
          });

          // Update date range label
          if (selectedRange.from.toDateString() === selectedRange.to.toDateString()) {
            setDateRangeLabel(selectedRange.from.toLocaleDateString('id-ID', {
              year: 'numeric', month: 'long', day: 'numeric'
            }));
          } else {
            setDateRangeLabel(`${selectedRange.from.toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short'
            })} - ${selectedRange.to.toLocaleDateString('id-ID', {
              year: 'numeric', day: 'numeric', month: 'short'
            })}`);
          }
        } else {
          setDateRangeLabel("All time");
        }

        // Group data by individual day
        const dailyData: Record<string, ChartData> = {};
        
        // Process transactions (income)
        transactions.forEach(transaction => {
          const dateObj = new Date(transaction.date);
          const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
          const formattedDate = dateObj.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short'
          });
          
          if (!dailyData[dateStr]) {
            dailyData[dateStr] = { 
              label: formattedDate,
              date: dateStr,
              income: 0, 
              expenses: 0,
              profit: 0
            };
          }
          
          if (transaction.amount > 0) {
            dailyData[dateStr].income += transaction.amount;
            dailyData[dateStr].profit += transaction.amount;
          }
        });
        
        // Process expenses
        expenses.forEach(expense => {
          const dateObj = new Date(expense.date);
          const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
          const formattedDate = dateObj.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short'
          });
          
          if (!dailyData[dateStr]) {
            dailyData[dateStr] = { 
              label: formattedDate,
              date: dateStr,
              income: 0, 
              expenses: 0,
              profit: 0
            };
          }
          
          dailyData[dateStr].expenses += expense.amount;
          dailyData[dateStr].profit -= expense.amount;
        });

        // Convert to array and sort by date
        const fullData = Object.values(dailyData)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setAllData(fullData);
        
        // Apply view mode filter
        const filteredData = filterDataByViewMode(fullData, viewMode);
        setData(filteredData);

        // Calculate trend
        if (filteredData.length >= 2) {
          const currentPeriod = filteredData[filteredData.length - 1];
          const previousPeriod = filteredData[filteredData.length - 2];
          
          const currentProfit = currentPeriod.profit;
          const previousProfit = previousPeriod.profit;
          
          if (previousProfit !== 0) {
            const percentChange = ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100;
            setTrend({
              direction: percentChange >= 0 ? 'up' : 'down',
              percentage: Math.abs(percentChange)
            });
          } else if (currentProfit > 0) {
            setTrend({ direction: 'up', percentage: 100 });
          } else if (currentProfit < 0) {
            setTrend({ direction: 'down', percentage: 100 });
          } else {
            setTrend({ direction: 'up', percentage: 0 });
          }
        }
        
      } catch (error) {
        console.error("Error fetching financial data:", error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchFinancialData();
  }, [selectedRange, viewMode]);

  // Update filtered data when view mode changes
  useEffect(() => {
    const filteredData = filterDataByViewMode(allData, viewMode);
    setData(filteredData);
    
    // Update trend
    if (filteredData.length >= 2) {
      const currentPeriod = filteredData[filteredData.length - 1];
      const previousPeriod = filteredData[filteredData.length - 2];
      
      const currentProfit = currentPeriod.profit;
      const previousProfit = previousPeriod.profit;
      
      if (previousProfit !== 0) {
        const percentChange = ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100;
        setTrend({
          direction: percentChange >= 0 ? 'up' : 'down',
          percentage: Math.abs(percentChange)
        });
      } else if (currentProfit > 0) {
        setTrend({ direction: 'up', percentage: 100 });
      } else if (currentProfit < 0) {
        setTrend({ direction: 'down', percentage: 100 });
      } else {
        setTrend({ direction: 'up', percentage: 0 });
      }
    }
  }, [viewMode, allData]);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const income = payload.find((p) => p.name === "Income")?.value || 0;
      const expenses = payload.find((p) => p.name === "Expenses")?.value || 0;
      const profit = income - expenses;
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          
          <div className="grid gap-1.5">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
              <span className="text-gray-700">Income:</span>
              <span className="ml-auto font-medium">Rp{formatRupiah(income)}</span>
            </div>
            
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-rose-500 mr-2"></div>
              <span className="text-gray-700">Expenses:</span>
              <span className="ml-auto font-medium">Rp{formatRupiah(expenses)}</span>
            </div>
            
            <div className="border-t border-gray-200 mt-1 pt-1">
              <div className="flex items-center font-medium">
                <span className="text-gray-700">Profit:</span>
                <span className={`ml-auto ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Rp{formatRupiah(Math.abs(profit))}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend with better styling
  const CustomLegend = ({ payload }: LegendProps) => {
    if (!payload) return null;
    
    return (
      <div className="flex justify-center mt-2 gap-6">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-gray-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Get comparison label
  const getComparisonLabel = (): string => {
    switch (viewMode) {
      case '7d':
        return 'Comparing latest to previous day';
      case '30d':
      case '90d':
      case 'custom':
      default:
        if (selectedRange?.from && selectedRange?.to) {
          const diffTime = Math.abs(selectedRange.to.getTime() - selectedRange.from.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 7) return 'Comparing latest to previous day';
          if (diffDays <= 31) return 'Comparing latest to previous week';
          return 'Comparing latest to previous month';
        }
        return 'Comparing latest to previous period';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 border-b">
        <div>
          <CardTitle className="text-xl">Income vs Expenses</CardTitle>
          <CardDescription>
            Financial overview for {viewMode === 'custom' ? dateRangeLabel : `last ${viewMode === '7d' ? '7 days' : viewMode === '30d' ? '30 days' : '3 months'}`}
          </CardDescription>
        </div>
        
        {/* Only show the selector if not in custom range mode */}
        {!selectedRange?.from && !selectedRange?.to && (
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {/* Show date range indicator if in custom mode */}
        {selectedRange?.from && selectedRange?.to && (
          <div className="inline-flex items-center text-xs px-3 py-1 bg-primary/10 text-primary rounded-full">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            <span>{dateRangeLabel}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 pt-6">
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
          </div>
        ) : data.length > 0 ? (
          <div className="h-[300px] w-full px-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  interval={data.length > 20 ? Math.ceil(data.length / 15) : 0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  name="Income"
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  name="Expenses"
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpenses)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for the selected period
          </div>
        )}
      </CardContent>

      {data.length > 0 && (
        <CardFooter className="border-t bg-muted/30 px-6 py-3">
          <div className="flex w-full items-start gap-2 text-sm">
            <div className="grid gap-1">
              <div className="flex items-center gap-2 font-medium leading-none">
                {trend.direction === 'up' ? (
                  <>
                    {trend.percentage === 0 ? 'No change' : `Trending up by ${trend.percentage.toFixed(1)}%`} 
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </>
                ) : (
                  <>
                    Trending down by {trend.percentage.toFixed(1)}% 
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                {getComparisonLabel()}
              </div>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}