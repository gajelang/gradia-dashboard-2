"use client";

import { useCallback, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook for managing transactions data and operations
 */
export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [deletedTransactions, setDeletedTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch transactions from the API
   * @param includeDeleted Whether to include deleted transactions
   */
  const fetchTransactions = useCallback(async (includeDeleted = false) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchWithAuth(
        includeDeleted ? '/api/transactions?deleted=true' : '/api/transactions',
        { cache: 'no-store' }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch transactions: ${res.status}`);
      }

      const data = await res.json();

      if (includeDeleted) {
        // Filter by deleted status
        const active = data.filter((tx: any) => !tx.isDeleted);
        const deleted = data.filter((tx: any) => tx.isDeleted);

        setTransactions(active);
        setDeletedTransactions(deleted);
      } else {
        // Just set active transactions
        setTransactions(data);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error loading transactions: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete (archive) a transaction
   * @param transactionId ID of the transaction to delete
   */
  const deleteTransaction = useCallback(async (transactionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchWithAuth('/api/transactions/softDelete', {
        method: 'POST',
        body: JSON.stringify({
          id: transactionId,
          deletedBy: user?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Server error: ${res.status}`);
      }

      const data = await res.json();

      // Update local state
      setTransactions(prev => prev.filter(tx => tx.id !== transactionId));

      toast.success(data.message || 'Transaction archived successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error archiving transaction: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Restore a deleted transaction
   * @param transactionId ID of the transaction to restore
   */
  const restoreTransaction = useCallback(async (transactionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchWithAuth('/api/transactions/restore', {
        method: 'POST',
        body: JSON.stringify({
          id: transactionId,
          restoredBy: user?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Server error: ${res.status}`);
      }

      const data = await res.json();

      // Update local state
      setDeletedTransactions(prev => prev.filter(tx => tx.id !== transactionId));

      // Refresh transactions to get the newly restored one
      await fetchTransactions();

      toast.success(data.message || 'Transaction restored successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error restoring transaction: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchTransactions]);

  /**
   * Update a transaction
   * @param transactionData Transaction data to update
   */
  const updateTransaction = useCallback(async (transactionData: any) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchWithAuth('/api/transactions/update', {
        method: 'PATCH',
        body: JSON.stringify({
          ...transactionData,
          updatedById: user?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Server error: ${res.status}`);
      }

      const data = await res.json();

      // Update local state
      setTransactions(prev =>
        prev.map(tx => tx.id === data.transaction.id ? data.transaction : tx)
      );

      toast.success(data.message || 'Transaction updated successfully');
      return data.transaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error updating transaction: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Create a new transaction
   * @param transactionData Transaction data to create
   */
  const createTransaction = useCallback(async (transactionData: any) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchWithAuth('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...transactionData,
          createdById: user?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Server error: ${res.status}`);
      }

      const data = await res.json();

      // Update local state
      setTransactions(prev => [data.transaction, ...prev]);

      toast.success('Transaction created successfully');
      return data.transaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error creating transaction: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Get a single transaction by ID
   * @param id Transaction ID
   */
  const getTransaction = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchWithAuth(`/api/transactions/${id}`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch transaction: ${res.status}`);
      }

      const data = await res.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error loading transaction: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    transactions,
    deletedTransactions,
    loading,
    error,
    fetchTransactions,
    deleteTransaction,
    restoreTransaction,
    updateTransaction,
    createTransaction,
    getTransaction
  };
}