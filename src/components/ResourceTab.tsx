"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import ClientTable from "@/components/ClientTable";
import VendorTable from "@/components/VendorTable";
import { Users, Store } from "lucide-react";

export default function ResourcesTab() {
  const [activeTab, setActiveTab] = useState("clients");

  return (
    <div className="space-y-4">
      <Card className="border rounded-md">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-6">Company Resources</h2>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-[400px] mb-6">
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="vendors" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Vendors/Subcontractors
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="clients" className="mt-0">
              <ClientTable />
            </TabsContent>
            
            <TabsContent value="vendors" className="mt-0">
              <VendorTable />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}