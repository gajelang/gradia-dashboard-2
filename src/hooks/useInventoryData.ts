// src/hooks/useInventoryData.ts
import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { Inventory } from '@/app/types/inventory';
import { toast } from 'react-hot-toast';

interface UseInventoryDataProps {
  includeArchived?: boolean;
  initialCategory?: string | null;
  initialSearchTerm?: string;
}

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  upcomingRenewals: number;
  categories: number;
  subscriptionCost: number;
}

export function useInventoryData({
  includeArchived = false,
  initialCategory = null,
  initialSearchTerm = '',
}: UseInventoryDataProps = {}) {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [archivedInventory, setArchivedInventory] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    upcomingRenewals: 0,
    categories: 0,
    subscriptionCost: 0,
  });
  const [categoryFilter, setCategoryFilter] = useState<string | null>(initialCategory);
  const [searchTerm, setSearchTerm] = useState<string>(initialSearchTerm);
  const [filteredInventory, setFilteredInventory] = useState<Inventory[]>([]);
  const [filteredArchivedInventory, setFilteredArchivedInventory] = useState<Inventory[]>([]);

  // Fetch inventory data
  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active inventory
      const inventoryResponse = await fetchWithAuth('/api/inventory', { cache: 'no-store' });

      if (!inventoryResponse.ok) {
        throw new Error('Failed to fetch inventory data');
      }

      const inventoryData = await inventoryResponse.json();
      setInventory(inventoryData);

      // Fetch archived inventory if needed
      let archivedItems = [];
      if (includeArchived) {
        const archivedResponse = await fetchWithAuth('/api/inventory?deleted=true', { cache: 'no-store' });

        if (!archivedResponse.ok) {
          throw new Error('Failed to fetch archived inventory data');
        }

        archivedItems = await archivedResponse.json();
        setArchivedInventory(archivedItems);
      }

      // Fetch categories
      const categoriesResponse = await fetchWithAuth('/api/inventory/categories', { cache: 'no-store' });

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch inventory categories');
      }

      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData);

      // Calculate statistics
      calculateStats([...inventoryData, ...archivedItems]);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      toast.error('Gagal memuat data inventory');
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  // Calculate inventory statistics
  const calculateStats = (items: Inventory[]) => {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => {
      // Pastikan nilai yang digunakan adalah numerik
      const value = typeof item.totalValue === 'string' ? parseFloat(item.totalValue) :
                   (item.totalValue ||
                    (typeof item.currentValue === 'string' ? parseFloat(item.currentValue) : item.currentValue) ||
                    (typeof item.cost === 'string' ? parseFloat(item.cost) : item.cost) ||
                    0);
      return sum + value;
    }, 0);

    const lowStockItems = items.filter(item =>
      item.type !== "SUBSCRIPTION" &&
      (item.quantity || 0) <= (item.minimumStock || 0) &&
      (item.quantity || 0) > 0
    ).length;

    const uniqueCategories = new Set(items.map(item => item.category).filter(Boolean)).size;

    // Calculate upcoming subscription renewals (due in the next 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcomingRenewals = items.filter(item =>
      item.type === "SUBSCRIPTION" &&
      item.nextBillingDate &&
      new Date(item.nextBillingDate) >= today &&
      new Date(item.nextBillingDate) <= thirtyDaysFromNow
    ).length;

    // Calculate monthly subscription cost
    const subscriptionCost = items
      .filter(item => item.type === "SUBSCRIPTION")
      .reduce((sum, item) => {
        const cost = typeof item.cost === 'string' ? parseFloat(item.cost) : (item.cost || 0);
        return sum + cost;
      }, 0);

    setStats({
      totalItems,
      totalValue,
      lowStockItems,
      upcomingRenewals,
      categories: uniqueCategories,
      subscriptionCost
    });
  };

  // Filter inventory based on category and search term
  useEffect(() => {
    let filtered = [...inventory];
    let filteredArchived = [...archivedInventory];

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
      filteredArchived = filteredArchived.filter(item => item.category === categoryFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        (item.description?.toLowerCase().includes(searchLower)) ||
        (item.category?.toLowerCase().includes(searchLower)) ||
        (item.supplier?.toLowerCase().includes(searchLower)) ||
        (item.location?.toLowerCase().includes(searchLower))
      );

      filteredArchived = filteredArchived.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        (item.description?.toLowerCase().includes(searchLower)) ||
        (item.category?.toLowerCase().includes(searchLower)) ||
        (item.supplier?.toLowerCase().includes(searchLower)) ||
        (item.location?.toLowerCase().includes(searchLower))
      );
    }

    setFilteredInventory(filtered);
    setFilteredArchivedInventory(filteredArchived);
  }, [inventory, archivedInventory, categoryFilter, searchTerm]);

  // Initial data fetch
  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  // Handle inventory update
  const handleInventoryUpdated = useCallback((updatedItem: Inventory) => {
    setInventory(prev => prev.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    ));
    toast.success('Inventory berhasil diperbarui');
    fetchInventoryData(); // Refresh data to ensure consistency
  }, [fetchInventoryData]);

  // Handle inventory archive
  const handleInventoryArchived = useCallback((archivedItem: Inventory) => {
    setInventory(prev => prev.filter(item => item.id !== archivedItem.id));
    setArchivedInventory(prev => [...prev, archivedItem]);
    toast.success('Inventory berhasil diarsipkan');
  }, []);

  // Handle inventory restore
  const handleInventoryRestored = useCallback((restoredItem: Inventory) => {
    setArchivedInventory(prev => prev.filter(item => item.id !== restoredItem.id));
    setInventory(prev => [...prev, restoredItem]);
    toast.success('Inventory berhasil dipulihkan');
  }, []);

  return {
    inventory: filteredInventory,
    archivedInventory: filteredArchivedInventory,
    categories,
    loading,
    error,
    stats,
    categoryFilter,
    setCategoryFilter,
    searchTerm,
    setSearchTerm,
    refreshData: fetchInventoryData,
    handleInventoryUpdated,
    handleInventoryArchived,
    handleInventoryRestored,
  };
}

export default useInventoryData;
