"use client";

import { useState } from "react";
import ClientTable from "@/components/ClientTable";
import VendorTable from "@/components/VendorTable";
import InventoryTab from "@/components/InventoryTab";
import { Users, Store, Package } from "lucide-react";
import { Toaster } from "sonner";

export default function ResourcesTab() {
  const [activeTab, setActiveTab] = useState("clients");

  return (
    <div>
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold mb-6">Company Resources</h2>
      
      <div className="border-b mb-6">
        <div className="flex">
          <button
            onClick={() => setActiveTab("clients")}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 ${
              activeTab === "clients" 
                ? "border-primary text-primary font-medium" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Clients
          </button>
          
          <button
            onClick={() => setActiveTab("vendors")}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 ${
              activeTab === "vendors" 
                ? "border-primary text-primary font-medium" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="h-4 w-4" />
            Vendors/Subcontractors
          </button>
          
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 ${
              activeTab === "inventory" 
                ? "border-primary text-primary font-medium" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" />
            Inventory
          </button>
        </div>
      </div>
      
      {activeTab === "clients" && <ClientTable />}
      {activeTab === "vendors" && <VendorTable />}
      {activeTab === "inventory" && <InventoryTab onInventoryAdded={function (inventory: any): void {
        throw new Error("Function not implemented.");
      } } />}
    </div>
  );
}