"use client"

import { useEffect, useState } from "react"
import {
  BarChart as BarChartIcon,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart,
  ReceiptCent
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList
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
import { Button } from "@/components/ui/button"
import { fetchWithAuth } from "@/lib/api"
import { formatRupiah } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"

// Interfaces
interface Transaction {
  id: string;
  name: string;
  amount: number;
  projectValue?: number;
  totalProfit?: number;
  date: string;
  isDeleted?: boolean;
  capitalCost?: number;
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

interface TransactionProfitability {
  id: string;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  date: string;
  formattedMargin: string;
}

// Period filter type
type PeriodFilter = 'this-month' | 'this-quarter' | 'this-year' | 'last-month' | 'last-quarter' | 'all-time';

// TransactionProfitabilityCard Component
export function TransactionProfitabilityCard() {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profitabilityData, setProfitabilityData] = useState<TransactionProfitability[]>([]);
  const [topTransactions, setTopTransactions] = useState<TransactionProfitability[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this-month');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalRevenue: 0,
    totalCosts: 0,
    totalProfit: 0,
    averageMargin: 0
  });

  // Chart colors
  const profitColors = [
    "#10b981", // emerald-500 (high profit)
    "#22c55e", // green-500
    "#34d399", // emerald-400
    "#4ade80", // green-400
    "#6ee7b7", // emerald-300
    "#86efac", // green-300
    "#a7f3d0", // emerald-200
    "#bbf7d0", // green-200
    "#d1fae5", // emerald-100
    "#dcfce7", // green-100
  ];

  const negativeColors = ["#ef4444", "#f87171", "#fca5a5"]; // red-500, red-400, red-300

  // Period date ranges
  const getPeriodDateRange = (period: PeriodFilter): { from: Date, to: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from: Date, to: Date;

    switch (period) {
      case 'this-month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-month':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this-quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), currentQuarter * 3, 1);
        to = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case 'last-quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const yearOfLastQuarter = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const actualLastQuarter = lastQuarter < 0 ? 3 : lastQuarter;
        from = new Date(yearOfLastQuarter, actualLastQuarter * 3, 1);
        to = new Date(yearOfLastQuarter, (actualLastQuarter + 1) * 3, 0);
        break;
      case 'this-year':
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
      case 'all-time':
      default:
        // Use a very early date for "all time"
        from = new Date(2000, 0, 1);
        to = new Date(now.getFullYear() + 1, 11, 31);
    }

    return { from, to };
  };

  // Format period label
  const formatPeriodLabel = (period: PeriodFilter): string => {
    switch (period) {
      case 'this-month':
        return new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      case 'last-month':
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return lastMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      case 'this-quarter':
        const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
        return `Q${currentQuarter} ${new Date().getFullYear()}`;
      case 'last-quarter':
        let lastQuarter = Math.floor(new Date().getMonth() / 3);
        let year = new Date().getFullYear();
        if (lastQuarter === 0) {
          lastQuarter = 4;
          year -= 1;
        }
        return `Q${lastQuarter} ${year}`;
      case 'this-year':
        return new Date().getFullYear().toString();
      case 'all-time':
        return 'All Time';
      default:
        return 'Custom Period';
    }
  };

  // Fetch transaction data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Get date range based on selected period
        const { from, to } = getPeriodDateRange(periodFilter);
        
        // Fetch transactions
        const transactionsResponse = await fetchWithAuth("/api/transactions", { cache: "no-store" });
        if (!transactionsResponse.ok) throw new Error("Failed to fetch transactions");
        
        const transactionsData: Transaction[] = await transactionsResponse.json();
        
        // Filter transactions by date and active status
        const filteredTransactions = transactionsData.filter(tx => 
          !tx.isDeleted && 
          new Date(tx.date) >= from && 
          new Date(tx.date) <= to
        );
        
        setTransactions(filteredTransactions);
        
        // Process each transaction to get profitability
        const profitabilityPromises = filteredTransactions.map(async transaction => {
          // Fetch expenses for this transaction
          const expensesResponse = await fetchWithAuth(
            `/api/transactions/expenses?transactionId=${transaction.id}&includeArchived=false`
          );
          
          if (!expensesResponse.ok) return null;
          
          const expensesData = await expensesResponse.json();
          const expenses = expensesData.activeExpenses || [];
          
          // Calculate costs from expenses
          const costs = expenses.reduce((total: number, expense: Expense) => 
            total + (expense.amount || 0), 0);
          
          // Use project value if available, otherwise amount
          const revenue = transaction.projectValue || transaction.amount || 0;
          
          // Calculate profit and margin
          const profit = revenue - costs;
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
          
          return {
            id: transaction.id,
            name: transaction.name || "Unnamed Project",
            revenue,
            costs,
            profit,
            margin,
            date: transaction.date,
            formattedMargin: `${margin.toFixed(1)}%`
          };
        });
        
        // Resolve all promises
        const profitabilityResults = await Promise.all(profitabilityPromises);
        const validResults = profitabilityResults.filter(Boolean) as TransactionProfitability[];
        
        // Sort by profit descending and get top transactions
        const sortedByProfit = [...validResults].sort((a, b) => b.profit - a.profit);
        const top10 = sortedByProfit.slice(0, 10);
        
        // Calculate summary metrics
        const totalRevenue = validResults.reduce((sum, item) => sum + item.revenue, 0);
        const totalCosts = validResults.reduce((sum, item) => sum + item.costs, 0);
        const totalProfit = validResults.reduce((sum, item) => sum + item.profit, 0);
        const averageMargin = validResults.length > 0 
          ? validResults.reduce((sum, item) => sum + item.margin, 0) / validResults.length 
          : 0;
        
        setProfitabilityData(validResults);
        setTopTransactions(top10);
        setSummaryMetrics({
          totalRevenue,
          totalCosts,
          totalProfit,
          averageMargin
        });
      } catch (error) {
        console.error("Error fetching profitability data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [periodFilter]);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <Card className="p-3 shadow-lg border">
          <div className="font-semibold mb-1">{data.name}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Revenue:</span>
              <span className="font-medium">Rp{formatRupiah(data.revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Costs:</span>
              <span className="font-medium">Rp{formatRupiah(data.costs)}</span>
            </div>
            <div className="border-t pt-1 mt-1 flex justify-between">
              <span className="text-gray-600">Profit:</span>
              <span className={`font-medium ${data.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                Rp{formatRupiah(Math.abs(data.profit))}
                {data.profit < 0 && " (Loss)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Margin:</span>
              <span className={`font-medium ${data.margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {data.formattedMargin}
              </span>
            </div>
          </div>
        </Card>
      );
    }
    return null;
  };

  const formatName = (name: string) => {
    if (name.length > 20) {
      return name.substring(0, 18) + '...';
    }
    return name;
  };

  // Render function
  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <ReceiptCent className="h-6 w-6 text-primary/80" />
              Transaction Profitability
            </CardTitle>
            <CardDescription>
              Analisis margin keuntungan per transaksi untuk {formatPeriodLabel(periodFilter)}
            </CardDescription>
          </div>
          
          <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">Bulan Ini</SelectItem>
              <SelectItem value="last-month">Bulan Lalu</SelectItem>
              <SelectItem value="this-quarter">Kuartal Ini</SelectItem>
              <SelectItem value="last-quarter">Kuartal Lalu</SelectItem>
              <SelectItem value="this-year">Tahun Ini</SelectItem>
              <SelectItem value="all-time">Semua Waktu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Memuat data profitabilitas transaksi...</div>
          </div>
        ) : profitabilityData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center flex-col">
            <BarChartIcon className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-muted-foreground">Tidak ada data transaksi untuk periode ini</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tambahkan transaksi untuk melihat analisis profitabilitas
            </p>
          </div>
        ) : (
          <>
            {/* Summary metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">Rp{formatRupiah(summaryMetrics.totalRevenue)}</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-full">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Costs</p>
                      <p className="text-2xl font-bold">Rp{formatRupiah(summaryMetrics.totalCosts)}</p>
                    </div>
                    <div className="p-2 bg-red-100 rounded-full">
                      <BarChartIcon className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Profit</p>
                      <p className={`text-2xl font-bold ${summaryMetrics.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        Rp{formatRupiah(Math.abs(summaryMetrics.totalProfit))}
                        {summaryMetrics.totalProfit < 0 && " (Loss)"}
                      </p>
                    </div>
                    <div className={`p-2 ${summaryMetrics.totalProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'} rounded-full`}>
                      {summaryMetrics.totalProfit >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-rose-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Margin</p>
                      <p className={`text-2xl font-bold ${summaryMetrics.averageMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {summaryMetrics.averageMargin.toFixed(1)}%
                      </p>
                    </div>
                    <div className={`p-2 ${summaryMetrics.averageMargin >= 20 ? 'bg-emerald-100' : summaryMetrics.averageMargin >= 0 ? 'bg-amber-100' : 'bg-rose-100'} rounded-full`}>
                      <PieChart className="h-5 w-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Top 10 transactions by profitability */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Top {Math.min(10, topTransactions.length)} Transactions by Profitability</h3>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {profitabilityData.length} Total Transactions
                </Badge>
              </div>
              
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topTransactions}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => `Rp${formatRupiah(value)}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatName}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="profit" name="Profit" barSize={30}>
                      {topTransactions.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.profit >= 0 
                            ? profitColors[Math.min(9, Math.floor((entry.margin / 50) * 10))] 
                            : negativeColors[Math.min(2, Math.abs(Math.floor(entry.margin / 30)))]} 
                        />
                      ))}
                      <LabelList 
                        dataKey="formattedMargin" 
                        position="right" 
                        style={{ fontSize: '12px', fill: '#666' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="border-t bg-muted/30 p-4">
        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Data dari {formatPeriodLabel(periodFilter)}</span>
          </div>
          
          {!isLoading && profitabilityData.length > 0 && summaryMetrics.totalRevenue > 0 && (
            <div>
              Cost to Revenue Ratio: <span className="font-medium">{((summaryMetrics.totalCosts / summaryMetrics.totalRevenue) * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}