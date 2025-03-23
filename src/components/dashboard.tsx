"use client"

import { useState, useEffect } from "react"
import { Inter } from "next/font/google"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AddTransactionModal from "@/components/AddTransactionModal"
import InsightCards from "@/components/InsightCards"
import { IncomeExpensesChart } from "@/components/charts/income-expenses-chart"
import RecentTransactions from "@/components/recent-transactions"
import TransactionTable from "@/components/TransactionTable"
import ExpensesTable from "@/components/ExpensesTable"
import ResourcesTab from "@/components/ResourceTab"
import InvoiceCreator from "@/components/InvoiceCreator"
import ProjectCalendar from "@/components/ProjectCalendar"
import DashboardHeader from "@/components/dashboard-header"
import FinancialAnalysis from "@/components/FinanceAnalysis"
import { useAuth } from "@/contexts/AuthContext"
import { fetchWithAuth } from "@/lib/api"
import { toast } from "react-hot-toast"
import { DateRange as RDPDateRange } from "react-day-picker"
import { Transaction, TransactionData, convertToTransaction } from "@/app/types/transaction"

// Load Inter font
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

// Define a DateRange for chart components
interface DateRange {
  from: Date;
  to: Date;
}

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [selectedDateRange, setSelectedDateRange] = useState<RDPDateRange | undefined>(undefined);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch transactions when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions();
    }
  }, [isAuthenticated]);

  async function fetchTransactions() {
    try {
      setIsLoading(true);
      const res = await fetchWithAuth("/api/transactions", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch transactions");

      // Type the response as an array of TransactionData
      const data: TransactionData[] = await res.json();
      
      // Map raw data to the Transaction format using the helper function
      const mappedData = data.map((tx: TransactionData) => convertToTransaction(tx));
      
      setTransactions(mappedData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // This function handles a new transaction added by the modal.
  function handleTransactionAdded(transaction: TransactionData): void {
    const newTransaction = convertToTransaction(transaction);
    setTransactions((prev) => [newTransaction, ...prev]);
  }

  // Handle date range changes for the chart
  const handleDateRangeChange = (dateRange: RDPDateRange | undefined) => {
    setSelectedDateRange(dateRange);
  };

  // Convert RDPDateRange to a DateRange type for the chart
  const getChartDateRange = (): DateRange | undefined => {
    if (selectedDateRange?.from && selectedDateRange?.to) {
      return {
        from: selectedDateRange.from,
        to: selectedDateRange.to
      };
    }
    return undefined;
  };

  const handleDownloadReport = () => {
    toast.success("Report download feature will be implemented soon");
  }

  return (
    <div className={`flex min-h-screen flex-col ${inter.className}`}>
      <DashboardHeader />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <p className="text-4xl font-bold tracking-tight">Financial Dashboard</p>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleDownloadReport}>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
            <AddTransactionModal onTransactionAdded={handleTransactionAdded} />
            <InvoiceCreator />
          </div>
        </div>
        <hr />
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="analysis">Financial Analysis</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <InsightCards onDateRangeChange={handleDateRangeChange} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <div className="col-span-4">
                <h3 className="text-lg font-semibold mb-2">Income vs Expenses</h3>
                <IncomeExpensesChart selectedRange={getChartDateRange()} />
              </div>
              <div className="col-span-3">
                <h3 className="text-lg font-semibold mb-2">Recent Transactions</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center h-56 bg-gray-50 rounded-md">
                    <div className="text-gray-500">Loading transactions...</div>
                  </div>
                ) : (
                  <RecentTransactions transactions={transactions} />
                )}
              </div>
            </div>
            <div className="mt-6">
              <ProjectCalendar />
            </div>
          </TabsContent>
          <TabsContent value="projects" className="space-y-4">
            <TransactionTable />
          </TabsContent>
          <TabsContent value="expenses" className="space-y-4">
            <ExpensesTable />
          </TabsContent>
          <TabsContent value="analysis" className="space-y-4">
            <FinancialAnalysis />
          </TabsContent>
          <TabsContent value="resources" className="space-y-4">
            <ResourcesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
