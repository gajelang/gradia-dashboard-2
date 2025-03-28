"use client";

import { useState, useEffect } from "react";
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
  BarChart3,
  Search
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/formatters";

// Common interface that works with both components
export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  status: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  category?: string;
  purchaseDate: string;
  isDeleted: boolean;
  minimumStock?: number;
  createdAt: string;
  updatedAt: string;
  // Additional fields for subscriptions
  isRecurring?: boolean;
  recurringType?: string;
  nextBillingDate?: string;
  paymentStatus?: string;
  cost?: number;
  expenses?: any[];
  // Fields for the detail view
  location?: string;
  supplier?: string;
  createdBy?: {
    id: string;
    name: string;
    email?: string;
  };
  updatedBy?: {
    id: string;
    name: string;
    email?: string;
  };
}

export default function InventoryTab() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [archivedInventory, setArchivedInventory] = useState<InventoryItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    upcomingRenewals: 0,
    categories: 0,
    subscriptionCost: 0
  });
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  
  // Fetch inventory data
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        
        // Fetch active inventory
        const res = await fetchWithAuth("/api/inventory", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch inventory");
        const data = await res.json();
        
        // Process the data to ensure it matches our interface
        const processedData = data.map((item: any) => ({
          ...item,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          minimumStock: item.minimumStock ?? 0
        }));
        
        // Filter out subscriptions from regular inventory
        const regularItems = processedData.filter((item: InventoryItem) => item.type !== "SUBSCRIPTION");
        setInventory(regularItems);
        
        // Filter subscription items
        const subscriptionItems = processedData.filter((item: InventoryItem) => item.type === "SUBSCRIPTION");
        setSubscriptions(subscriptionItems);
        
        // Fetch archived inventory
        const archivedRes = await fetchWithAuth("/api/inventory?deleted=true", { cache: "no-store" });
        if (archivedRes.ok) {
          const archivedData = await archivedRes.json();
          // Process archived data too
          const processedArchivedData = archivedData.map((item: any) => ({
            ...item,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            minimumStock: item.minimumStock ?? 0
          }));
          setArchivedInventory(processedArchivedData);
        }
        
        // Fetch categories
        const categoriesRes = await fetchWithAuth("/api/inventory/categories", { cache: "no-store" });
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }
        
        // Calculate statistics
        calculateStats([...regularItems, ...subscriptionItems]);
      } catch (error) {
        console.error("Error fetching inventory:", error);
        toast.error("Failed to load inventory data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInventory();
  }, []);
  
  // Calculate inventory statistics
  const calculateStats = (items: InventoryItem[]) => {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
    
    const lowStockItems = items.filter(item => 
      item.type !== "SUBSCRIPTION" && 
      item.quantity <= (item.minimumStock || 0) && 
      item.quantity > 0
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
      .reduce((sum, item) => sum + (item.cost || 0), 0);
    
    setStats({
      totalItems,
      totalValue,
      lowStockItems,
      upcomingRenewals,
      categories: uniqueCategories,
      subscriptionCost
    });
  };
  
  // Handle item added (both inventory and subscriptions)
  const handleInventoryAdded = (newItem: InventoryItem) => {
    // Ensure the new item has the required fields
    const processedItem = {
      ...newItem,
      createdAt: newItem.createdAt || new Date().toISOString(),
      updatedAt: newItem.updatedAt || new Date().toISOString(),
      minimumStock: newItem.minimumStock ?? 0
    };

    if (processedItem.type === "SUBSCRIPTION") {
      setSubscriptions(prev => [...prev, processedItem]);
    } else {
      setInventory(prev => [...prev, processedItem]);
    }
    
    // Update stats with the new item
    calculateStats([...inventory, ...subscriptions, processedItem]);
    
    // If a new category was added, update the categories list
    if (processedItem.category && !categories.includes(processedItem.category)) {
      setCategories(prev => [...prev, processedItem.category!]);
    }
  };
  
  // Handle updating an item
  const handleInventoryUpdated = (updatedItem: InventoryItem) => {
    // Ensure the updated item has the required fields
    const processedItem = {
      ...updatedItem,
      createdAt: updatedItem.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(), // Always update the updatedAt field
      minimumStock: updatedItem.minimumStock ?? 0
    };

    if (processedItem.type === "SUBSCRIPTION") {
      setSubscriptions(prev => 
        prev.map(item => item.id === processedItem.id ? processedItem : item)
      );
    } else {
      setInventory(prev => 
        prev.map(item => item.id === processedItem.id ? processedItem : item)
      );
    }
    
    // Update stats
    calculateStats([
      ...inventory.filter(item => item.id !== processedItem.id), 
      ...subscriptions.filter(item => item.id !== processedItem.id),
      processedItem
    ]);
  };
  
  // Handle archiving an item
  const handleInventoryArchived = (archivedItem: InventoryItem) => {
    // Ensure the archived item has the required fields
    const processedItem = {
      ...archivedItem,
      createdAt: archivedItem.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(), // Always update the updatedAt field
      minimumStock: archivedItem.minimumStock ?? 0,
      isDeleted: true
    };

    if (processedItem.type === "SUBSCRIPTION") {
      setSubscriptions(prev => prev.filter(item => item.id !== processedItem.id));
    } else {
      setInventory(prev => prev.filter(item => item.id !== processedItem.id));
    }
    
    setArchivedInventory(prev => [...prev, processedItem]);
    
    // Update stats
    calculateStats([
      ...inventory.filter(item => item.id !== processedItem.id),
      ...subscriptions.filter(item => item.id !== processedItem.id)
    ]);
  };
  
  // Handle restoring an item from archive
  const handleInventoryRestored = (restoredItem: InventoryItem) => {
    // Ensure the restored item has the required fields
    const processedItem = {
      ...restoredItem,
      createdAt: restoredItem.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(), // Always update the updatedAt field
      minimumStock: restoredItem.minimumStock ?? 0,
      isDeleted: false
    };

    setArchivedInventory(prev => prev.filter(item => item.id !== processedItem.id));
    
    if (processedItem.type === "SUBSCRIPTION") {
      setSubscriptions(prev => [...prev, processedItem]);
    } else {
      setInventory(prev => [...prev, processedItem]);
    }
    
    // Update stats
    calculateStats([
      ...inventory,
      ...subscriptions,
      processedItem
    ]);
  };
  
  // Handle subscription selected from notifications
  const handleSubscriptionSelected = (subscriptionId: string) => {
    setActiveTab("subscriptions");
    setSelectedSubscriptionId(subscriptionId);
  };
  
  // Render dashboard stats
  const renderStatCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Rp{formatRupiah(stats.totalValue)}</div>
          <p className="text-xs text-muted-foreground mt-1">{stats.totalItems} total items</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {stats.lowStockItems > 0 ? (
              <Badge variant="destructive" className="w-fit">
                {stats.lowStockItems} Low Stock Items
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 w-fit">
                Stock Levels Normal
              </Badge>
            )}
            <p className="text-xs text-muted-foreground">{stats.categories} categories</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="text-lg font-bold">Rp{formatRupiah(stats.subscriptionCost)}<span className="text-xs font-normal text-muted-foreground">/month</span></div>
            {stats.upcomingRenewals > 0 ? (
              <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 w-fit">
                {stats.upcomingRenewals} Upcoming Renewals
              </Badge>
            ) : (
              <Badge variant="outline" className="w-fit">
                No Upcoming Renewals
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              className="pl-9 w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={categoryFilter || "all"} onValueChange={(value) => setCategoryFilter(value === "all" ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AddInventoryModal onInventoryAdded={handleInventoryAdded} />
        </div>
      </div>
      
      {/* Stats Dashboard */}
      {!loading && renderStatCards()}
      
      {/* Low stock warning */}
      {!loading && stats.lowStockItems > 0 && (
        <Alert className="bg-red-50 border-red-200 mb-6">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>Low Stock Warning</AlertTitle>
          <AlertDescription>
            {stats.lowStockItems} items are below minimum stock levels. Please consider restocking soon.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Upcoming renewals warning */}
      {!loading && stats.upcomingRenewals > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200 mb-6">
          <Calendar className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Upcoming Subscription Renewals</AlertTitle>
          <AlertDescription>
            {stats.upcomingRenewals} subscriptions are due for renewal in the next 30 days.
            Visit the Subscriptions tab to manage them.
          </AlertDescription>
        </Alert>
      )}

      {/* Main content with tabs */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-3/4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full mb-6">
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Package2 className="h-4 w-4" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Subscriptions
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Archived
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="inventory" className="m-0">
              <InventoryTable
                inventory={inventory as any}
                isLoading={loading}
                categories={categories}
                onUpdate={handleInventoryUpdated as any}
                onArchive={handleInventoryArchived as any}
                categoryFilter={categoryFilter}
                searchTerm={searchTerm}
              />
            </TabsContent>
            
<TabsContent value="subscriptions" className="m-0">
  <SubscriptionManagement />
</TabsContent>

            
            <TabsContent value="archived" className="m-0">
              <InventoryTable
                inventory={archivedInventory as any}
                isLoading={loading}
                isArchived={true}
                categories={categories}
                onRestore={handleInventoryRestored as any}
                categoryFilter={categoryFilter}
                searchTerm={searchTerm}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}