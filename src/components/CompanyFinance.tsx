"use client";

import { useState, useEffect, useCallback } from "react";
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
  Line,
  ComposedChart,
  Area
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
  CalendarIcon,
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertTriangle,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ArrowUp,
  ArrowDown,
  Minus
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

// ======================= INTERFACES =======================

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
  capitalCost?: number;
  isDeleted?: boolean;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  transactionId?: string;
  isDeleted?: boolean;
}

interface MonthlyData {
  // Kita tambahkan monthLabel agar menampilkan bulan + tahun
  monthLabel: string;
  month: string;
  monthNum: number;
  year: number;
  revenue: number;
  projectExpenses: number;
  operationalExpenses: number;
  totalExpenses: number;
  netProfit: number;
  cashflow: number;
}

interface CategoryExpense {
  category: string;
  projectAmount: number;
  operationalAmount: number;
  totalAmount: number;
  percentage: number;
  trend: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// ======================= PERIOD FILTER TYPE =======================

// Tambahkan "all" untuk All Time
type PeriodFilter = 
  | "all"
  | "this-month"
  | "this-quarter"
  | "this-year"
  | "last-month"
  | "last-quarter"
  | "last-year"
  | "custom";

// ======================= CHART COLORS =======================

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

// ======================= MAIN COMPONENT =======================

export default function CompanyFinance() {
  // Default periodFilter = "all"
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);

  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([]);
  const [operationalVsProjectExpenses, setOperationalVsProjectExpenses] = useState<{
    operational: number;
    project: number;
    total: number;
  }>({ operational: 0, project: 0, total: 0 });

  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // ======================= UTILITIES =======================

  const formatDateRange = (range: DateRange | undefined): string => {
    if (range?.from && range?.to) {
      if (range.from.toDateString() === range.to.toDateString()) {
        return range.from.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      } else {
        return `${range.from.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - ${range.to.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
      }
    }
    return "All time";
  };

  const getMonthName = (monthNum: number): string => {
    return new Date(2000, monthNum - 1, 1).toLocaleString("id-ID", { month: "long" });
  };

  // ============ GET PERIOD DATE RANGE ============

  const getPeriodDateRange = (period: PeriodFilter): { from: Date; to: Date } => {
    const now = new Date();
    let from: Date, to: Date;

    if (period === "all") {
      from = new Date(1970, 0, 1); // 1 Jan 1970
      to = new Date(9999, 11, 31); // 31 Des 9999
    } else {
      switch (period) {
        case "this-month":
          from = new Date(now.getFullYear(), now.getMonth(), 1);
          to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case "last-month":
          from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          to = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case "this-quarter":
          {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            from = new Date(now.getFullYear(), currentQuarter * 3, 1);
            to = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
          }
          break;
        case "last-quarter":
          {
            const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
            const yearOfLastQuarter = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
            const actualLastQuarter = lastQuarter < 0 ? 3 : lastQuarter;
            from = new Date(yearOfLastQuarter, actualLastQuarter * 3, 1);
            to = new Date(yearOfLastQuarter, (actualLastQuarter + 1) * 3, 0);
          }
          break;
        case "this-year":
          from = new Date(now.getFullYear(), 0, 1);
          to = new Date(now.getFullYear(), 11, 31);
          break;
        case "last-year":
          from = new Date(now.getFullYear() - 1, 0, 1);
          to = new Date(now.getFullYear() - 1, 11, 31);
          break;
        case "custom":
          if (dateRange?.from && dateRange?.to) {
            from = dateRange.from;
            to = dateRange.to;
          } else {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          }
          break;
        default:
          from = new Date(now.getFullYear(), now.getMonth(), 1);
          to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    }

    return { from, to };
  };

  const formatPeriodLabel = (period: PeriodFilter): string => {
    if (period === "all") return "All time";
    switch (period) {
      case "this-month":
        return new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      case "last-month":
        {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return lastMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        }
      case "this-quarter":
        {
          const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
          return `Q${currentQuarter} ${new Date().getFullYear()}`;
        }
      case "last-quarter":
        {
          let lastQuarter = Math.floor(new Date().getMonth() / 3);
          let year = new Date().getFullYear();
          if (lastQuarter === 0) {
            lastQuarter = 4;
            year -= 1;
          }
          return `Q${lastQuarter} ${year}`;
        }
      case "this-year":
        return new Date().getFullYear().toString();
      case "last-year":
        return (new Date().getFullYear() - 1).toString();
      case "custom":
        return dateRange ? formatDateRange(dateRange) : "Custom Period";
      default:
        return "Custom Period";
    }
  };

  // ============ HANDLERS ============

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range) {
      setPeriodFilter("custom");
    }
  };

  // ============ FETCH DATA ============

  const fetchFinancialData = useCallback(async () => {
    try {
      setIsLoading(true);

      const resTransactions = await fetchWithAuth("/api/transactions", { cache: "no-store" });
      if (!resTransactions.ok) throw new Error("Failed to fetch transactions");
      const transactionsData: Transaction[] = await resTransactions.json();

      // Filter out deleted
      const activeTransactions = transactionsData.filter((tx) => !tx.isDeleted);

      const resExpenses = await fetchWithAuth("/api/expenses", { cache: "no-store" });
      if (!resExpenses.ok) throw new Error("Failed to fetch expenses");
      const expensesData: Expense[] = await resExpenses.json();

      // Filter out deleted
      const activeExpenses = expensesData.filter((exp) => !exp.isDeleted);

      setTransactions(activeTransactions);
      setExpenses(activeExpenses);

      processMonthlyData(activeTransactions, activeExpenses);
      processCategoryData(activeExpenses);
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast.error("Failed to load financial data");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, periodFilter]);

  // ============ PROCESS MONTHLY DATA ============

  const processMonthlyData = (transactions: Transaction[], expenses: Expense[]) => {
    const { from, to } = getPeriodDateRange(periodFilter);

    // Filter data
    const filteredTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= from && txDate <= to;
    });
    const filteredExpenses = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate >= from && expDate <= to;
    });

    // Kumpulkan unique year-month dari transaksinya
    const uniqueYearMonths = new Set<string>();

    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      uniqueYearMonths.add(`${y}-${m}`);
    });
    filteredExpenses.forEach((exp) => {
      const d = new Date(exp.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      uniqueYearMonths.add(`${y}-${m}`);
    });

    // Buat map
    const monthlyDataMap = new Map<string, MonthlyData>();

    // Inisialisasi MonthlyData hanya untuk year-month yang ada datanya
    uniqueYearMonths.forEach((ym) => {
      const [yStr, mStr] = ym.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);

      monthlyDataMap.set(ym, {
        monthLabel: `${getMonthName(m)} ${y}`, // ex: "Juli 2023"
        month: getMonthName(m),
        monthNum: m,
        year: y,
        revenue: 0,
        projectExpenses: 0,
        operationalExpenses: 0,
        totalExpenses: 0,
        netProfit: 0,
        cashflow: 0,
      });
    });

    // Proses transactions -> revenue
    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const ym = `${y}-${m}`;

      const data = monthlyDataMap.get(ym);
      if (data) {
        if (tx.paymentStatus === "Lunas") {
          data.revenue += tx.projectValue || 0;
        } else if (tx.paymentStatus === "DP") {
          data.revenue += tx.downPaymentAmount || 0;
        }
      }
    });

    // Proses expenses
    filteredExpenses.forEach((exp) => {
      const d = new Date(exp.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const ym = `${y}-${m}`;

      const data = monthlyDataMap.get(ym);
      if (data) {
        if (exp.transactionId) {
          data.projectExpenses += exp.amount;
        } else {
          data.operationalExpenses += exp.amount;
        }
      }
    });

    // Hitung totalExpenses, netProfit, cashflow
    monthlyDataMap.forEach((val) => {
      val.totalExpenses = val.projectExpenses + val.operationalExpenses;
      val.netProfit = val.revenue - val.totalExpenses;
      val.cashflow = val.netProfit;
    });

    // Convert ke array, sort
    let monthlyArray = Array.from(monthlyDataMap.values());
    monthlyArray = monthlyArray.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    });

    setMonthlyData(monthlyArray);
  };

  // ============ PROCESS CATEGORY DATA ============

  const processCategoryData = (expenses: Expense[]) => {
    const { from, to } = getPeriodDateRange(periodFilter);

    const filteredExpenses = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate >= from && expDate <= to;
    });

    const categoryMap = new Map<
      string,
      {
        projectAmount: number;
        operationalAmount: number;
        totalAmount: number;
      }
    >();

    filteredExpenses.forEach((exp) => {
      const category = exp.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          projectAmount: 0,
          operationalAmount: 0,
          totalAmount: 0,
        });
      }
      const catData = categoryMap.get(category)!;

      if (exp.transactionId) {
        catData.projectAmount += exp.amount;
      } else {
        catData.operationalAmount += exp.amount;
      }
      catData.totalAmount = catData.projectAmount + catData.operationalAmount;
      categoryMap.set(category, catData);
    });

    const totalExpenses = Array.from(categoryMap.values()).reduce((acc, cur) => acc + cur.totalAmount, 0);

    let totalProjectExpenses = 0;
    let totalOperationalExpenses = 0;

    categoryMap.forEach((v) => {
      totalProjectExpenses += v.projectAmount;
      totalOperationalExpenses += v.operationalAmount;
    });

    setOperationalVsProjectExpenses({
      operational: totalOperationalExpenses,
      project: totalProjectExpenses,
      total: totalProjectExpenses + totalOperationalExpenses,
    });

    const catArray: CategoryExpense[] = Array.from(categoryMap.entries())
      .map(([cat, val]) => ({
        category: cat,
        projectAmount: val.projectAmount,
        operationalAmount: val.operationalAmount,
        totalAmount: val.totalAmount,
        percentage: totalExpenses > 0 ? (val.totalAmount / totalExpenses) * 100 : 0,
        trend: 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    setCategoryExpenses(catArray);
  };

  // ============ EFFECTS ============

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData, periodFilter, dateRange]);

  // ============ TOOLTIP COMPONENTS ============

  const CustomBarTooltip = ({ active, payload, label }: CustomTooltipProps) => {
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

  const CustomPieTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
          <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
          <div className="grid gap-1">
            <div className="flex justify-between gap-4">
              <span>Amount:</span>
              <span className="font-medium">Rp{formatRupiah(data.value)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Percentage:</span>
              <span className="font-medium">{data.payload.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // ======================= RENDER =======================

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Company Finance Overview</h2>

        <div className="flex items-center gap-2">
          {/* TOMBOL DATE PICKER */}
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setIsDatePickerOpen(true)}
          >
            <CalendarIcon className="h-4 w-4" />
            {dateRange
              ? formatDateRange(dateRange)
              : formatPeriodLabel(periodFilter)}
          </Button>

          <DatePickerDialog
            isOpen={isDatePickerOpen}
            setIsOpen={setIsDatePickerOpen}
            selectedRange={dateRange}
            setSelectedRange={setDateRange}
            onDateRangeChange={handleDateRangeChange}
          />

          {/* SELECT PERIOD */}
          <Select
            value={periodFilter}
            onValueChange={(value: PeriodFilter) => {
              setPeriodFilter(value);
              if (value !== "custom") {
                setDateRange(undefined);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="last-quarter">Last Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
              {dateRange && <SelectItem value="custom">Custom Range</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-32">
              <CardContent className="p-6">
                <div className="h-4 w-28 bg-gray-200 animate-pulse rounded mb-4"></div>
                <div className="h-8 w-full bg-gray-200 animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp{formatRupiah(monthlyData.reduce((sum, data) => sum + data.revenue, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {transactions.filter(t => t.paymentStatus !== "Belum Bayar").length} paid transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Operational Expenses</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600">
                  Rp{formatRupiah(operationalVsProjectExpenses.operational)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(operationalVsProjectExpenses.total > 0
                    ? ((operationalVsProjectExpenses.operational / operationalVsProjectExpenses.total) * 100).toFixed(1)
                    : "0")}%
                  {" "}of total expenses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Project Expenses</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  Rp{formatRupiah(operationalVsProjectExpenses.project)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(operationalVsProjectExpenses.total > 0
                    ? ((operationalVsProjectExpenses.project / operationalVsProjectExpenses.total) * 100).toFixed(1)
                    : "0")}%
                  {" "}of total expenses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  Rp{formatRupiah(monthlyData.reduce((sum, data) => sum + data.netProfit, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlyData.reduce((sum, data) => sum + data.revenue, 0) > 0
                    ? (
                        (monthlyData.reduce((sum, data) => sum + data.netProfit, 0)
                        /
                        monthlyData.reduce((sum, data) => sum + data.revenue, 0)
                        )
                        * 100
                      ).toFixed(1)
                    : "0"}%
                  {" "}profit margin
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-[400px] mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="monthly">Monthly Analysis</TabsTrigger>
            </TabsList>

            {/* ===================== OVERVIEW ===================== */}
            <TabsContent value="overview" className="space-y-6">

              {/* 1. Revenue vs Expenses Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Wrapper agar bisa horizontal scroll jika data terlalu banyak */}
                  <div style={{ width: "100%", overflowX: "auto" }}>
                    {/* Width chart disesuaikan dengan jumlah data */}
                    <div>
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="monthLabel" />
                          <YAxis
                            tickFormatter={(value) =>
                              `Rp${
                                value < 1_000_000
                                  ? (value / 1_000).toFixed(0) + "K"
                                  : (value / 1_000_000).toFixed(1) + "M"
                              }`
                            }
                            width={80}
                          />
                          <Tooltip content={<CustomBarTooltip />} />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="#10b981" barSize={20} />
                          <Bar dataKey="operationalExpenses" name="Operational Expenses" stackId="expenses" fill="#f97316" barSize={20} />
                          <Bar dataKey="projectExpenses" name="Project Expenses" stackId="expenses" fill="#f59e0b" barSize={20} />
                          <Line
                            type="monotone"
                            dataKey="netProfit"
                            name="Net Profit"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={{ r: 5 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Expense Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-[300px] flex items-center justify-center">
                      {operationalVsProjectExpenses.total > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "Operational Expenses",
                                  value: operationalVsProjectExpenses.operational,
                                  percentage:
                                    operationalVsProjectExpenses.total > 0
                                      ? (operationalVsProjectExpenses.operational /
                                          operationalVsProjectExpenses.total) *
                                        100
                                      : 0,
                                },
                                {
                                  name: "Project Expenses",
                                  value: operationalVsProjectExpenses.project,
                                  percentage:
                                    operationalVsProjectExpenses.total > 0
                                      ? (operationalVsProjectExpenses.project /
                                          operationalVsProjectExpenses.total) *
                                        100
                                      : 0,
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              innerRadius={60}
                              dataKey="value"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              <Cell fill="#f97316" />
                              <Cell fill="#f59e0b" />
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <BarChartIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                          <p>No expense data available for this period</p>
                        </div>
                      )}
                    </div>

                    {operationalVsProjectExpenses.total > 0 && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-orange-50 p-3 rounded-md">
                          <div className="text-sm font-medium flex items-center">
                            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                            Operational
                          </div>
                          <div className="mt-1">
                            <span className="text-lg font-bold">
                              Rp{formatRupiah(operationalVsProjectExpenses.operational)}
                            </span>
                          </div>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-md">
                          <div className="text-sm font-medium flex items-center">
                            <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
                            Project-Related
                          </div>
                          <div className="mt-1">
                            <span className="text-lg font-bold">
                              Rp{formatRupiah(operationalVsProjectExpenses.project)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 3. Top Expense Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Expense Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {categoryExpenses.length > 0 ? (
                        <>
                          <div className="space-y-3">
                            {categoryExpenses.slice(0, 5).map((category, index) => (
                              <div key={index} className="flex flex-col">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center">
                                    <div
                                      className="w-3 h-3 rounded-full mr-2"
                                      style={{
                                        backgroundColor:
                                          CHART_COLORS[index % CHART_COLORS.length],
                                      }}
                                    ></div>
                                    <span className="text-sm font-medium">{category.category}</span>
                                  </div>
                                  <span className="text-sm font-bold">
                                    Rp{formatRupiah(category.totalAmount)}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 h-2 rounded-full">
                                  <div
                                    className="h-2 rounded-full"
                                    style={{
                                      width: `${category.percentage}%`,
                                      backgroundColor:
                                        CHART_COLORS[index % CHART_COLORS.length],
                                    }}
                                  ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <div className="flex items-center">
                                    <span>{category.percentage.toFixed(1)}% of total</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>Project: Rp{formatRupiah(category.projectAmount)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {categoryExpenses.length > 5 && (
                            <div className="text-center text-sm text-muted-foreground">
                              + {categoryExpenses.length - 5} more categories
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <PieChartIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                          <p>No category data available for this period</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 4. Cashflow Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Cashflow Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ width: "100%", overflowX: "auto" }}>
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="monthLabel" />
                          <YAxis
                            tickFormatter={(value) =>
                              `Rp${
                                value < 1_000_000
                                  ? (value / 1_000).toFixed(0) + "K"
                                  : (value / 1_000_000).toFixed(1) + "M"
                              }`
                            }
                            width={80}
                          />
                          <Tooltip content={<CustomBarTooltip />} />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            fill="#dcfce7"
                            stroke="#10b981"
                            fillOpacity={0.5}
                          />
                          <Area
                            type="monotone"
                            dataKey="totalExpenses"
                            name="Total Expenses"
                            fill="#fee2e2"
                            stroke="#ef4444"
                            fillOpacity={0.5}
                          />
                          <Line
                            type="monotone"
                            dataKey="netProfit"
                            name="Net Profit"
                            stroke="#6366f1"
                            dot={{ fill: "#6366f1", r: 5 }}
                            strokeWidth={2}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===================== CATEGORIES ===================== */}
            <TabsContent value="categories" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Expense Categories Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryExpenses.length > 0 ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryExpenses.map((category, index) => (
                          <div
                            key={index}
                            className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{
                                    backgroundColor:
                                      CHART_COLORS[index % CHART_COLORS.length],
                                  }}
                                ></div>
                                <span className="font-medium">{category.category}</span>
                              </div>
                              <Badge variant="outline">{category.percentage.toFixed(1)}%</Badge>
                            </div>
                            <div className="text-lg font-bold">
                              Rp{formatRupiah(category.totalAmount)}
                            </div>
                            <div className="mt-3 space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                                  <span className="text-amber-700">Project:</span>
                                  <span className="font-medium">
                                    Rp{formatRupiah(category.projectAmount)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                                  <span className="text-orange-700">Operational:</span>
                                  <span className="font-medium">
                                    Rp{formatRupiah(category.operationalAmount)}
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
                                <div className="flex h-2 rounded-full">
                                  <div
                                    className="h-2 rounded-l-full"
                                    style={{
                                      width:
                                        category.totalAmount > 0
                                          ? `${
                                              (category.projectAmount / category.totalAmount) * 100
                                            }%`
                                          : "0%",
                                      backgroundColor: "#f59e0b",
                                    }}
                                  ></div>
                                  <div
                                    className="h-2 rounded-r-full"
                                    style={{
                                      width:
                                        category.totalAmount > 0
                                          ? `${
                                              (category.operationalAmount / category.totalAmount) *
                                              100
                                            }%`
                                          : "0%",
                                      backgroundColor: "#f97316",
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <PieChartIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p>No category data available for this period</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Distribution Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {operationalVsProjectExpenses.total > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium mb-4">Project vs Operational Split</h3>
                        <div className="h-60">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  {
                                    name: "Operational Expenses",
                                    value: operationalVsProjectExpenses.operational,
                                    percentage:
                                      operationalVsProjectExpenses.total > 0
                                        ? (operationalVsProjectExpenses.operational /
                                            operationalVsProjectExpenses.total) *
                                          100
                                        : 0,
                                  },
                                  {
                                    name: "Project Expenses",
                                    value: operationalVsProjectExpenses.project,
                                    percentage:
                                      operationalVsProjectExpenses.total > 0
                                        ? (operationalVsProjectExpenses.project /
                                            operationalVsProjectExpenses.total) *
                                          100
                                        : 0,
                                  },
                                ]}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                              >
                                <Cell fill="#f97316" />
                                <Cell fill="#f59e0b" />
                              </Pie>
                              <Tooltip content={<CustomPieTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-4">Analysis</h3>
                        <div className="space-y-4">
                          <div className="p-4 border rounded-lg">
                            <div className="text-sm font-medium mb-1">Operational Ratio</div>
                            <div className="text-2xl font-bold">
                              {operationalVsProjectExpenses.total > 0
                                ? (
                                    (operationalVsProjectExpenses.operational /
                                      operationalVsProjectExpenses.total) *
                                    100
                                  ).toFixed(1)
                                : "0"}
                              %
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {operationalVsProjectExpenses.operational >
                              operationalVsProjectExpenses.project ? (
                                <div className="flex items-center text-rose-600">
                                  <AlertTriangle className="h-4 w-4 mr-1" />
                                  Operational costs are higher than project-related expenses
                                </div>
                              ) : (
                                <div className="flex items-center text-emerald-600">
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  Project expenses properly exceed operational costs
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="p-4 border rounded-lg">
                            <div className="text-sm font-medium mb-1">Revenue to Expense Ratio</div>
                            <div className="text-2xl font-bold">
                              {operationalVsProjectExpenses.total > 0 &&
                              monthlyData.reduce((sum, data) => sum + data.revenue, 0) > 0
                                ? (
                                    (monthlyData.reduce((sum, data) => sum + data.revenue, 0) /
                                      operationalVsProjectExpenses.total) *
                                    100
                                  ).toFixed(1)
                                : "0"}
                              %
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {monthlyData.reduce((sum, data) => sum + data.revenue, 0) >
                              operationalVsProjectExpenses.total ? (
                                <div className="flex items-center text-emerald-600">
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  Revenue exceeds expenses - positive cashflow
                                </div>
                              ) : (
                                <div className="flex items-center text-rose-600">
                                  <TrendingDown className="h-4 w-4 mr-1" />
                                  Expenses exceed revenue - negative cashflow
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChartIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p>No expense data available for this period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===================== MONTHLY ===================== */}
            <TabsContent value="monthly" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Financial Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyData.length > 0 ? (
                    <div className="space-y-6">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border px-4 py-2 text-left">Month</th>
                              <th className="border px-4 py-2 text-right">Revenue</th>
                              <th className="border px-4 py-2 text-right">Operational</th>
                              <th className="border px-4 py-2 text-right">Project</th>
                              <th className="border px-4 py-2 text-right">Total Expenses</th>
                              <th className="border px-4 py-2 text-right">Net Profit</th>
                              <th className="border px-4 py-2 text-right">Profit Margin</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyData.map((data, index) => {
                              const profitMargin =
                                data.revenue > 0
                                  ? (data.netProfit / data.revenue) * 100
                                  : 0;
                              return (
                                <tr
                                  key={index}
                                  className={
                                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                  }
                                >
                                  <td className="border px-4 py-2 font-medium">
                                    {data.monthLabel}
                                  </td>
                                  <td className="border px-4 py-2 text-right">
                                    Rp{formatRupiah(data.revenue)}
                                  </td>
                                  <td className="border px-4 py-2 text-right text-orange-600">
                                    Rp{formatRupiah(data.operationalExpenses)}
                                  </td>
                                  <td className="border px-4 py-2 text-right text-amber-600">
                                    Rp{formatRupiah(data.projectExpenses)}
                                  </td>
                                  <td className="border px-4 py-2 text-right text-rose-600">
                                    Rp{formatRupiah(data.totalExpenses)}
                                  </td>
                                  <td
                                    className={`border px-4 py-2 text-right font-medium ${
                                      data.netProfit >= 0
                                        ? "text-emerald-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    Rp{formatRupiah(Math.abs(data.netProfit))}
                                    {data.netProfit < 0 && " (Loss)"}
                                  </td>
                                  <td
                                    className={`border px-4 py-2 text-right ${
                                      profitMargin >= 0
                                        ? "text-emerald-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {profitMargin.toFixed(1)}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-100 font-medium">
                            <tr>
                              <td className="border px-4 py-2">TOTAL</td>
                              <td className="border px-4 py-2 text-right">
                                Rp{formatRupiah(
                                  monthlyData.reduce(
                                    (sum, data) => sum + data.revenue,
                                    0
                                  )
                                )}
                              </td>
                              <td className="border px-4 py-2 text-right text-orange-600">
                                Rp{formatRupiah(
                                  monthlyData.reduce(
                                    (sum, data) =>
                                      sum + data.operationalExpenses,
                                    0
                                  )
                                )}
                              </td>
                              <td className="border px-4 py-2 text-right text-amber-600">
                                Rp{formatRupiah(
                                  monthlyData.reduce(
                                    (sum, data) => sum + data.projectExpenses,
                                    0
                                  )
                                )}
                              </td>
                              <td className="border px-4 py-2 text-right text-rose-600">
                                Rp{formatRupiah(
                                  monthlyData.reduce(
                                    (sum, data) => sum + data.totalExpenses,
                                    0
                                  )
                                )}
                              </td>
                              <td
                                className={`border px-4 py-2 text-right font-bold ${
                                  monthlyData.reduce(
                                    (sum, data) => sum + data.netProfit,
                                    0
                                  ) >= 0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                Rp{formatRupiah(
                                  Math.abs(
                                    monthlyData.reduce(
                                      (sum, data) => sum + data.netProfit,
                                      0
                                    )
                                  )
                                )}
                                {monthlyData.reduce(
                                  (sum, data) => sum + data.netProfit,
                                  0
                                ) < 0 && " (Loss)"}
                              </td>
                              <td
                                className={`border px-4 py-2 text-right ${
                                  monthlyData.reduce(
                                    (sum, data) => sum + data.revenue,
                                    0
                                  ) > 0 &&
                                  (monthlyData.reduce(
                                    (sum, data) => sum + data.netProfit,
                                    0
                                  ) /
                                    monthlyData.reduce(
                                      (sum, data) => sum + data.revenue,
                                      0
                                    )) *
                                    100 >=
                                    0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {monthlyData.reduce(
                                  (sum, data) => sum + data.revenue,
                                  0
                                ) > 0
                                  ? (
                                      (monthlyData.reduce(
                                        (sum, data) => sum + data.netProfit,
                                        0
                                      ) /
                                        monthlyData.reduce(
                                          (sum, data) => sum + data.revenue,
                                          0
                                        )) *
                                      100
                                    ).toFixed(1)
                                  : "0"}
                                %
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* B. CHARTS (NET PROFIT TREND & REVENUE VS EXPENSES) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-medium mb-4">Monthly Net Profit Trend</h3>
                          <div style={{ width: "100%", overflowX: "auto" }}>
                            <div
                              style={{
                                width: monthlyData.length * 80,
                                minWidth: 400,
                              }}
                            >
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="monthLabel" />
                                  <YAxis
                                    tickFormatter={(value) =>
                                      `Rp${
                                        value < 1_000_000
                                          ? (value / 1_000).toFixed(0) + "K"
                                          : (value / 1_000_000).toFixed(1) + "M"
                                      }`
                                    }
                                  />
                                  <Tooltip content={<CustomBarTooltip />} />
                                  <Bar
                                    dataKey="netProfit"
                                    name="Net Profit"
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                  >
                                    {monthlyData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={
                                          entry.netProfit >= 0 ? "#10b981" : "#ef4444"
                                        }
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium mb-4">Revenue vs Expenses</h3>
                          <div style={{ width: "100%", overflowX: "auto" }}>
                            <div
                              style={{
                                width: monthlyData.length * 80,
                                minWidth: 400,
                              }}
                            >
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="monthLabel" />
                                  <YAxis
                                    tickFormatter={(value) =>
                                      `Rp${
                                        value < 1_000_000
                                          ? (value / 1_000).toFixed(0) + "K"
                                          : (value / 1_000_000).toFixed(1) + "M"
                                      }`
                                    }
                                  />
                                  <Tooltip content={<CustomBarTooltip />} />
                                  <Legend />
                                  <Bar
                                    dataKey="revenue"
                                    name="Revenue"
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                  />
                                  <Bar
                                    dataKey="totalExpenses"
                                    name="Total Expenses"
                                    fill="#ef4444"
                                    radius={[4, 4, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChartIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p>No monthly data available for this period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}