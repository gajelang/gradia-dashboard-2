"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryTable from "@/components/InventoryTable";
import AddInventoryModal from "@/components/AddInventoryModal";
import SubscriptionManagement from "@/components/SubscriptionManagement";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package2,
  Calendar,
  Archive,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  Download
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ResourceErrorBoundary } from "./ResourceErrorBoundary";
import ResourceStats from "./ResourceStats";
import InventoryTableSkeleton from "./InventoryTableSkeleton";
import ResourceEmptyState from "./ResourceEmptyState";
import useInventoryData from "@/hooks/useInventoryData";

export default function ImprovedInventoryTab() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchTerm, setSearchTerm] = useState("");
  const [localSearchTerm, setLocalSearchTerm] = useState("");

  // Use our custom hook for inventory data
  const {
    inventory,
    archivedInventory,
    categories,
    loading,
    error,
    stats,
    categoryFilter,
    setCategoryFilter,
    refreshData,
    handleInventoryUpdated,
    handleInventoryArchived,
    handleInventoryRestored,
  } = useInventoryData({
    includeArchived: true,
    initialSearchTerm: localSearchTerm,
  });

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Apply search when Enter is pressed or after a delay
  const handleSearchSubmit = () => {
    setLocalSearchTerm(searchTerm);
  };

  // Export inventory data to CSV
  const exportToCSV = () => {
    const dataToExport = activeTab === "archived" ? archivedInventory : inventory;

    // Create CSV content
    const headers = ["Name", "Category", "Quantity", "Unit Price", "Total Value", "Status", "Location"];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(item => [
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.category || ''}"`,
        item.quantity || 0,
        item.unitPrice || 0,
        item.totalValue || 0,
        `"${item.status || ''}"`,
        `"${item.location || ''}"`,
      ].join(","))
    ].join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ResourceErrorBoundary onReset={refreshData}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold">Manajemen Inventaris</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari inventaris..."
                className="pl-9 w-[200px]"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
              />
            </div>
            <Select
              value={categoryFilter || "all"}
              onValueChange={(value) => setCategoryFilter(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={exportToCSV}
              title="Ekspor ke CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
            <AddInventoryModal onInventoryAdded={refreshData} />
          </div>
        </div>

        {/* Statistics Cards */}
        <ResourceStats stats={stats} isLoading={loading} />

        {/* Low stock warning */}
        {!loading && stats.lowStockItems > 0 && (
          <Alert className="bg-red-50 border-red-200 mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle>Peringatan Stok Rendah</AlertTitle>
            <AlertDescription>
              {stats.lowStockItems} item berada di bawah level stok minimum. Harap pertimbangkan untuk mengisi ulang segera.
            </AlertDescription>
          </Alert>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Kesalahan</AlertTitle>
            <AlertDescription>
              {error.message}
              <Button
                variant="link"
                className="p-0 h-auto font-normal ml-2"
                onClick={refreshData}
              >
                Coba lagi
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main content with tabs */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full mb-6">
                <TabsTrigger value="inventory" className="flex items-center gap-2">
                  <Package2 className="h-4 w-4" />
                  Inventaris
                </TabsTrigger>
                <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Langganan
                </TabsTrigger>
                <TabsTrigger value="archived" className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Diarsipkan
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inventory" className="m-0">
                {loading ? (
                  <InventoryTableSkeleton rowCount={5} />
                ) : inventory.length === 0 ? (
                  <ResourceEmptyState
                    icon={Package2}
                    title="Tidak ada item inventaris ditemukan"
                    description="Anda belum menambahkan item inventaris atau tidak ada yang cocok dengan filter saat ini."
                    actionLabel="Tambah Item Inventaris"
                    actionIcon={Package2}
                    onAction={() => document.querySelector<HTMLButtonElement>('[aria-label="Add Inventory Item"]')?.click()}
                    secondaryActionLabel="Hapus Filter"
                    secondaryActionIcon={Filter}
                    onSecondaryAction={() => {
                      setCategoryFilter(null);
                      setSearchTerm("");
                      setLocalSearchTerm("");
                    }}
                  />
                ) : (
                  <InventoryTable
                    inventory={inventory}
                    isLoading={loading}
                    categories={categories}
                    onUpdate={handleInventoryUpdated}
                    onArchive={handleInventoryArchived}
                    categoryFilter={categoryFilter}
                    searchTerm={localSearchTerm}
                  />
                )}
              </TabsContent>

              <TabsContent value="subscriptions" className="m-0">
                <SubscriptionManagement />
              </TabsContent>

              <TabsContent value="archived" className="m-0">
                {loading ? (
                  <InventoryTableSkeleton rowCount={5} />
                ) : archivedInventory.length === 0 ? (
                  <ResourceEmptyState
                    icon={Archive}
                    title="Tidak ada item diarsipkan ditemukan"
                    description="Anda tidak memiliki item inventaris yang diarsipkan atau tidak ada yang cocok dengan filter saat ini."
                    actionLabel="Hapus Filter"
                    actionIcon={Filter}
                    onAction={() => {
                      setCategoryFilter(null);
                      setSearchTerm("");
                      setLocalSearchTerm("");
                    }}
                  />
                ) : (
                  <InventoryTable
                    inventory={archivedInventory}
                    isLoading={loading}
                    isArchived={true}
                    categories={categories}
                    onRestore={handleInventoryRestored}
                    categoryFilter={categoryFilter}
                    searchTerm={localSearchTerm}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ResourceErrorBoundary>
  );
}
