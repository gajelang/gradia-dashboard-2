"use client";

import { useCallback, useState } from "react";
import { fetchWithAuth } from "@/lib/api/api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

// Interface for fund balances
interface FundBalance {
  id: string;
  fundType: string;
  currentBalance: number;
  lastReconciledBalance?: number | null;
  lastReconciledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Interface for fund transactions
interface FundTransaction {
  id: string;
  fundType: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  description?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  referenceId?: string | null;
  createdById?: string | null;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  }
}

/**
 * Hook for managing fund balances and transactions
 */
export function useFunds() {
  const { user } = useAuth();
  const [fundBalances, setFundBalances] = useState<FundBalance[]>([]);
  const [fundTransactions, setFundTransactions] = useState<FundTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Fetch fund balances from the API
   */
  const fetchFundBalances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetchWithAuth('/api/fund-balance', {
        cache: 'no-store'
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch fund balances: ${res.status}`);
      }
      
      const data = await res.json();
      setFundBalances(data);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error(`Error loading fund balances: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Fetch fund transactions from the API
   * @param fundType Optional fund type to filter by
   * @param limit Optional limit of transactions to fetch
   */
  const fetchFundTransactions = useCallback(async (fundType?: string, limit?: number) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '/api/fund-transactions';
      const params = new URLSearchParams();
      
      if (fundType) {
        params.append('fundType', fundType);
      }
      
      if (limit) {
        params.append('limit', limit.toString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetchWithAuth(url, {
        cache: 'no-store'
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch fund transactions: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Handle different response formats
      let transactions = [];
      if (Array.isArray(data)) {
        transactions = data;
      } else if (data.transactions && Array.isArray(data.transactions)) {
        transactions = data.transactions;
      }
      
      setFundTransactions(transactions);
      return transactions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error(`Error loading fund transactions: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Add funds to a specific fund type
   * @param fundType Fund type (petty_cash or profit_bank)
   * @param amount Amount to add
   * @param description Optional description for the transaction
   */
  const addFunds = useCallback(async (
    fundType: string, 
    amount: number, 
    description?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      const res = await fetchWithAuth('/api/fund-transactions', {
        method: 'POST',
        body: JSON.stringify({
          fundType,
          amount,
          description: description || `Fund addition`,
          transactionType: 'income'
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Refresh fund balances
      await fetchFundBalances();
      
      toast.success('Funds added successfully');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error adding funds: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFundBalances]);
  
  /**
   * Transfer funds between fund types
   * @param fromFundType Source fund type
   * @param toFundType Destination fund type
   * @param amount Amount to transfer
   * @param description Optional description for the transaction
   */
  const transferFunds = useCallback(async (
    fromFundType: string,
    toFundType: string,
    amount: number,
    description?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      if (fromFundType === toFundType) {
        throw new Error('Source and destination funds cannot be the same');
      }
      
      const res = await fetchWithAuth('/api/fund-transfer', {
        method: 'POST',
        body: JSON.stringify({
          fromFundType,
          toFundType,
          amount,
          description: description || `Fund transfer`
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Refresh fund balances
      await fetchFundBalances();
      
      toast.success('Funds transferred successfully');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error transferring funds: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFundBalances]);
  
  /**
   * Reconcile a fund balance
   * @param fundType Fund type to reconcile
   * @param actualBalance Actual balance to set
   * @param description Optional description for the reconciliation
   */
  const reconcileFund = useCallback(async (
    fundType: string,
    actualBalance: number,
    description?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      if (actualBalance < 0) {
        throw new Error('Balance cannot be negative');
      }
      
      const res = await fetchWithAuth('/api/fund-balance', {
        method: 'POST',
        body: JSON.stringify({
          fundType,
          actualBalance,
          description: description || `Manual reconciliation`
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Refresh fund balances
      await fetchFundBalances();
      
      toast.success('Fund reconciled successfully');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error reconciling fund: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFundBalances]);
  
  /**
   * Get fund balance for a specific fund type
   * @param fundType Fund type to get balance for
   */
  const getFundBalance = useCallback((fundType: string): number => {
    const fund = fundBalances.find(f => f.fundType === fundType);
    return fund ? fund.currentBalance : 0;
  }, [fundBalances]);
  
  return {
    fundBalances,
    fundTransactions,
    loading,
    error,
    fetchFundBalances,
    fetchFundTransactions,
    addFunds,
    transferFunds,
    reconcileFund,
    getFundBalance
  };
}