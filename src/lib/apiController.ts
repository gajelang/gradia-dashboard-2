// src/lib/apiController.ts

import { fetchWithAuth } from "@/lib/api";

export interface ProfitData {
  currentAmount: number;
  previousAmount: number;
  percentageChange: number;
  profitMargin: number;
  isAboveTarget: boolean;
  targetProfit: number;
  month: string;
  year: number;
}

export interface RevenueData {
  currentAmount: number;
  previousAmount: number;
  percentageChange: number;
  month: string;
  year: number;
}

export interface ExpenseData {
  currentAmount: number;
  previousAmount: number;
  percentageChange: number;
  operationalAmount: number;
  projectAmount: number;
  month: string;
  year: number;
}

export interface FundBalance {
  fundType: string;
  currentBalance: number;
  calculatedBalance?: number;
  lastReconciledBalance?: number | null;
  lastReconciledAt?: string | null;
}

// This is the original function needed by the NetProfitCard component
export const fetchProfitData = async (): Promise<ProfitData> => {
  try {
    // First, try to fetch revenue data
    const revenueResponse = await fetchWithAuth("/api/analytics/revenue", {
      cache: "no-store",
    });
    
    if (!revenueResponse.ok) {
      throw new Error("Failed to fetch revenue data");
    }
    
    const revenueData = await revenueResponse.json();
    
    // Then fetch expense data
    const expenseResponse = await fetchWithAuth("/api/analytics/expenses", {
      cache: "no-store",
    });
    
    if (!expenseResponse.ok) {
      throw new Error("Failed to fetch expense data");
    }
    
    const expenseData = await expenseResponse.json();
    
    // Calculate net profit
    const currentRevenue = revenueData.currentAmount || 0;
    const currentExpenses = expenseData.currentAmount || 0;
    const netProfit = currentRevenue - currentExpenses;
    
    // Calculate previous profit
    const previousRevenue = revenueData.previousAmount || 0;
    const previousExpenses = expenseData.previousAmount || 0;
    const previousProfit = previousRevenue - previousExpenses;
    
    // Calculate percentage change in profit
    const percentageChange = previousProfit !== 0 
      ? ((netProfit - previousProfit) / Math.abs(previousProfit)) * 100 
      : netProfit !== 0 ? 100 : 0;
    
    // Calculate profit margin
    const profitMargin = currentRevenue > 0 ? (netProfit / currentRevenue) * 100 : 0;
    
    // Target profit (could be fetched from settings in a real app)
    const targetProfit = 5000000; // 5 million
    
    return {
      currentAmount: netProfit,
      previousAmount: previousProfit,
      percentageChange: percentageChange,
      profitMargin: profitMargin,
      isAboveTarget: netProfit > targetProfit,
      targetProfit: targetProfit,
      month: revenueData.month || new Date().toLocaleString('default', { month: 'long' }),
      year: revenueData.year || new Date().getFullYear()
    };
  } catch (error) {
    console.error("Error calculating profit data:", error);
    
    // Return default data in case of error
    return {
      currentAmount: 0,
      previousAmount: 0,
      percentageChange: 0,
      profitMargin: 0,
      isAboveTarget: false,
      targetProfit: 5000000,
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear()
    };
  }
};

// This is the comprehensive function for improved financial cards
export const fetchComprehensiveFinancialData = async () => {
  try {
    // Fetch revenue data
    const revenueResponse = await fetchWithAuth("/api/analytics/revenue", {
      cache: "no-store",
    });
    
    if (!revenueResponse.ok) {
      throw new Error("Failed to fetch revenue data");
    }
    
    const revenueData = await revenueResponse.json();
    
    // Fetch expense data
    const expenseResponse = await fetchWithAuth("/api/analytics/expenses", {
      cache: "no-store",
    });
    
    if (!expenseResponse.ok) {
      throw new Error("Failed to fetch expense data");
    }
    
    const expenseData = await expenseResponse.json();
    
    // Fetch fund balances
    const fundResponse = await fetchWithAuth("/api/fund-balance", {
      cache: "no-store",
    });
    
    if (!fundResponse.ok) {
      throw new Error("Failed to fetch fund balances");
    }
    
    const fundBalances = await fundResponse.json();
    
    // Fetch transactions to analyze operational vs project expenses
    const transactionsResponse = await fetchWithAuth("/api/transactions", {
      cache: "no-store",
    });
    
    if (!transactionsResponse.ok) {
      throw new Error("Failed to fetch transactions");
    }
    
    const transactions = await transactionsResponse.json();
    
    // Fetch expenses to get detailed expense breakdown
    const detailedExpensesResponse = await fetchWithAuth("/api/expenses", {
      cache: "no-store",
    });
    
    if (!detailedExpensesResponse.ok) {
      throw new Error("Failed to fetch detailed expenses");
    }
    
    const detailedExpenses = await detailedExpensesResponse.json();
    
    // Calculate project vs operational expenses
    const activeExpenses = detailedExpenses.filter((exp: any) => !exp.isDeleted);
    
    const projectExpenses = activeExpenses
      .filter((exp: any) => exp.transactionId)
      .reduce((sum: number, exp: any) => sum + exp.amount, 0);
      
    const operationalExpenses = activeExpenses
      .filter((exp: any) => !exp.transactionId)
      .reduce((sum: number, exp: any) => sum + exp.amount, 0);
    
    const totalExpenses = projectExpenses + operationalExpenses;
    
    // Calculate net profit
    const revenue = revenueData.currentAmount || 0;
    
    const netProfit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const targetProfit = 5000000; // You can set this dynamically from settings
    
    // Get fund balances
    const getPettyBalance = (funds: any[]) => {
      const fund = funds.find((f: any) => f.fundType === "petty_cash");
      return fund ? (fund.calculatedBalance !== undefined ? fund.calculatedBalance : fund.currentBalance) : 0;
    };
    
    const getProfitBankBalance = (funds: any[]) => {
      const fund = funds.find((f: any) => f.fundType === "profit_bank");
      return fund ? (fund.calculatedBalance !== undefined ? fund.calculatedBalance : fund.currentBalance) : 0;
    };
    
    const pettyCashBalance = getPettyBalance(fundBalances);
    const profitBankBalance = getProfitBankBalance(fundBalances);
    const totalFundBalance = pettyCashBalance + profitBankBalance;
    
    // Return comprehensive data
    return {
      revenue: {
        currentAmount: revenue,
        previousAmount: revenueData.previousAmount || 0,
        percentageChange: revenueData.percentageChange || 0,
        month: revenueData.month || new Date().toLocaleString('default', { month: 'long' }),
        year: revenueData.year || new Date().getFullYear()
      },
      
      expenses: {
        currentAmount: totalExpenses,
        previousAmount: expenseData.previousAmount || 0,
        percentageChange: expenseData.percentageChange || 0,
        operationalAmount: operationalExpenses,
        projectAmount: projectExpenses,
        month: expenseData.month || new Date().toLocaleString('default', { month: 'long' }),
        year: expenseData.year || new Date().getFullYear()
      },
      
      profit: {
        currentAmount: netProfit,
        previousAmount: revenueData.previousAmount - (expenseData.previousAmount || 0),
        percentageChange: revenueData.currentAmount > 0 && revenueData.previousAmount > 0 
          ? ((netProfit / revenueData.currentAmount) - ((revenueData.previousAmount - (expenseData.previousAmount || 0)) / revenueData.previousAmount)) * 100
          : 0,
        profitMargin: profitMargin,
        isAboveTarget: netProfit > targetProfit,
        targetProfit: targetProfit,
        month: revenueData.month || new Date().toLocaleString('default', { month: 'long' }),
        year: revenueData.year || new Date().getFullYear()
      },
      
      funds: {
        pettyCash: pettyCashBalance,
        profitBank: profitBankBalance,
        total: totalFundBalance
      },
      
      operationalVsProject: {
        operational: operationalExpenses,
        project: projectExpenses,
        total: totalExpenses
      }
    };
  } catch (error) {
    console.error("Error fetching comprehensive financial data:", error);
    throw error;
  }
};