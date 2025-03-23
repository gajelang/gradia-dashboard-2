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
import FinancialAnalysis from "@/components/FinanceAnalysis" // Import the FinancialAnalysis component
import { useAuth } from "@/contexts/AuthContext"
import { fetchWithAuth } from "@/lib/api"
import { toast } from "react-hot-toast"
import { DateRange as RDPDateRange } from "react-day-picker"

// Load Inter font
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

// Definisi ulang untuk DateRange yang kompatibel dengan kedua komponen
interface DateRange {
  from: Date;
  to: Date;
}

// Updated Transaction type to match the new interface
interface Transaction {
  id: string;
  name: string;
  description: string;
  amount: number;
  paymentStatus: string; // Updated from status
  date: string;
  email?: string; // Now optional
  phone?: string; // New field
  startDate?: string; // New field
  endDate?: string; // New field
  clientId?: string; // New field for client relationship
  vendorId?: string; // New field for vendor relationship
  picId?: string; // New field for PIC relationship
}

export default function Dashboard() {
  const { isAuthenticated, user } = useAuth();
  // Using RDPDateRange (react-day-picker DateRange) but will convert to our DateRange when passing to components
  const [selectedDateRange, setSelectedDateRange] = useState<RDPDateRange | undefined>(undefined);
  
  // Explicitly type the transactions state as Transaction[]
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch transactions for RecentTransactions
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
      const data = await res.json();
      
      // Map old transactions to new format if necessary
      const mappedData = data.map((tx: any) => ({
        ...tx,
        paymentStatus: tx.paymentStatus || tx.status || "Belum Bayar", // Handle old format
      }));
      
      setTransactions(mappedData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // This wrapper function handles DateRange | undefined correctly
  const handleDateRangeChange = (dateRange: RDPDateRange | undefined) => {
    setSelectedDateRange(dateRange);
  };

  // Convert RDPDateRange to DateRange for IncomeExpensesChart
  const getChartDateRange = (): DateRange | undefined => {
    if (selectedDateRange?.from && selectedDateRange?.to) {
      return {
        from: selectedDateRange.from,
        to: selectedDateRange.to
      };
    }
    return undefined;
  };

  // Explicitly type the transaction parameter
  function handleTransactionAdded(transaction: Transaction): void {
    setTransactions((prev) => [transaction, ...prev]);
  }

  const handleDownloadReport = () => {
    toast.info("Report download feature will be implemented soon");
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
            {/* Add Invoice Creator component */}
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
            {/* Pass the wrapped handler function to InsightCards */}
            <InsightCards onDateRangeChange={handleDateRangeChange} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <div className="col-span-4">
                <h3 className="text-lg font-semibold mb-2">Income vs Expenses</h3>
                {/* Pass converted DateRange to IncomeExpensesChart */}
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
            
            {/* Add Project Calendar component */}
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
          {/* Add the Financial Analysis Tab */}
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