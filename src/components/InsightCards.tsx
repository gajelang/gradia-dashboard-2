"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  // Removed unused PaymentIcon
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  AlertTriangle 
} from "lucide-react";
import { formatRupiah } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/api";
import {DatePickerDialog} from "@/components/DatePickerDialog";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Define DateRange interface locally to ensure consistency
interface DateRange {
  from: Date;
  to: Date;
}

// Interface for transaction data
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
  isDeleted?: boolean; // Added isDeleted flag
  status?: string; // For legacy data support
}

// Interface for expense data
interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  transactionId?: string;
  isDeleted?: boolean; // Added isDeleted flag
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

// Interface for component props
interface EnhancedInsightCardsProps {
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

export default function EnhancedInsightCards({ onDateRangeChange }: EnhancedInsightCardsProps) {
  const { isAuthenticated } = useAuth();
  
  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined);
  // Kept available years as it might be used in future feature development
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // UI state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Format date range for display
  const formatDateRange = (range: DateRange | undefined): string => {
    if (range?.from && range?.to) {
      if (range.from.toDateString() === range.to.toDateString()) {
        return range.from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      } else {
        return `${range.from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${range.to.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
    }
    return "Pilih Rentang Tanggal";
  };

  // Navigation to previous period
  const goToPreviousPeriod = (): void => {
    if (!selectedRange?.from || !selectedRange?.to) return;
    
    const from = new Date(selectedRange.from);
    const to = new Date(selectedRange.to);
    
    // If month view
    if (from.getDate() === 1 && to.getDate() === new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate()) {
      from.setMonth(from.getMonth() - 1);
      const lastDayOfMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0);
      const newRange: DateRange = { from, to: lastDayOfMonth };
      setSelectedRange(newRange);
      if (onDateRangeChange) onDateRangeChange(newRange);
    } else {
      // Shift by number of days
      const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      from.setDate(from.getDate() - days);
      to.setDate(to.getDate() - days);
      const newRange: DateRange = { from, to };
      setSelectedRange(newRange);
      if (onDateRangeChange) onDateRangeChange(newRange);
    }
  };

  // Navigation to next period
  const goToNextPeriod = (): void => {
    if (!selectedRange?.from || !selectedRange?.to) return;
    
    const from = new Date(selectedRange.from);
    const to = new Date(selectedRange.to);
    
    // If month view
    if (from.getDate() === 1 && to.getDate() === new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate()) {
      from.setMonth(from.getMonth() + 1);
      const lastDayOfMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0);
      const newRange: DateRange = { from, to: lastDayOfMonth };
      setSelectedRange(newRange);
      if (onDateRangeChange) onDateRangeChange(newRange);
    } else {
      // Shift by number of days
      const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      from.setDate(from.getDate() + days);
      to.setDate(to.getDate() + days);
      const newRange: DateRange = { from, to };
      setSelectedRange(newRange);
      if (onDateRangeChange) onDateRangeChange(newRange);
    }
  };

  // Handle date range changes from the DatePickerDialog
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setSelectedRange(range);
    if (onDateRangeChange) onDateRangeChange(range);
  };

  // Get month name from number
  const getMonthName = (monthNum: number): string => {
    return new Date(2000, monthNum - 1, 1).toLocaleString('id-ID', { month: 'long' });
  };

  // Fetch financial data (memoized with useCallback)
  const fetchFinancialData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch transactions
      const resTransactions = await fetchWithAuth("/api/transactions", { cache: "no-store" });
      if (!resTransactions.ok) throw new Error("Failed to fetch transactions");
      let transactionsData: Transaction[] = await resTransactions.json();
      
      // Handle legacy data if needed and filter out archived transactions
      transactionsData = transactionsData
        .filter((tx: Transaction) => !tx.isDeleted) // Filter out archived transactions
        .map((tx: Transaction) => ({
          ...tx,
          paymentStatus: tx.paymentStatus || tx.status || "Belum Bayar", // Handle legacy format
          isDeleted: tx.isDeleted || false // Explicitly track isDeleted status
        }));
      
      // Fetch expenses
      const resExpenses = await fetchWithAuth("/api/expenses", { cache: "no-store" });
      if (!resExpenses.ok) throw new Error("Failed to fetch expenses");
      let expensesData: Expense[] = await resExpenses.json();
      
      // Filter out archived expenses
      expensesData = expensesData.filter((exp: Expense) => !exp.isDeleted);
      
      // Set data
      setTransactions(transactionsData);
      setExpenses(expensesData);
      
      // Extract unique years from active transactions and expenses
      const years = [...new Set([
        ...transactionsData.map(t => new Date(t.date).getFullYear()),
        ...expensesData.map(e => new Date(e.date).getFullYear())
      ])].sort((a, b) => b - a);
      
      setAvailableYears(years);
      
      // If no date range is set, default to current month
      if (!selectedRange) {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setSelectedRange({ from: firstDayOfMonth, to: lastDayOfMonth });
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast.error("Failed to load financial data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedRange]);

  // Process data into monthly records (memoized with useCallback)
  const processDataByMonths = useCallback(() => {
    if (!transactions.length && !expenses.length) return;

    // Create a map to store data by year-month
    const dataByMonth: Map<string, MonthlyData> = new Map();
    
    // Filter transactions - ensure we only process active transactions
    let filteredTransactions = [...transactions].filter(tx => !tx.isDeleted);
    
    // Filter transactions by date range
    if (selectedRange?.from && selectedRange?.to) {
      filteredTransactions = filteredTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= selectedRange.from && txDate <= selectedRange.to;
      });
    }
    
    // Filter expenses - ensure we only process active expenses
    let filteredExpenses = [...expenses].filter(exp => !exp.isDeleted);
    
    if (selectedRange?.from && selectedRange?.to) {
      filteredExpenses = filteredExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= selectedRange.from && expDate <= selectedRange.to;
      });
    }
    
    // Process transactions into monthly data
    filteredTransactions.forEach(tx => {
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
    filteredExpenses.forEach(exp => {
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
  }, [transactions, expenses, selectedRange]);

  // Load financial data with proper dependency
  useEffect(() => {
    if (isAuthenticated) {
      fetchFinancialData();
    }
  }, [isAuthenticated, fetchFinancialData]); // Added missing dependency
  
  // Process data when range changes with proper dependency
  useEffect(() => {
    processDataByMonths();
  }, [processDataByMonths]); // Added missing dependency

  // Calculate total expected value (from all monthly data)
  const getTotalExpectedValue = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalExpectedValue, 0);
  };
  
  // Calculate total expenses
  const getTotalExpenses = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalExpenses, 0);
  };
  
  // Calculate expected profit
  const getExpectedProfit = () => {
    return monthlyData.reduce((sum, data) => sum + data.expectedProfit, 0);
  };
  
  // Calculate real profit (based on paid amount)
  const getRealProfit = () => {
    return monthlyData.reduce((sum, data) => sum + data.realProfit, 0);
  };
  
  // Calculate total paid amount
  const getTotalPaid = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalPaid, 0);
  };
  
  // Calculate remaining payments
  const getRemainingPayments = () => {
    return monthlyData.reduce((sum, data) => sum + data.remainingPayments, 0);
  };

  // Get total transaction count
  const getTotalTransactionCount = () => {
    return monthlyData.reduce((sum, data) => sum + data.transactions.length, 0);
  };
  
  // Get total expense entries count
  const getTotalExpenseCount = () => {
    return monthlyData.reduce((sum, data) => sum + data.expenses.length, 0);
  };

  return (
    <div className="font-sans">
      {/* Date Range Controls */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setIsDatePickerOpen(true)}
          >
            <CalendarIcon className="h-4 w-4" />
            {selectedRange?.from && selectedRange?.to
              ? formatDateRange(selectedRange)
              : "Pilih Rentang Tanggal"}
          </Button>
          
          {/* Date Picker Dialog Component */}
          <DatePickerDialog
            isOpen={isDatePickerOpen}
            setIsOpen={setIsDatePickerOpen}
            selectedRange={selectedRange}
            setSelectedRange={setSelectedRange}
            onDateRangeChange={handleDateRangeChange}
          />
          
          {selectedRange?.from && selectedRange?.to && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToPreviousPeriod}
                title="Periode sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToNextPeriod}
                title="Periode berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Insight Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-5 w-28 bg-gray-200 animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-full bg-gray-200 animate-pulse rounded mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : monthlyData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h3 className="text-lg font-semibold mb-2">Data keuangan tidak ditemukan</h3>
          <p className="text-muted-foreground max-w-md">
            Tidak ada data keuangan untuk rentang tanggal yang dipilih. Coba ubah rentang tanggal atau buat transaksi baru.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Nilai Proyek</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp{formatRupiah(getTotalExpectedValue())}
              </div>
              <p className="text-xs text-muted-foreground">
                {getTotalTransactionCount()} transaksi
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">
                Rp{formatRupiah(getTotalExpenses())}
              </div>
              <p className="text-xs text-muted-foreground">
                {getTotalExpenseCount()} entri pengeluaran
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm font-medium flex items-center">
                      Profit (Expected)
                      <AlertTriangle className="h-3.5 w-3.5 ml-1 text-amber-500" />
                    </CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Profit yang diharapkan dari total nilai proyek dikurangi pengeluaran</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                Rp{formatRupiah(getExpectedProfit())}
              </div>
              <p className="text-xs text-amber-600">
                Tertunda: Rp{formatRupiah(getRemainingPayments())}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm font-medium flex items-center">
                      Profit (Aktual)
                      <AlertTriangle className="h-3.5 w-3.5 ml-1 text-amber-500" />
                    </CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Profit aktual berdasarkan pembayaran yang diterima dikurangi pengeluaran</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                Rp{formatRupiah(getRealProfit())}
              </div>
              <p className="text-xs text-muted-foreground">
                Berdasarkan pembayaran yang diterima
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Additional Monthly Summary Card (optional) */}
      {monthlyData.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Ringkasan Periode {formatDateRange(selectedRange)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Transaksi</h3>
                <p className="text-2xl font-semibold">{getTotalTransactionCount()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Pengeluaran</h3>
                <p className="text-2xl font-semibold">{getTotalExpenseCount()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Rate Pembayaran</h3>
                <p className="text-2xl font-semibold">
                  {getTotalExpectedValue() > 0 
                    ? `${((getTotalPaid() / getTotalExpectedValue()) * 100).toFixed(1)}%` 
                    : "0%"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Status Profit</h3>
                <div>
                  {getRealProfit() >= 0 ? (
                    <Badge className="bg-green-100 text-green-800">Profit</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Loss</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Profit vs. Pembayaran</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Total Nilai Proyek:</span>
                    <span className="font-medium">Rp{formatRupiah(getTotalExpectedValue())}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Sudah Dibayar:</span>
                    <span className="font-medium text-green-600">Rp{formatRupiah(getTotalPaid())}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Pengeluaran:</span>
                    <span className="font-medium text-red-500">Rp{formatRupiah(getTotalExpenses())}</span>
                  </div>
                  <div className="h-px w-full bg-gray-200 my-2"></div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Expected Profit:</span>
                    <span className={`font-medium ${getExpectedProfit() >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      Rp{formatRupiah(Math.abs(getExpectedProfit()))}
                      {getExpectedProfit() < 0 && " (Loss)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Real Profit:</span>
                    <span className={`font-medium ${getRealProfit() >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      Rp{formatRupiah(Math.abs(getRealProfit()))}
                      {getRealProfit() < 0 && " (Loss)"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Progress Pembayaran</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Progress:</span>
                      <span className="text-sm font-medium">
                        {getTotalExpectedValue() > 0 
                          ? `${((getTotalPaid() / getTotalExpectedValue()) * 100).toFixed(1)}%` 
                          : "0%"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ 
                          width: getTotalExpectedValue() > 0 
                            ? `${(getTotalPaid() / getTotalExpectedValue()) * 100}%` 
                            : "0%" 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-4 mb-1">
                    <span className="text-sm">Dibayar:</span>
                    <span className="font-medium">Rp{formatRupiah(getTotalPaid())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Belum Dibayar:</span>
                    <span className="font-medium text-amber-600">Rp{formatRupiah(getRemainingPayments())}</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    Rate pembayaran mempengaruhi perbedaan antara expected dan real profit
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}