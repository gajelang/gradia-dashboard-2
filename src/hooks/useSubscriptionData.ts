// src/hooks/useSubscriptionData.ts
import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { toast } from 'react-hot-toast';

export interface Vendor {
  id: string;
  name: string;
  serviceDesc: string;
}

export interface Subscription {
  id: string;
  name: string;
  description?: string;
  status: string;
  purchaseDate: string;
  expiryDate?: string | null;
  cost: number;
  paymentStatus: string;
  isRecurring: boolean;
  recurringType?: string;
  nextBillingDate?: string | null;
  reminderDays?: number;
  vendor?: Vendor | null;
  createdAt: string;
  updatedAt: string;
}

interface UseSubscriptionDataProps {
  initialSortColumn?: keyof Subscription | null;
  initialSortDirection?: 'asc' | 'desc';
}

export function useSubscriptionData({
  initialSortColumn = null,
  initialSortDirection = 'asc',
}: UseSubscriptionDataProps = {}) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [dueSoon, setDueSoon] = useState<Subscription[]>([]);
  const [others, setOthers] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Subscription | null>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);

  // Check if a subscription is due soon (within 30 days)
  const isDueSoon = useCallback((nextBillingDate?: string | null): boolean => {
    if (!nextBillingDate) return false;

    const today = new Date();
    const billingDate = new Date(nextBillingDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return billingDate >= today && billingDate <= thirtyDaysFromNow;
  }, []);

  // Sort subscriptions based on column and direction
  const sortSubscriptions = useCallback((items: Subscription[]): Subscription[] => {
    if (!sortColumn) return [...items];

    return [...items].sort((a, b) => {
      let valueA = a[sortColumn];
      let valueB = b[sortColumn];

      // Handle special cases for date columns
      if (sortColumn === 'nextBillingDate' || sortColumn === 'purchaseDate' || sortColumn === 'createdAt' || sortColumn === 'updatedAt') {
        valueA = valueA && typeof valueA === 'string' ? new Date(valueA).getTime() : 0;
        valueB = valueB && typeof valueB === 'string' ? new Date(valueB).getTime() : 0;
      }

      // Handle string comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      // Handle number comparison
      if (valueA === valueB) return 0;

      // Ensure values are not null or undefined
      const safeValueA = valueA ?? 0;
      const safeValueB = valueB ?? 0;

      if (sortDirection === 'asc') {
        return safeValueA > safeValueB ? 1 : -1;
      } else {
        return safeValueA < safeValueB ? 1 : -1;
      }
    });
  }, [sortColumn, sortDirection]);

  // Toggle sort column and direction
  const toggleSort = useCallback((column: keyof Subscription) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  // Fetch subscriptions from API
  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use authenticated fetch
      const response = await fetchWithAuth('/api/subscriptions');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subscriptions');
      }

      const data: Subscription[] = await response.json();
      setSubscriptions(data);

      // Group subscriptions
      const due = data.filter(sub => isDueSoon(sub.nextBillingDate));
      const notDue = data.filter(sub => !isDueSoon(sub.nextBillingDate));
      setDueSoon(due);
      setOthers(notDue);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'An unexpected error occurred';

      setError(err instanceof Error ? err : new Error(errorMessage));
      toast.error('Unable to fetch subscriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isDueSoon]);

  // Process payment for a subscription
  const processPayment = useCallback(async (subscription: Subscription, fundType: string) => {
    try {
      // Create an expense record for this subscription payment
      const payload = {
        category: "Subscription",
        amount: subscription.cost,
        description: `Payment for subscription: ${subscription.name}`,
        date: new Date().toISOString(),
        inventoryId: subscription.id,
        fundType: fundType,
      };

      const response = await fetchWithAuth("/api/expenses", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Failed to process payment");
      }

      toast.success("Pembayaran berhasil diproses");

      // Refresh data after payment
      setTimeout(() => {
        fetchSubscriptions();
      }, 1000);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'An unexpected error occurred';

      toast.error(`Gagal memproses pembayaran: ${errorMessage}`);
      return false;
    }
  }, [fetchSubscriptions]);

  // Initial data fetch
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return {
    subscriptions,
    dueSoon,
    others,
    loading,
    error,
    sortColumn,
    sortDirection,
    toggleSort,
    sortSubscriptions,
    refreshData: fetchSubscriptions,
    processPayment,
    isDueSoon,
  };
}

export default useSubscriptionData;
