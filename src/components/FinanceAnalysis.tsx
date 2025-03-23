import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  // Removed unused LineChart
  Line,
  ComposedChart,
  // Removed unused Area
  // Removed unused RechartsAreaChart
} from "recharts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  // Removed unused Calendar
  CalendarIcon,
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePickerDialog } from "@/components/DatePickerDialog";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "react-hot-toast";
import { formatRupiah } from "@/lib/formatters";

import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Transaction interface
interface Transaction {
  id: string;
  name: string;
  description: string;
  amount: number;
  projectValue?: number;
  totalProfit?: number;
  downPaymentAmount?: number;
  remainingAmount?: number;
  paymentStatus: string;
  date: string;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  vendorIds?: string[];
  capitalCost?: number; // Added field for expense tracking
}

// Expense interface
interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  transactionId?: string;
}

// Monthly financial data
interface MonthlyData {
  month: string;
  monthNum: number;
  year: number;
  transactions: Transaction[];
  expenses: Expense[];
  totalExpectedValue: number;
  totalPaid: number;
  totalExpenses: number;
  expectedProfit: number;
  realProfit: number;
  remainingPayments: number;
}

// Date range type
interface DateRange {
  from: Date;
  to: Date;
}

// Custom tooltip props
interface CustomBarTooltipProps {
  active?: boolean;
  payload?: Array<any>;
  label?: string;
}

// Payment status colors
const STATUS_COLORS = {
  "Lunas": "#22c55e",
  "DP": "#eab308",
  "Belum Bayar": "#ef4444"
};

export default function ImprovedFinancialAnalysis() {
  // State for filters
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  // Removed unused filtersPanelOpen state
  
  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  // Removed unused currentView state
  const [selectedMonth, setSelectedMonth] = useState<MonthlyData | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Format date range for display
  const formatDateRange = (range: DateRange | undefined): string => {
    if (range?.from && range?.to) {
      if (range.from.toDateString() === range.to.toDateString()) {
        return range.from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      } else {
        return `${range.from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${range.to.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
    }
    return "All time";
  };

  // Get month name from number
  const getMonthName = (monthNum: number): string => {
    return new Date(2000, monthNum - 1, 1).toLocaleString('id-ID', { month: 'long' });
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };
  
  // Memoize fetchFinancialData to use in dependency array
  const fetchFinancialData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch transactions
      const resTransactions = await fetchWithAuth("/api/transactions", { cache: "no-store" });
      if (!resTransactions.ok) throw new Error("Failed to fetch transactions");
      const transactionsData: Transaction[] = await resTransactions.json();
      
      // Fetch expenses
      const resExpenses = await fetchWithAuth("/api/expenses", { cache: "no-store" });
      if (!resExpenses.ok) throw new Error("Failed to fetch expenses");
      const expensesData: Expense[] = await resExpenses.json();
      
      // Set data
      setTransactions(transactionsData);
      setExpenses(expensesData);
      
      // Extract unique years
      const years = [...new Set([
        ...transactionsData.map(t => new Date(t.date).getFullYear()),
        ...expensesData.map(e => new Date(e.date).getFullYear())
      ])].sort((a, b) => b - a);
      
      setAvailableYears(years);
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast.error("Failed to load financial data");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Memoize processDataByMonths to use in dependency array
  const processDataByMonths = useCallback(() => {
    if (!transactions.length && !expenses.length) return;

    // Create a map to store data by year-month
    const dataByMonth: Map<string, MonthlyData> = new Map();
    
    // Filter transactions
    const filteredTransactions = [...transactions];
    
    // Filter transactions by date range or year/month
    let processedTransactions = filteredTransactions;
    
    if (dateRange?.from && dateRange?.to) {
      processedTransactions = processedTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= dateRange.from && txDate <= dateRange.to;
      });
    } else {
      // Filter by year
      if (yearFilter) {
        processedTransactions = processedTransactions.filter(tx => 
          new Date(tx.date).getFullYear() === yearFilter
        );
      }
      
      // Filter by month (if selected)
      if (monthFilter !== null) {
        processedTransactions = processedTransactions.filter(tx => 
          new Date(tx.date).getMonth() + 1 === monthFilter
        );
      }
    }
    
    // Filter expenses
    const filteredExpenses = [...expenses];
    
    let processedExpenses = filteredExpenses;
    
    if (dateRange?.from && dateRange?.to) {
      processedExpenses = processedExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= dateRange.from && expDate <= dateRange.to;
      });
    } else {
      // Filter by year
      if (yearFilter) {
        processedExpenses = processedExpenses.filter(exp => 
          new Date(exp.date).getFullYear() === yearFilter
        );
      }
      
      // Filter by month (if selected)
      if (monthFilter !== null) {
        processedExpenses = processedExpenses.filter(exp => 
          new Date(exp.date).getMonth() + 1 === monthFilter
        );
      }
    }
    
    // Process transactions into monthly data
    processedTransactions.forEach(tx => {
      const date = new Date(tx.date);
      const year = date.getFullYear();
      const monthNum = date.getMonth() + 1;
      const key = `${year}-${monthNum.toString().padStart(2, '0')}`;
      
      if (!dataByMonth.has(key)) {
        dataByMonth.set(key, {
          month: getMonthName(monthNum),
          monthNum,
          year,
          transactions: [],
          expenses: [],
          totalExpectedValue: 0,
          totalPaid: 0,
          totalExpenses: 0,
          expectedProfit: 0,
          realProfit: 0,
          remainingPayments: 0
        });
      }
      
      const monthData = dataByMonth.get(key)!;
      monthData.transactions.push(tx);
      
      // Add to financial totals - using projectValue as the true value
      const projectValue = tx.projectValue || 0;
      monthData.totalExpectedValue += projectValue;
      
      // Calculate paid amount based on payment status
      if (tx.paymentStatus === "Lunas") {
        monthData.totalPaid += projectValue;
      } else if (tx.paymentStatus === "DP") {
        monthData.totalPaid += (tx.downPaymentAmount || 0);
        monthData.remainingPayments += (tx.remainingAmount || 0);
      } else {
        monthData.remainingPayments += projectValue;
      }
    });
    
    // Process expenses and assign them to months
    processedExpenses.forEach(exp => {
      const date = new Date(exp.date);
      const year = date.getFullYear();
      const monthNum = date.getMonth() + 1;
      const key = `${year}-${monthNum.toString().padStart(2, '0')}`;
      
      if (!dataByMonth.has(key)) {
        dataByMonth.set(key, {
          month: getMonthName(monthNum),
          monthNum,
          year,
          transactions: [],
          expenses: [],
          totalExpectedValue: 0,
          totalPaid: 0,
          totalExpenses: 0,
          expectedProfit: 0,
          realProfit: 0,
          remainingPayments: 0
        });
      }
      
      const monthData = dataByMonth.get(key)!;
      monthData.expenses.push(exp);
      monthData.totalExpenses += exp.amount;
    });
    
    // Calculate expected and real profit for each month
    dataByMonth.forEach(data => {
      // Expected profit = total project values - expenses
      data.expectedProfit = data.totalExpectedValue - data.totalExpenses;
      
      // Real profit = actual paid amount - expenses
      data.realProfit = data.totalPaid - data.totalExpenses;
    });
    
    // Convert map to array and sort by date
    const dataArray = Array.from(dataByMonth.values())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthNum - b.monthNum;
      });
    
    setMonthlyData(dataArray);
    
    // Reset selected month if it's no longer in the data
    if (selectedMonth) {
      const stillExists = dataArray.some(
        d => d.year === selectedMonth.year && d.monthNum === selectedMonth.monthNum
      );
      if (!stillExists) {
        setSelectedMonth(null);
      }
    }
  }, [transactions, expenses, yearFilter, monthFilter, dateRange, selectedMonth]);
  
  // Load financial data
  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]); // Added missing dependency
  
  // Process and filter data when filters change
  useEffect(() => {
    processDataByMonths();
  }, [processDataByMonths]); // Added missing dependency
  
  // Get chart data for monthly breakdown
  const getMonthlyChartData = () => {
    return monthlyData.map(data => ({
      name: `${data.month.substring(0, 3)} ${data.year}`,
      expected: data.totalExpectedValue,
      paid: data.totalPaid,
      expenses: data.totalExpenses,
      expectedProfit: data.expectedProfit,
      realProfit: data.realProfit
    }));
  };
  
  // Get payment status breakdown data
  const getPaymentStatusData = () => {
    if (!selectedMonth) return [];
    
    const statusCounts = selectedMonth.transactions.reduce((acc, tx) => {
      const status = tx.paymentStatus;
      if (!acc[status]) acc[status] = { name: status, value: 0, count: 0 };
      acc[status].value += (tx.projectValue || 0);
      acc[status].count += 1;
      return acc;
    }, {} as Record<string, {name: string, value: number, count: number}>);
    
    return Object.values(statusCounts);
  };
  
  // Get expense categories breakdown
  const getExpenseCategoriesData = () => {
    if (!selectedMonth) return [];
    
    const categoryTotals = selectedMonth.expenses.reduce((acc, exp) => {
      const category = exp.category;
      if (!acc[category]) acc[category] = { name: category, value: 0 };
      acc[category].value += exp.amount;
      return acc;
    }, {} as Record<string, {name: string, value: number}>);
    
    return Object.values(categoryTotals);
  };
  
  // Month filter handler
  const handleMonthChange = (value: string) => {
    setDateRange(undefined);
    setMonthFilter(value === "all" ? null : parseInt(value));
  };

  // Year filter handler
  const handleYearChange = (value: string) => {
    setDateRange(undefined);
    setYearFilter(value === "all" ? new Date().getFullYear() : parseInt(value));
  };

  // Date range change handler
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      // Clear month and year filters when using date range
      setMonthFilter(null);
      setYearFilter(new Date().getFullYear());
    }
    setDateRange(range);
  };

  // Clear all filters
  const clearFilters = () => {
    setDateRange(undefined);
    setYearFilter(new Date().getFullYear());
    setMonthFilter(null);
  };

  // Custom tooltip for the chart
  const CustomBarTooltip = ({ active, payload, label }: CustomBarTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="grid gap-1.5">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-gray-700">{entry.name}:</span>
                </div>
                <span className="ml-4 font-medium">
                  Rp{formatRupiah(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Financial Analysis</h2>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setIsDatePickerOpen(true)}
            >
              <CalendarIcon className="h-4 w-4" />
              {dateRange?.from && dateRange?.to
                ? formatDateRange(dateRange)
                : "Select Date Range"}
            </Button>
        
            <DatePickerDialog
              isOpen={isDatePickerOpen}
              setIsOpen={setIsDatePickerOpen}
              selectedRange={dateRange}
              setSelectedRange={setDateRange}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select onValueChange={handleMonthChange} value={monthFilter?.toString() || "all"}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <SelectItem key={month} value={month.toString()}>
                  {getMonthName(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleYearChange} value={yearFilter.toString()}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={clearFilters} title="Clear filters">
            <span className="sr-only">Clear filters</span>
            ×
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-2">Loading financial data...</p>
        </div>
      ) : monthlyData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h3 className="text-lg font-semibold mb-2">No financial data found</h3>
          <p className="text-muted-foreground max-w-md">
            There&apos;s no financial data available for the selected filters. Try changing the date range or create some transactions.
          </p>
        </div>
      ) : (
        <>
          {/* Financial Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Project Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp{formatRupiah(monthlyData.reduce((sum, data) => sum + data.totalExpectedValue, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlyData.reduce((sum, data) => sum + data.transactions.length, 0)} transactions
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600">
                  Rp{formatRupiah(monthlyData.reduce((sum, data) => sum + data.totalExpenses, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlyData.reduce((sum, data) => sum + data.expenses.length, 0)} expense entries
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="text-sm font-medium flex items-center">
                        Expected Profit
                        <AlertTriangle className="h-3.5 w-3.5 ml-1 text-amber-500" />
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Expected profit based on total project values minus expenses</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  Rp{formatRupiah(monthlyData.reduce((sum, data) => sum + data.expectedProfit, 0))}
                </div>
                <p className="text-xs text-amber-600">
                  Pending: Rp{formatRupiah(monthlyData.reduce((sum, data) => sum + data.remainingPayments, 0))}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="text-sm font-medium flex items-center">
                        Real Profit
                        <AlertTriangle className="h-3.5 w-3.5 ml-1 text-amber-500" />
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Actual profit based on payments received minus expenses</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  Rp{formatRupiah(monthlyData.reduce((sum, data) => sum + data.realProfit, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on payments received
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Monthly Chart */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Financial Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={getMonthlyChartData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis 
                      tickFormatter={(value) => `Rp${formatRupiah(value)}`}
                      width={100}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar dataKey="expected" name="Expected Value" fill="#94a3b8" barSize={20} />
                    <Bar dataKey="paid" name="Paid" fill="#10b981" barSize={20} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" barSize={20} />
                    <Line 
                      type="monotone" 
                      dataKey="expectedProfit" 
                      name="Expected Profit" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      dot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="realProfit" 
                      name="Real Profit" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={{ r: 5 }}
                      strokeDasharray="5 5"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Monthly data cards */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Financial Data by Month</h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {monthlyData.map((data) => (
                <Card 
                  key={`${data.year}-${data.monthNum}`}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedMonth?.monthNum === data.monthNum && selectedMonth?.year === data.year
                      ? "border-2 border-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedMonth(data)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex justify-between items-center">
                      <span>{data.month} {data.year}</span>
                      {data.realProfit >= 0 ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Profit</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Loss</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Value:</span>
                        <span className="font-medium">Rp{formatRupiah(data.totalExpectedValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-medium text-green-600">Rp{formatRupiah(data.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expenses:</span>
                        <span className="font-medium text-red-500">Rp{formatRupiah(data.totalExpenses)}</span>
                      </div>
                      <div className="h-px w-full bg-gray-200 my-1.5" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Profit:</span>
                        <span className={data.expectedProfit >= 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                          Rp{formatRupiah(Math.abs(data.expectedProfit))}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Real Profit:</span>
                        <span className={data.realProfit >= 0 ? "text-blue-600" : "text-red-500"}>
                          Rp{formatRupiah(Math.abs(data.realProfit))}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {data.transactions.length} project{data.transactions.length !== 1 ? 's' : ''}, {data.expenses.length} expense{data.expenses.length !== 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Selected month detail */}
          {selectedMonth && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>
                  Detailed Analysis: {selectedMonth.month} {selectedMonth.year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="profitAnalysis">Profit Analysis</TabsTrigger>
                  </TabsList>
                  
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Financial Summary */}
                      <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 mb-1">Financial Summary</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Projects:</span>
                            <span className="font-medium">{selectedMonth.transactions.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Expenses:</span>
                            <span className="font-medium">{selectedMonth.expenses.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Expected Revenue:</span>
                            <span className="font-medium">Rp{formatRupiah(selectedMonth.totalExpectedValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Paid Amount:</span>
                            <span className="font-medium text-green-600">Rp{formatRupiah(selectedMonth.totalPaid)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Remaining Payments:</span>
                            <span className="font-medium text-amber-600">Rp{formatRupiah(selectedMonth.remainingPayments)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Expenses:</span>
                            <span className="font-medium text-red-500">Rp{formatRupiah(selectedMonth.totalExpenses)}</span>
                          </div>
                          <div className="h-px w-full bg-gray-200 my-2" />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Expected Profit:</span>
                            <span className={`font-medium ${selectedMonth.expectedProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              Rp{formatRupiah(Math.abs(selectedMonth.expectedProfit))}
                              {selectedMonth.expectedProfit < 0 && " (Loss)"}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="font-medium">Real Profit:</span>
                            <span className={`font-medium ${selectedMonth.realProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                              Rp{formatRupiah(Math.abs(selectedMonth.realProfit))}
                              {selectedMonth.realProfit < 0 && " (Loss)"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Payment Status Chart */}
                      <div>
                        <h3 className="font-bold text-gray-800 mb-4">Payment Status</h3>
                        <div className="h-64">
                          {getPaymentStatusData().length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={getPaymentStatusData()}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                >
                                  {getPaymentStatusData().map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || "#9ca3af"} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value) => `Rp${formatRupiah(value as number)}`}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              No transaction data available
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Expense Categories */}
                      <div>
                        <h3 className="font-bold text-gray-800 mb-4">Expense Categories</h3>
                        <div className="h-64">
                          {getExpenseCategoriesData().length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={getExpenseCategoriesData()}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                >
                                  {getExpenseCategoriesData().map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value) => `Rp${formatRupiah(value as number)}`}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              No expense data available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Transactions Tab */}
                  <TabsContent value="transactions" className="pt-4">
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Value</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedMonth.transactions.length > 0 ? (
                            selectedMonth.transactions
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map((tx) => {
                                // Calculate expenses for this transaction
                                const txExpenses = selectedMonth.expenses.filter(exp => exp.transactionId === tx.id);
                                const expenseTotal = txExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                                
                                // Calculate the real profit for this transaction
                                const realProfit = tx.paymentStatus === "Lunas" 
                                  ? (tx.projectValue || 0) - expenseTotal
                                  : tx.paymentStatus === "DP"
                                    ? (tx.downPaymentAmount || 0) - expenseTotal
                                    : -expenseTotal;
                                
                                return (
                                  <tr key={tx.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatDate(tx.date)}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900">{tx.name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">Rp{formatRupiah(tx.projectValue || 0)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 font-medium">
                                      Rp{formatRupiah(
                                        tx.paymentStatus === "Lunas" 
                                          ? (tx.projectValue || 0) 
                                          : tx.paymentStatus === "DP" 
                                            ? (tx.downPaymentAmount || 0) 
                                            : 0
                                      )}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        tx.paymentStatus === "Lunas"
                                          ? "bg-green-100 text-green-800"
                                          : tx.paymentStatus === "DP"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-red-100 text-red-800"
                                      }`}>
                                        {tx.paymentStatus}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600 font-medium">
                                      Rp{formatRupiah(expenseTotal)}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                      <span className={realProfit >= 0 ? "text-blue-600" : "text-red-600"}>
                                        Rp{formatRupiah(Math.abs(realProfit))}
                                        {realProfit < 0 && " (Loss)"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center py-4 text-muted-foreground">
                                No transactions found for this month
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                  
                  {/* Expenses Tab */}
                  <TabsContent value="expenses" className="pt-4">
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Related Project</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedMonth.expenses.length > 0 ? (
                            selectedMonth.expenses
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map((exp) => {
                                // Find related transaction name if any
                                const relatedTx = selectedMonth.transactions.find(tx => tx.id === exp.transactionId);
                                
                                return (
                                  <tr key={exp.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatDate(exp.date)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {exp.category}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900">{exp.description || "-"}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600 font-medium">
                                      Rp{formatRupiah(exp.amount)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900">
                                      {relatedTx ? relatedTx.name : "Unrelated"}
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan={5} className="text-center py-4 text-muted-foreground">
                                No expenses found for this month
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                  
                  {/* Profit Analysis Tab */}
                  <TabsContent value="profitAnalysis" className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Expected vs. Real Profit</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[
                                  {
                                    name: "Profit Comparison",
                                    expected: selectedMonth.expectedProfit,
                                    real: selectedMonth.realProfit,
                                    expectedMoney: Math.abs(selectedMonth.expectedProfit),
                                    realMoney: Math.abs(selectedMonth.realProfit)
                                  }
                                ]}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => `Rp${formatRupiah(value)}`} />
                                <Tooltip formatter={(value) => `Rp${formatRupiah(value as number)}`} />
                                <Legend />
                                <Bar 
                                  dataKey="expected" 
                                  name="Expected Profit" 
                                  fill="#6366f1"
                                  radius={[4, 4, 0, 0]}
                                />
                                <Bar 
                                  dataKey="real" 
                                  name="Real Profit" 
                                  fill="#f97316" 
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="mt-4 space-y-3">
                            <div className="flex justify-between items-center py-2 border-b">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
                                <span className="text-sm font-medium">Expected Profit:</span>
                              </div>
                              <span className={`text-sm font-bold ${selectedMonth.expectedProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                Rp{formatRupiah(Math.abs(selectedMonth.expectedProfit))}
                                {selectedMonth.expectedProfit < 0 && " (Loss)"}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center py-2 border-b">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                                <span className="text-sm font-medium">Real Profit:</span>
                              </div>
                              <span className={`text-sm font-bold ${selectedMonth.realProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                                Rp{formatRupiah(Math.abs(selectedMonth.realProfit))}
                                {selectedMonth.realProfit < 0 && " (Loss)"}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center py-2">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                                <span className="text-sm font-medium">Difference:</span>
                              </div>
                              <span className="text-sm font-bold">
                                Rp{formatRupiah(Math.abs(selectedMonth.expectedProfit - selectedMonth.realProfit))}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Profit Breakdown Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium">Revenue Components</h4>
                            <div className="h-px w-full bg-gray-200 my-1"></div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Project Value:</span>
                              <span className="font-medium">Rp{formatRupiah(selectedMonth.totalExpectedValue)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Already Paid:</span>
                              <span className="font-medium text-green-600">Rp{formatRupiah(selectedMonth.totalPaid)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Remaining Payments:</span>
                              <span className="font-medium text-amber-600">Rp{formatRupiah(selectedMonth.remainingPayments)}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium">Expense Components</h4>
                            <div className="h-px w-full bg-gray-200 my-1"></div>
                            
                            {getExpenseCategoriesData().length > 0 ? (
                              <div className="space-y-2">
                                {getExpenseCategoriesData().map((category, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{category.name}:</span>
                                    <span className="font-medium text-red-500">Rp{formatRupiah(category.value)}</span>
                                  </div>
                                ))}
                                <div className="h-px w-full bg-gray-200 my-1"></div>
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">Total Expenses:</span>
                                  <span className="font-medium text-red-500">Rp{formatRupiah(selectedMonth.totalExpenses)}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No expense data available</p>
                            )}
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-md mt-4">
                            <h4 className="text-sm font-medium mb-2">Payment Completion Status</h4>
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-blue-600 h-2.5 rounded-full" 
                                  style={{ width: `${(selectedMonth.totalPaid / selectedMonth.totalExpectedValue) * 100}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm font-medium">
                                {((selectedMonth.totalPaid / selectedMonth.totalExpectedValue) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Payment completion rate affects the difference between expected and real profit
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}