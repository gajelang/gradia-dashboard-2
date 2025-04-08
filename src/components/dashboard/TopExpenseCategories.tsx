"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip
} from "recharts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowDown,
  ArrowUp,
  Minus,
  PieChart as PieChartIcon,
  ListFilter,
  BarChart,
  Calendar
} from "lucide-react"
import { formatRupiah } from "@/lib/formatters/formatters"
import { fetchWithAuth } from "@/lib/api/api"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Define expense data type
interface ExpenseCategory {
  name: string;
  value: number; // Total amount
  percentage: number;
  count: number;
  color: string;
  trend: number; // Percentage change from previous period
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  transactionId: string;
  isDeleted?: boolean;
}

// Props interface
interface TopExpenseCategoriesProps {
  currentPeriod?: { from: Date; to: Date };
  limit?: number;
}

// Define colors for the pie chart segments
const CHART_COLORS = [
  "#0ea5e9", // sky-500
  "#f97316", // orange-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#10b981", // emerald-500
  "#ef4444", // red-500
  "#f59e0b", // amber-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#64748b", // slate-500
];

// Category mapping for standardization
const CATEGORY_MAPPING: {[key: string]: string} = {
  "advertisement": "Iklan & Promosi",
  "ads": "Iklan & Promosi",
  "promo": "Iklan & Promosi",
  "promotion": "Iklan & Promosi",
  "equipment": "Peralatan",
  "maintenance": "Pemeliharaan",
  "salary": "Gaji",
  "payroll": "Gaji",
  "wages": "Gaji",
  "transportation": "Transportasi",
  "travel": "Transportasi",
  "office": "Kantor",
  "supplies": "Perlengkapan",
  "utility": "Utilitas",
  "utilities": "Utilitas",
  "rent": "Sewa",
  "rental": "Sewa",
  "tax": "Pajak",
  "taxes": "Pajak",
  "misc": "Lain-lain",
  "other": "Lain-lain",
  "food": "Konsumsi",
  "meals": "Konsumsi",
  "material": "Material",
  "materials": "Material",
  "software": "Software & IT",
  "hardware": "Software & IT",
  "it": "Software & IT",
  "consultant": "Jasa Profesional",
  "consulting": "Jasa Profesional",
  "legal": "Jasa Profesional",
};

// Default categories if none found
const DEFAULT_CATEGORIES = [
  { name: "Iklan & Promosi", value: 0, percentage: 0, count: 0, color: CHART_COLORS[0], trend: 0 },
  { name: "Peralatan", value: 0, percentage: 0, count: 0, color: CHART_COLORS[1], trend: 0 },
  { name: "Gaji", value: 0, percentage: 0, count: 0, color: CHART_COLORS[2], trend: 0 },
  { name: "Transportasi", value: 0, percentage: 0, count: 0, color: CHART_COLORS[3], trend: 0 },
  { name: "Lain-lain", value: 0, percentage: 0, count: 0, color: CHART_COLORS[9], trend: 0 },
];

// Period types for filtering
type PeriodFilter = 'this-month' | 'last-month' | 'this-year' | 'last-3-months' | 'custom';

export default function TopExpenseCategories({
  currentPeriod,
  limit = 5
}: TopExpenseCategoriesProps) {
  // State
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [totalExpenses, setTotalExpenses] = useState<number>(0)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(currentPeriod ? 'custom' : 'this-month')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [topCategories, setTopCategories] = useState<ExpenseCategory[]>([])
  const [periodLabel, setPeriodLabel] = useState<string>("Bulan Ini")
  const [comparisonPeriod, setComparisonPeriod] = useState<{ from: Date; to: Date } | null>(null)
  const [transactions, setTransactions] = useState<{id: string, date: string}[]>([])

  // Function to standardize category names
  const standardizeCategory = (category: string): string => {
    if (!category) return "Lain-lain";
    
    const lowerCategory = category.toLowerCase().trim();
    
    // Check direct mapping
    for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
      if (lowerCategory === key || lowerCategory.includes(key)) {
        return value;
      }
    }
    
    // If no mapping found, capitalize first letter
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Fetch transactions first, then fetch expenses for each transaction
  useEffect(() => {
    fetchTransactions();
  }, [periodFilter, currentPeriod]);

  // Fetch all transactions
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // Define the periods for current and comparison data
      const periods = definePeriods();
      if (!periods) {
        setExpenseCategories(DEFAULT_CATEGORIES);
        setTopCategories(DEFAULT_CATEGORIES.slice(0, limit));
        setIsLoading(false);
        return;
      }
      
      const { currentPeriod, previousPeriod } = periods;
      setComparisonPeriod(previousPeriod);
      
      // Format the period label
      const formattedLabel = formatPeriodLabel(currentPeriod);
      setPeriodLabel(formattedLabel);

      // Fetch all transactions
      const res = await fetchWithAuth("/api/transactions", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const allTransactions = await res.json();
      
      // Filter transactions by date range
      const filteredTransactions = allTransactions
        .filter((tx: { isDeleted: any }) => !tx.isDeleted)
        .filter((tx: { date: string | number | Date }) => {
          if (!tx.date) return false;
          const txDate = new Date(tx.date);
          return txDate >= currentPeriod.from && txDate <= currentPeriod.to;
        })
        .map((tx: { id: any; date: any }) => ({ id: tx.id, date: tx.date }));
      
      setTransactions(filteredTransactions);
      
      // Get previous period transactions too
      const previousTransactions = allTransactions
        .filter((tx: { isDeleted: any }) => !tx.isDeleted)
        .filter((tx: { date: string | number | Date }) => {
          if (!tx.date) return false;
          const txDate = new Date(tx.date);
          return txDate >= previousPeriod.from && txDate <= previousPeriod.to;
        })
        .map((tx: { id: any; date: any }) => ({ id: tx.id, date: tx.date }));

      // Once we have the transactions, fetch expenses for current period
      fetchExpenses(filteredTransactions, previousTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transaction data");
      setExpenseCategories(DEFAULT_CATEGORIES);
      setTopCategories(DEFAULT_CATEGORIES.slice(0, limit));
      setIsLoading(false);
    }
  };

  // Fetch expenses for all transactions
  const fetchExpenses = async (
    currentTransactions: {id: string, date: string}[], 
    previousTransactions: {id: string, date: string}[]
  ) => {
    try {
      if (currentTransactions.length === 0) {
        setExpenseCategories(DEFAULT_CATEGORIES);
        setTopCategories(DEFAULT_CATEGORIES.slice(0, limit));
        setIsLoading(false);
        return;
      }

      // Fetch expenses for all current period transactions in parallel
      const currentExpensePromises = currentTransactions.map(tx => 
        fetchWithAuth(`/api/transactions/expenses?transactionId=${tx.id}&includeArchived=false`)
      );
      
      const currentResponses = await Promise.all(currentExpensePromises);
      
      // Process and collect all expenses from current period
      const currentPeriodExpenses: Expense[] = [];
      for (const response of currentResponses) {
        if (response.ok) {
          const data = await response.json();
          if (data.activeExpenses && Array.isArray(data.activeExpenses)) {
            currentPeriodExpenses.push(...data.activeExpenses);
          }
        }
      }
      
      // Fetch expenses for previous period transactions in parallel
      const previousExpensePromises = previousTransactions.map(tx => 
        fetchWithAuth(`/api/transactions/expenses?transactionId=${tx.id}&includeArchived=false`)
      );
      
      const previousResponses = await Promise.all(previousExpensePromises);
      
      // Process and collect all expenses from previous period
      const previousPeriodExpenses: Expense[] = [];
      for (const response of previousResponses) {
        if (response.ok) {
          const data = await response.json();
          if (data.activeExpenses && Array.isArray(data.activeExpenses)) {
            previousPeriodExpenses.push(...data.activeExpenses);
          }
        }
      }
      
      // Process the expense data
      processExpenseCategories(currentPeriodExpenses, previousPeriodExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expense data");
      setExpenseCategories(DEFAULT_CATEGORIES);
      setTopCategories(DEFAULT_CATEGORIES.slice(0, limit));
      setIsLoading(false);
    }
  };

  // Define current and previous periods based on filter
  const definePeriods = () => {
    const now = new Date();
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    
    // Set current period based on filter
    if (periodFilter === 'custom' && currentPeriod) {
      currentPeriodStart = currentPeriod.from;
      currentPeriodEnd = currentPeriod.to;
    } else if (periodFilter === 'this-month') {
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (periodFilter === 'last-month') {
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      currentPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (periodFilter === 'last-3-months') {
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      currentPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (periodFilter === 'this-year') {
      currentPeriodStart = new Date(now.getFullYear(), 0, 1);
      currentPeriodEnd = new Date(now.getFullYear(), 11, 31);
    } else {
      return null;
    }
    
    // Calculate the previous period with the same duration
    const durationInMs = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1); // Day before current period
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - durationInMs);
    
    return {
      currentPeriod: { from: currentPeriodStart, to: currentPeriodEnd },
      previousPeriod: { from: previousPeriodStart, to: previousPeriodEnd }
    };
  };

  // Format period label
  const formatPeriodLabel = (period: { from: Date; to: Date }): string => {
    const { from, to } = period;
    
    // Same month and year
    if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
      return `${from.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    }
    
    // Same year
    if (from.getFullYear() === to.getFullYear()) {
      return `${from.toLocaleDateString('id-ID', { month: 'short' })} - ${to.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`;
    }
    
    // Different years
    return `${from.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} - ${to.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`;
  };

  // Process expense categories
  const processExpenseCategories = (currentExpenses: Expense[], prevPeriodExpenses: Expense[]) => {
    if (!currentExpenses || currentExpenses.length === 0) {
      setExpenseCategories(DEFAULT_CATEGORIES);
      setTopCategories(DEFAULT_CATEGORIES.slice(0, limit));
      setIsLoading(false);
      return;
    }
    
    // Group current expenses by category
    const categoryMap = new Map<string, { amount: number, count: number }>();
    let total = 0;
    
    currentExpenses.forEach(expense => {
      // Standardize the category name
      const standardCategory = standardizeCategory(expense.category || "Lain-lain");
      
      if (!categoryMap.has(standardCategory)) {
        categoryMap.set(standardCategory, { amount: 0, count: 0 });
      }
      
      const categoryData = categoryMap.get(standardCategory)!;
      categoryData.amount += expense.amount || 0;
      categoryData.count += 1;
      total += expense.amount || 0;
    });
    
    // Group previous period expenses by category
    const prevCategoryMap = new Map<string, number>();
    let prevTotal = 0;
    
    prevPeriodExpenses.forEach(expense => {
      const standardCategory = standardizeCategory(expense.category || "Lain-lain");
      
      if (!prevCategoryMap.has(standardCategory)) {
        prevCategoryMap.set(standardCategory, 0);
      }
      
      const prevAmount = prevCategoryMap.get(standardCategory)!;
      prevCategoryMap.set(standardCategory, prevAmount + (expense.amount || 0));
      prevTotal += expense.amount || 0;
    });
    
    // Calculate percentages and trends
    const categories: ExpenseCategory[] = [];
    
    Array.from(categoryMap.entries()).forEach(([name, data], index) => {
      const percentage = total > 0 ? (data.amount / total) * 100 : 0;
      const prevAmount = prevCategoryMap.get(name) || 0;
      
      // Calculate trend (percentage change)
      let trend = 0;
      if (prevAmount > 0) {
        trend = ((data.amount - prevAmount) / prevAmount) * 100;
      } else if (data.amount > 0) {
        trend = 100; // New category not in previous period
      }
      
      categories.push({
        name,
        value: data.amount,
        percentage,
        count: data.count,
        color: CHART_COLORS[index % CHART_COLORS.length],
        trend
      });
    });
    
    // Sort by amount descending
    categories.sort((a, b) => b.value - a.value);
    
    // Get top categories for display
    const top = categories.slice(0, limit);
    
    // If there are more categories beyond the limit, add an "Others" category
    if (categories.length > limit) {
      const othersValue = categories.slice(limit).reduce((sum, cat) => sum + cat.value, 0);
      const othersPercentage = total > 0 ? (othersValue / total) * 100 : 0;
      
      // Calculate trend for "Others"
      const prevOthersValue = Array.from(prevCategoryMap.entries())
        .filter(([name, _]) => !top.some(t => t.name === name))
        .reduce((sum, [_, amount]) => sum + amount, 0);
      
      let othersTrend = 0;
      if (prevOthersValue > 0) {
        othersTrend = ((othersValue - prevOthersValue) / prevOthersValue) * 100;
      } else if (othersValue > 0) {
        othersTrend = 100;
      }
      
      top.push({
        name: "Lainnya",
        value: othersValue,
        percentage: othersPercentage,
        count: categories.length - limit,
        color: CHART_COLORS[CHART_COLORS.length - 1],
        trend: othersTrend
      });
    }
    
    setExpenseCategories(categories);
    setTopCategories(top);
    setTotalExpenses(total);
    setIsLoading(false);
  };

  // Function to get trend icon and color
  const getTrendDisplay = (trend: number) => {
    if (Math.abs(trend) < 0.5) {
      return {
        icon: <Minus className="h-4 w-4 text-gray-500" />,
        textColor: "text-gray-500",
        label: "Tetap"
      };
    } else if (trend > 0) {
      return {
        icon: <ArrowUp className="h-4 w-4 text-rose-500" />,
        textColor: "text-rose-500",
        label: `+${trend.toFixed(1)}%`
      };
    } else {
      return {
        icon: <ArrowDown className="h-4 w-4 text-emerald-500" />,
        textColor: "text-emerald-500",
        label: `${trend.toFixed(1)}%`
      };
    }
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const trend = getTrendDisplay(data.trend);
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-semibold mb-1">{data.name}</p>
          
          <div className="grid gap-1 text-sm">
            <div className="flex justify-between gap-4">
              <span>Total:</span>
              <span className="font-medium">Rp{formatRupiah(data.value)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Persentase:</span>
              <span className="font-medium">{data.percentage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Transaksi:</span>
              <span className="font-medium">{data.count}</span>
            </div>
            <div className="flex justify-between gap-4 mt-1 pt-1 border-t">
              <span>Perubahan:</span>
              <span className={`font-medium flex items-center ${trend.textColor}`}>
                {trend.icon}
                <span className="ml-1">{trend.label}</span>
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend renderer
  const renderCustomizedLegend = ({ payload }: any) => {
    if (!payload) return null;
    
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {payload.map((entry: any, index: number) => (
          <div 
            key={`legend-${index}`} 
            className="flex items-center px-2 py-1 rounded-full bg-gray-100 text-xs"
          >
            <div 
              className="w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-800">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <CardTitle className="text-xl flex items-center">
            <PieChartIcon className="mr-2 h-5 w-5 text-muted-foreground" />
            Top Expense Categories
          </CardTitle>
          
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">Bulan Ini</SelectItem>
                <SelectItem value="last-month">Bulan Lalu</SelectItem>
                <SelectItem value="last-3-months">3 Bulan Terakhir</SelectItem>
                <SelectItem value="this-year">Tahun Ini</SelectItem>
                {currentPeriod && (
                  <SelectItem value="custom">Periode Kustom</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Memuat data kategori pengeluaran...</div>
          </div>
        ) : topCategories.length <= 0 || (topCategories.length === 1 && topCategories[0].value === 0) ? (
          <div className="h-[300px] flex items-center justify-center flex-col">
            <BarChart className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-muted-foreground">Tidak ada data pengeluaran untuk periode ini</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tambahkan pengeluaran untuk melihat kategori teratas
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground flex justify-between items-center mb-4">
              <div>
                Periode: <span className="font-medium text-gray-800">{periodLabel}</span>
              </div>
              <div>
                Total: <span className="font-medium text-gray-800">Rp{formatRupiah(totalExpenses)}</span>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend content={renderCustomizedLegend} />
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="space-y-3 mt-2 max-h-[300px] overflow-auto pr-1">
              {topCategories.map((category, index) => {
                const trend = getTrendDisplay(category.trend);
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {category.count} transaksi · {category.percentage.toFixed(1)}% dari total
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end">
                      <div className="font-medium">Rp{formatRupiah(category.value)}</div>
                      <div className={`text-xs flex items-center mt-0.5 ${trend.textColor}`}>
                        {trend.icon}
                        <span className="ml-1">{trend.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {expenseCategories.length > limit && (
                <div className="text-xs text-center text-muted-foreground mt-3">
                  Menampilkan {limit} dari {expenseCategories.length} kategori
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t">
              <h4 className="text-sm font-medium mb-2">Perbandingan Dengan Periode Sebelumnya</h4>
              <div className="text-xs text-gray-600">
                {comparisonPeriod ? (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span>
                      {formatPeriodLabel({
                        from: comparisonPeriod.from,
                        to: comparisonPeriod.to
                      })}
                    </span>
                  </div>
                ) : (
                  <span>Tidak ada data periode sebelumnya</span>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}