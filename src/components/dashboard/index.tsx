"use client"

import { useState, useEffect } from "react"
import { Inter } from "next/font/google"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AddTransactionModal from "@/components/AddTransactionModal"
import TransactionTable from "@/components/transactions/TransactionTable"
import ExpensesTable from "@/components/finance/ExpensesTable"
import ImprovedResourceTab from "@/components/resources/ImprovedResourceTab"
import InvoiceCreator from "@/components/invoices/InvoiceCreator"
import InvoiceList from "@/components/invoices/InvoiceList"
import DashboardHeader from "@/components/layout/dashboard-header"
import FinancialAnalysis from "@/components/finance/FinanceAnalysis"
import CompanyFinance from "@/components/finance/CompanyFinance"
import { TransactionProfitabilityCard } from "@/components/TransactionProfitabilityCard"
import Overview from "@/components/dashboard/Overview" // Import Overview component
import { useAuth } from "@/contexts/AuthContext"
import { fetchWithAuth } from "@/lib/api/api"
import { toast } from "react-hot-toast"
import { Transaction, TransactionData, convertToTransaction } from "@/app/types/transaction"

// Load Inter font
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
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
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="analysis">Project Financial</TabsTrigger>
            <TabsTrigger value="company-finance">Company Finance</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <Overview />
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <TransactionTable />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <ExpensesTable />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <InvoiceList />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <FinancialAnalysis />
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
              <TransactionProfitabilityCard />
            </div>
          </TabsContent>

          <TabsContent value="company-finance" className="space-y-4">
            <CompanyFinance />
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <ImprovedResourceTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
