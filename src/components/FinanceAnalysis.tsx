"use client";

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
  ComposedChart,
  Line,
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

// Transaction interface (hanya field yang relevan untuk project)
interface Transaction {
  id: string;
  name: string;
  description: string;
  amount: number;
  projectValue?: number;
  downPaymentAmount?: number;
  remainingAmount?: number;
  paymentStatus: string;
  date: string;
  isDeleted?: boolean;
  // Field lain yang tidak digunakan untuk analisis project bisa diabaikan
}

// Monthly data khusus project
interface MonthlyData {
  month: string;
  monthNum: number;
  year: number;
  transactions: Transaction[];
  totalExpectedValue: number;
  totalPaid: number;
  remainingPayments: number;
  collectionRate: number; // Persentase = (totalPaid / totalExpectedValue) * 100
}

// Date range type
interface DateRange {
  from: Date;
  to: Date;
}

interface CustomBarTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

// Warna untuk status pembayaran
const STATUS_COLORS: Record<string, string> = {
  "Lunas": "#22c55e",
  "DP": "#eab308",
  "Belum Bayar": "#ef4444"
};

export default function FinancialAnalysis() {
  // State untuk filter
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  
  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyData | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Fungsi untuk memformat range tanggal
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

  // Mendapatkan nama bulan dari nomor
  const getMonthName = (monthNum: number): string => {
    return new Date(2000, monthNum - 1, 1).toLocaleString("id-ID", { month: "long" });
  };

  // Memformat tanggal
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  // Fetch data project (hanya transaksi)
  const fetchFinancialData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch transactions dari API
      const resTransactions = await fetchWithAuth("/api/transactions", { cache: "no-store" });
      if (!resTransactions.ok) throw new Error("Failed to fetch transactions");
      const transactionsData: Transaction[] = await resTransactions.json();
      
      // Filter transaksi yang tidak dihapus
      const activeTransactions = transactionsData.filter(tx => tx.isDeleted !== true);
      setTransactions(activeTransactions);
      
      // Ekstrak tahun unik dari tanggal transaksi
      const years = [
        ...new Set(activeTransactions.map(t => new Date(t.date).getFullYear()))
      ].sort((a, b) => b - a);
      setAvailableYears(years);
    } catch (error) {
      console.error("Error fetching project data:", error);
      toast.error("Failed to load project data");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Memproses transaksi menjadi data bulanan (project)
  const processDataByMonths = useCallback(() => {
    if (!transactions.length) return;
    
    // Map untuk menyimpan data per bulan
    const dataByMonth: Map<string, MonthlyData> = new Map();
    
    // Filter transaksi berdasarkan range tanggal atau filter tahun/bulan
    let processedTransactions = [...transactions];
    if (dateRange?.from && dateRange?.to) {
      processedTransactions = processedTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= dateRange.from && txDate <= dateRange.to;
      });
    } else {
      if (yearFilter) {
        processedTransactions = processedTransactions.filter(tx => new Date(tx.date).getFullYear() === yearFilter);
      }
      if (monthFilter !== null) {
        processedTransactions = processedTransactions.filter(tx => new Date(tx.date).getMonth() + 1 === monthFilter);
      }
    }
    
    // Proses tiap transaksi ke dalam data bulanan
    processedTransactions.forEach(tx => {
      const date = new Date(tx.date);
      const year = date.getFullYear();
      const monthNum = date.getMonth() + 1;
      const key = `${year}-${monthNum.toString().padStart(2, "0")}`;
      
      if (!dataByMonth.has(key)) {
        dataByMonth.set(key, {
          month: getMonthName(monthNum),
          monthNum,
          year,
          transactions: [],
          totalExpectedValue: 0,
          totalPaid: 0,
          remainingPayments: 0,
          collectionRate: 0
        });
      }
      
      const monthData = dataByMonth.get(key)!;
      monthData.transactions.push(tx);
      
      const projectValue = tx.projectValue || 0;
      monthData.totalExpectedValue += projectValue;
      
      if (tx.paymentStatus === "Lunas") {
        monthData.totalPaid += projectValue;
      } else if (tx.paymentStatus === "DP") {
        monthData.totalPaid += (tx.downPaymentAmount || 0);
        monthData.remainingPayments += (tx.remainingAmount || (projectValue - (tx.downPaymentAmount || 0)));
      } else {
        monthData.remainingPayments += projectValue;
      }
    });
    
    // Hitung collection rate tiap bulan
    dataByMonth.forEach(data => {
      data.collectionRate = data.totalExpectedValue > 0 ? (data.totalPaid / data.totalExpectedValue) * 100 : 0;
    });
    
    const dataArray = Array.from(dataByMonth.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    });
    
    setMonthlyData(dataArray);
    
    if (selectedMonth) {
      const stillExists = dataArray.some(d => d.year === selectedMonth.year && d.monthNum === selectedMonth.monthNum);
      if (!stillExists) setSelectedMonth(null);
    }
  }, [transactions, yearFilter, monthFilter, dateRange, selectedMonth]);
  
  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);
  
  useEffect(() => {
    processDataByMonths();
  }, [processDataByMonths]);
  
  // Data chart bulanan
  const getMonthlyChartData = () => {
    return monthlyData.map(data => ({
      name: `${data.month.substring(0, 3)} ${data.year}`,
      expected: data.totalExpectedValue,
      paid: data.totalPaid,
      remaining: data.remainingPayments
    }));
  };
  
  // Handler filter
  const handleMonthChange = (value: string) => {
    setDateRange(undefined);
    setMonthFilter(value === "all" ? null : parseInt(value));
  };
  
  const handleYearChange = (value: string) => {
    setDateRange(undefined);
    setYearFilter(value === "all" ? new Date().getFullYear() : parseInt(value));
  };
  
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setMonthFilter(null);
      setYearFilter(new Date().getFullYear());
    }
    setDateRange(range);
  };
  
  const clearFilters = () => {
    setDateRange(undefined);
    setYearFilter(new Date().getFullYear());
    setMonthFilter(null);
  };
  
  // Custom tooltip untuk chart
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
        <h2 className="text-xl font-bold">Project Analysis</h2>
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
          <p className="ml-2">Loading project data...</p>
        </div>
      ) : monthlyData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h3 className="text-lg font-semibold mb-2">No project data found</h3>
          <p className="text-muted-foreground max-w-md">
            There's no project data available for the selected filters. Try changing the date range or create some transactions.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
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
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  Rp{formatRupiah(monthlyData.reduce((sum, data) => sum + data.totalPaid, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Amount received
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Remaining Payments</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  Rp{formatRupiah(monthlyData.reduce((sum, data) => sum + data.remainingPayments, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending collections
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {monthlyData.reduce((sum, data) => sum + data.totalExpectedValue, 0) > 0 
                    ? ((monthlyData.reduce((sum, data) => sum + data.totalPaid, 0) / monthlyData.reduce((sum, data) => sum + data.totalExpectedValue, 0)) * 100).toFixed(1)
                    : "0"}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Collection efficiency
                </p>
              </CardContent>
            </Card>
          </div>
  
          {/* Monthly Chart */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Project Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={getMonthlyChartData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `Rp${formatRupiah(value)}`} width={100} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar dataKey="expected" name="Expected Value" fill="#94a3b8" barSize={20} />
                    <Bar dataKey="paid" name="Paid" fill="#10b981" barSize={20} />
                    <Bar dataKey="remaining" name="Remaining" fill="#ef4444" barSize={20} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
  
          {/* Data per Bulan */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Project Data by Month</h3>
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
                      <Badge className={data.collectionRate >= 100 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {data.collectionRate.toFixed(0)}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected:</span>
                        <span className="font-medium">Rp{formatRupiah(data.totalExpectedValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-medium text-green-600">Rp{formatRupiah(data.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className="font-medium text-red-500">Rp{formatRupiah(data.remainingPayments)}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {data.transactions.length} project{data.transactions.length !== 1 ? "s" : ""}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
  
          {/* Detail Bulan Terpilih */}
          {selectedMonth && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>
                  Detailed Analysis: {selectedMonth.month} {selectedMonth.year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="profitAnalysis">Profit Analysis</TabsTrigger>
                  </TabsList>
                  
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 mb-1">Project Summary</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Projects:</span>
                            <span className="font-medium">{selectedMonth.transactions.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Value:</span>
                            <span className="font-medium">Rp{formatRupiah(selectedMonth.totalExpectedValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Paid Amount:</span>
                            <span className="font-medium text-green-600">Rp{formatRupiah(selectedMonth.totalPaid)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Remaining:</span>
                            <span className="font-medium text-amber-600">Rp{formatRupiah(selectedMonth.remainingPayments)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Collection Rate:</span>
                            <span className="font-medium">{selectedMonth.collectionRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
  
                      {/* Payment Status Placeholder */}
                      <div>
                        <h3 className="font-bold text-gray-800 mb-4">Payment Status</h3>
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          Payment status chart can be added here.
                        </div>
                      </div>
  
                      {/* Profit Analysis Tab */}
                      <div>
                        <h3 className="font-bold text-gray-800 mb-4">Profit Analysis</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                {
                                  name: "Comparison",
                                  expected: selectedMonth.totalExpectedValue,
                                  paid: selectedMonth.totalPaid
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
                                name="Expected Value" 
                                fill="#6366f1"
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar 
                                dataKey="paid" 
                                name="Collected" 
                                fill="#10b981" 
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 text-sm">
                          <p>
                            The collection rate for this month is <strong>{selectedMonth.collectionRate.toFixed(1)}%</strong>.
                          </p>
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Value</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedMonth.transactions.length > 0 ? (
                            selectedMonth.transactions
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map((tx) => {
                                const remaining = tx.paymentStatus === "Lunas" 
                                  ? 0 
                                  : tx.paymentStatus === "DP" 
                                    ? (tx.remainingAmount || 0) 
                                    : tx.projectValue || 0;
                                
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
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-amber-600 font-medium">
                                      Rp{formatRupiah(remaining)}
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
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center py-4 text-muted-foreground">
                                No transactions found for this month
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
                          <CardTitle className="text-base">Expected vs. Collected</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[
                                  {
                                    name: "Comparison",
                                    expected: selectedMonth.totalExpectedValue,
                                    paid: selectedMonth.totalPaid
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
                                  name="Expected Value" 
                                  fill="#6366f1"
                                  radius={[4, 4, 0, 0]}
                                />
                                <Bar 
                                  dataKey="paid" 
                                  name="Collected" 
                                  fill="#10b981" 
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-4 text-sm">
                            <p>
                              The collection rate for this month is <strong>{selectedMonth.collectionRate.toFixed(1)}%</strong>.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
  
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Collection Breakdown</CardTitle>
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
                              <span className="text-muted-foreground">Collected:</span>
                              <span className="font-medium text-green-600">Rp{formatRupiah(selectedMonth.totalPaid)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Remaining:</span>
                              <span className="font-medium text-amber-600">Rp{formatRupiah(selectedMonth.remainingPayments)}</span>
                            </div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-md mt-4">
                            <h4 className="text-sm font-medium mb-2">Payment Completion</h4>
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
                              Collection rate shows the percentage of expected revenue that has been collected.
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
