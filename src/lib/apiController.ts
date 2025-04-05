// src/lib/apiController.ts
import { fetchWithAuth } from '@/lib/api';
import { formatRupiah } from '@/lib/formatters';

// Interface for time range filter
export interface TimeRange {
  type: 'this_month' | 'this_year' | 'all_time' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

// Interface for profit data
export interface ProfitData {
  currentAmount: number;
  previousAmount: number;
  percentageChange: number;
  profitMargin: number;
  isAboveTarget: boolean;
  targetProfit: number;
  month: string;
  year: number;
  timeRange?: TimeRange;
}

// Comprehensive financial data interface
export interface FinancialData {
  revenue: {
    currentAmount: number;
    previousAmount: number;
    percentageChange: number;
    month: string;
    year: number;
  };
  expenses: {
    currentAmount: number;
    previousAmount: number;
    percentageChange: number;
    operationalAmount: number;
    projectAmount: number;
    month: string;
    year: number;
  };
  profit: ProfitData;
  operationalVsProject: {
    operational: number;
    project: number;
    total: number;
  };
  funds: {
    pettyCash: number;
    profitBank: number;
    total: number;
  };
  counts: {
    transactions: number;
    expenses: number;
  };
  timeRange: TimeRange;
}

// Helper function to get date range from TimeRange
export function getDateRangeFromTimeRange(timeRange: TimeRange): { startDate: Date, endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // End of today
  
  switch (timeRange.type) {
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of current month
      break;
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // December 31st of current year
      break;
    case 'custom':
      if (timeRange.startDate && timeRange.endDate) {
        startDate = new Date(timeRange.startDate);
        endDate = new Date(timeRange.endDate);
        endDate.setHours(23, 59, 59, 999); // End of the selected end date
      } else {
        // Default to all time if custom dates are missing
        startDate = new Date(2000, 0, 1); // Far in the past
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // End of today
      }
      break;
    case 'all_time':
    default:
      startDate = new Date(2000, 0, 1); // Far in the past
      break;
  }
  
  return { startDate, endDate };
}

// Helper for finding previous period
export function getPreviousPeriod(timeRange: TimeRange): { startDate: Date, endDate: Date } {
  const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);
  const duration = endDate.getTime() - startDate.getTime();
  
  const previousEndDate = new Date(startDate.getTime() - 1); // 1 ms before current start date
  const previousStartDate = new Date(previousEndDate.getTime() - duration);
  
  return { startDate: previousStartDate, endDate: previousEndDate };
}

// Format time period label for display
export function formatTimePeriodLabel(timeRange: TimeRange): string {
  if (timeRange.type === 'this_month') {
    return new Date().toLocaleString('id', { month: 'long', year: 'numeric' });
  } else if (timeRange.type === 'this_year') {
    return new Date().getFullYear().toString();
  } else if (timeRange.type === 'custom' && timeRange.startDate && timeRange.endDate) {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('id', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    return `${formatDate(timeRange.startDate)} - ${formatDate(timeRange.endDate)}`;
  } else {
    return 'Semua Waktu';
  }
}

// Fetch comprehensive financial data for dashboard
export async function fetchComprehensiveFinancialData(timeRange: TimeRange = { type: 'all_time' }): Promise<FinancialData> {
  try {
    // Get fund balances - this will include calculated balances
    const fundBalancesRes = await fetchWithAuth('/api/fund-balance', {
      cache: 'no-store'
    });
    
    if (!fundBalancesRes.ok) {
      throw new Error('Failed to fetch fund balances');
    }
    
    const fundBalances = await fundBalancesRes.json();
    
    // Get all transactions
    const transactionsRes = await fetchWithAuth('/api/transactions', {
      cache: 'no-store'
    });
    
    if (!transactionsRes.ok) {
      throw new Error('Failed to fetch transactions');
    }
    
    const allTransactions = await transactionsRes.json();
    
    // Get all expenses
    const expensesRes = await fetchWithAuth('/api/expenses', {
      cache: 'no-store'
    });
    
    if (!expensesRes.ok) {
      throw new Error('Failed to fetch expenses');
    }
    
    const allExpenses = await expensesRes.json();
    
    // Calculate date ranges for current and previous periods
    const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);
    const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousPeriod(timeRange);
    
    // Format date for display
    const displayDateRange = formatTimePeriodLabel(timeRange);
    
    // Filter transactions and expenses based on date range
    const currentPeriodTransactions = allTransactions.filter((tx: any) => {
      if (tx.isDeleted) return false;
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= endDate;
    });
    
    const previousPeriodTransactions = allTransactions.filter((tx: any) => {
      if (tx.isDeleted) return false;
      const txDate = new Date(tx.date);
      return txDate >= prevStartDate && txDate <= prevEndDate;
    });
    
    const currentPeriodExpenses = allExpenses.filter((exp: any) => {
      if (exp.isDeleted) return false;
      const expDate = new Date(exp.date);
      return expDate >= startDate && expDate <= endDate;
    });
    
    const previousPeriodExpenses = allExpenses.filter((exp: any) => {
      if (exp.isDeleted) return false;
      const expDate = new Date(exp.date);
      return expDate >= prevStartDate && expDate <= prevEndDate;
    });
    
    // Calculate revenue metrics
    const currentPeriodRevenue = currentPeriodTransactions.reduce((sum: number, tx: any) => {
      if (tx.paymentStatus === "Lunas") {
        return sum + (tx.projectValue || 0);
      } else if (tx.paymentStatus === "DP") {
        return sum + (tx.downPaymentAmount || 0);
      }
      return sum;
    }, 0);
    
    const previousPeriodRevenue = previousPeriodTransactions.reduce((sum: number, tx: any) => {
      if (tx.paymentStatus === "Lunas") {
        return sum + (tx.projectValue || 0);
      } else if (tx.paymentStatus === "DP") {
        return sum + (tx.downPaymentAmount || 0);
      }
      return sum;
    }, 0);
    
    // Calculate expense metrics
    const currentPeriodExpensesTotal = currentPeriodExpenses.reduce((sum: number, exp: any) => {
      return sum + (exp.amount || 0);
    }, 0);
    
    const previousPeriodExpensesTotal = previousPeriodExpenses.reduce((sum: number, exp: any) => {
      return sum + (exp.amount || 0);
    }, 0);
    
    // Calculate operational vs project expenses
    const operationalExpenses = currentPeriodExpenses.reduce((sum: number, exp: any) => {
      if (!exp.transactionId && ['Operasional', 'Gaji', 'Inventaris'].includes(exp.category)) {
        return sum + (exp.amount || 0);
      }
      return sum;
    }, 0);
    
    const projectExpenses = currentPeriodExpenses.reduce((sum: number, exp: any) => {
      if (exp.transactionId || ['Biaya Produksi', 'Lembur'].includes(exp.category)) {
        return sum + (exp.amount || 0);
      }
      return sum;
    }, 0);
    
    // Calculate percentage changes
    const revenuePercentageChange = previousPeriodRevenue === 0 
      ? (currentPeriodRevenue > 0 ? 100 : 0) 
      : ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;
    
    const expensePercentageChange = previousPeriodExpensesTotal === 0 
      ? (currentPeriodExpensesTotal > 0 ? 100 : 0) 
      : ((currentPeriodExpensesTotal - previousPeriodExpensesTotal) / previousPeriodExpensesTotal) * 100;
    
    // Calculate profit metrics
    const currentPeriodProfit = currentPeriodRevenue - currentPeriodExpensesTotal;
    const previousPeriodProfit = previousPeriodRevenue - previousPeriodExpensesTotal;
    
    const profitPercentageChange = previousPeriodProfit === 0 
      ? (currentPeriodProfit > 0 ? 100 : currentPeriodProfit < 0 ? -100 : 0) 
      : ((currentPeriodProfit - previousPeriodProfit) / Math.abs(previousPeriodProfit)) * 100;
    
    const profitMargin = currentPeriodRevenue === 0 
      ? 0 
      : (currentPeriodProfit / currentPeriodRevenue) * 100;
    
    // Set a target profit margin (this could be dynamic in a real app)
    const targetProfitMargin = 20; // 20% target profit margin
    const targetProfit = currentPeriodRevenue * (targetProfitMargin / 100);
    const isAboveTarget = currentPeriodProfit >= targetProfit;
    
    // Extract fund balances
    const pettyCashFund = fundBalances.find((f: any) => f.fundType === 'petty_cash');
    const profitBankFund = fundBalances.find((f: any) => f.fundType === 'profit_bank');
    
    // Use calculated balances if available, otherwise fall back to current balances
    const pettyCashBalance = pettyCashFund ? (pettyCashFund.calculatedBalance !== undefined ? pettyCashFund.calculatedBalance : pettyCashFund.currentBalance) : 0;
    const profitBankBalance = profitBankFund ? (profitBankFund.calculatedBalance !== undefined ? profitBankFund.calculatedBalance : profitBankFund.currentBalance) : 0;
    
    // Build the complete financial data object
    return {
      // Revenue metrics
      revenue: {
        currentAmount: currentPeriodRevenue,
        previousAmount: previousPeriodRevenue,
        percentageChange: revenuePercentageChange,
        month: displayDateRange.split(' ')[0] || 'All Time',
        year: new Date().getFullYear()
      },
      // Expense metrics
      expenses: {
        currentAmount: currentPeriodExpensesTotal,
        previousAmount: previousPeriodExpensesTotal,
        percentageChange: expensePercentageChange,
        operationalAmount: operationalExpenses,
        projectAmount: projectExpenses,
        month: displayDateRange.split(' ')[0] || 'All Time',
        year: new Date().getFullYear()
      },
      // Profit metrics
      profit: {
        currentAmount: currentPeriodProfit,
        previousAmount: previousPeriodProfit,
        percentageChange: profitPercentageChange,
        profitMargin: profitMargin,
        isAboveTarget: isAboveTarget,
        targetProfit: targetProfit,
        month: displayDateRange.split(' ')[0] || 'All Time',
        year: new Date().getFullYear()
      },
      // Operational vs Project expense breakdown
      operationalVsProject: {
        operational: operationalExpenses,
        project: projectExpenses,
        total: currentPeriodExpensesTotal
      },
      // Fund balances
      funds: {
        pettyCash: pettyCashBalance,
        profitBank: profitBankBalance,
        total: pettyCashBalance + profitBankBalance
      },
      // Include transaction and expense counts for reference
      counts: {
        transactions: currentPeriodTransactions.length,
        expenses: currentPeriodExpenses.length
      },
      // Include the time range for reference
      timeRange
    };
  } catch (error) {
    console.error('Error fetching comprehensive financial data:', error);
    throw error;
  }
}

// Export function for the profit card to use directly
export async function fetchProfitData(timeRange: TimeRange = { type: 'all_time' }): Promise<ProfitData> {
  try {
    const data = await fetchComprehensiveFinancialData(timeRange);
    return {
      ...data.profit,
      timeRange
    };
  } catch (error) {
    console.error('Error fetching profit data:', error);
    throw error;
  }
}

// Fetch transactions with time range filter
export async function fetchTransactionsWithFilter(timeRange: TimeRange = { type: 'all_time' }) {
  try {
    // Get all transactions first
    const res = await fetchWithAuth('/api/transactions', { cache: 'no-store' });
    
    if (!res.ok) {
      throw new Error('Failed to fetch transactions');
    }
    
    const allTransactions = await res.json();
    
    // Filter transactions based on date range
    const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);
    
    const filteredTransactions = allTransactions.filter((tx: any) => {
      if (tx.isDeleted) return false;
      
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= endDate;
    });
    
    return filteredTransactions;
  } catch (error) {
    console.error('Error fetching transactions with filter:', error);
    throw error;
  }
}

// Fetch expenses with time range filter
export async function fetchExpensesWithFilter(timeRange: TimeRange = { type: 'all_time' }) {
  try {
    // Get all expenses
    const res = await fetchWithAuth('/api/expenses', { cache: 'no-store' });
    
    if (!res.ok) {
      throw new Error('Failed to fetch expenses');
    }
    
    const allExpenses = await res.json();
    
    // Filter expenses based on date range
    const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);
    
    const filteredExpenses = allExpenses.filter((expense: any) => {
      if (expense.isDeleted) return false;
      
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
    
    return filteredExpenses;
  } catch (error) {
    console.error('Error fetching expenses with filter:', error);
    throw error;
  }
}