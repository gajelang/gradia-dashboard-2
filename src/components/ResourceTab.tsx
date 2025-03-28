"use client";

import { useState } from "react";
import ClientTable from "@/components/ClientTable";
import VendorTable from "@/components/VendorTable";
import InventoryTab from "@/components/InventoryTab";
import SubscriptionTable from "@/components/SubscriptionTable";
import AddSubscriptionModal from "@/components/AddSubscriptionModal";
import { Users, Store, Package, Calendar } from "lucide-react";
import { Toaster } from "sonner";

export default function ResourcesTab() {
  const [activeTab, setActiveTab] = useState("subscriptions");

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold mb-6">Company Resources</h2>
      <div className="border-b mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "clients"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4 inline-block mr-1" />
            Clients
          </button>
          <button
            onClick={() => setActiveTab("vendors")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "vendors"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="h-4 w-4 inline-block mr-1" />
            Vendors/Subcontractors
          </button>
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "subscriptions"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-4 w-4 inline-block mr-1" />
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "inventory"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4 inline-block mr-1" />
            Inventory
          </button>
        </div>
      </div>
      {activeTab === "clients" && <ClientTable />}
      {activeTab === "vendors" && <VendorTable />}
      {activeTab === "inventory" && <InventoryTab />}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Subscriptions</h3>
            <AddSubscriptionModal onSubscriptionAdded={(newSub: any) => {
              // Optionally refresh or update the table – Anda bisa mengimplementasikan fungsi ini sesuai kebutuhan
              console.log("New subscription added:", newSub);
            }} />
          </div>
          <SubscriptionTable />
        </div>
      )}
    </div>
  );
}
