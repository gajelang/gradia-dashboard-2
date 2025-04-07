"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientTable from "@/components/ClientTable";
import VendorTable from "@/components/VendorTable";
import ImprovedInventoryTab from "@/components/resources/ImprovedInventoryTab";
import ImprovedSubscriptionManagement from "@/components/resources/ImprovedSubscriptionManagement";
import InventoryDashboard from "@/components/resources/InventoryDashboard";
import { Users, Store, Package, Calendar, LayoutDashboard } from "lucide-react";
import { Toaster } from "sonner";
import { ResourceErrorBoundary } from "./ResourceErrorBoundary";

export default function ImprovedResourceTab() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <ResourceErrorBoundary>
      <div className="p-6">
        <Toaster position="top-right" />
        <h2 className="text-2xl font-bold mb-6">Company Resources</h2>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dasbor
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventaris
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Langganan
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Klien
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Vendor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="m-0">
            <InventoryDashboard />
          </TabsContent>

          <TabsContent value="inventory" className="m-0">
            <ImprovedInventoryTab />
          </TabsContent>

          <TabsContent value="subscriptions" className="m-0">
            <ImprovedSubscriptionManagement />
          </TabsContent>

          <TabsContent value="clients" className="m-0">
            <ClientTable />
          </TabsContent>

          <TabsContent value="vendors" className="m-0">
            <VendorTable />
          </TabsContent>
        </Tabs>
      </div>
    </ResourceErrorBoundary>
  );
}
