"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface MonthlyData {
  name: string;
  total: number;
}

interface Transaction {
  date: string;
  amount: number;
}

export function Overview() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchOverviewData() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Add a timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch("/api/transactions", { 
          cache: "no-store",
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch transactions: ${res.status}`);
        }
        
        // Handle potential json parsing errors without an unused error parameter
        let transactions;
        try {
          transactions = await res.json();
        } catch {
          throw new Error("Failed to parse transaction data");
        }
        
        // Safety check for valid data
        if (!Array.isArray(transactions)) {
          throw new Error("Invalid transaction data format");
        }
        
        // Process the data safely
        const monthlyData: Record<string, MonthlyData> = {};
        
        transactions.forEach((transaction: Transaction) => {
          // Skip invalid entries
          if (!transaction || typeof transaction !== 'object') return;
          
          // Handle potential invalid date or amount
          let month;
          try {
            month = new Date(transaction.date).toLocaleString("default", { month: "short" });
          } catch {
            // Skip entries with invalid dates
            return;
          }
          
          const amount = Number(transaction.amount) || 0;
          
          if (!monthlyData[month]) {
            monthlyData[month] = { name: month, total: 0 };
          }
          monthlyData[month].total += amount;
        });
        
        // Sort months chronologically
        const sortedData = Object.values(monthlyData).sort((a, b) => {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return months.indexOf(a.name) - months.indexOf(b.name);
        });
        
        if (isMounted) {
          setData(sortedData);
        }
      } catch (error) {
        if (isMounted) {
          setError(error instanceof Error ? error.message : "An unknown error occurred");
          // Fallback to sample data if needed
          setData([
            { name: "Jan", total: 0 },
            { name: "Feb", total: 0 },
            { name: "Mar", total: 0 },
          ]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchOverviewData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Currency formatter for tooltip and axis
  const formatCurrency = (value: number) => {
    return `Rp${new Intl.NumberFormat('id-ID').format(value)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[350px] bg-slate-50 rounded-md">
        <div className="animate-pulse text-gray-400">Loading chart data...</div>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] bg-slate-50 rounded-md">
        <div className="text-red-500">Failed to load chart: {error}</div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={formatCurrency} 
        />
        <Tooltip 
          formatter={(value: number) => [formatCurrency(value), "Total"]} 
          labelFormatter={(label) => `Month: ${label}`} 
        />
        <Bar dataKey="total" fill="#4ade80" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}