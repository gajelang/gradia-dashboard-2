"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";
import {
  Package2,
  AlertTriangle,
  Calendar,
  Tag,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Percent
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ResourceStatsProps {
  stats: {
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
    upcomingRenewals: number;
    categories: number;
    subscriptionCost: number;
  };
  isLoading?: boolean;
}

export default function ResourceStats({ stats, isLoading = false }: ResourceStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-[100px] mb-2" />
                  <Skeleton className="h-8 w-[120px]" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: "Total Inventaris",
      value: stats.totalItems.toString(),
      icon: Package2,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Total Nilai",
      value: formatRupiah(stats.totalValue),
      icon: CreditCard,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      label: "Item Stok Rendah",
      value: stats.lowStockItems.toString(),
      icon: AlertTriangle,
      color: stats.lowStockItems > 0 ? "text-amber-500" : "text-gray-500",
      bgColor: stats.lowStockItems > 0 ? "bg-amber-50" : "bg-gray-50",
    },
    {
      label: "Perpanjangan Mendatang",
      value: stats.upcomingRenewals.toString(),
      icon: Calendar,
      color: stats.upcomingRenewals > 0 ? "text-purple-500" : "text-gray-500",
      bgColor: stats.upcomingRenewals > 0 ? "bg-purple-50" : "bg-gray-50",
    },
    {
      label: "Kategori",
      value: stats.categories.toString(),
      icon: Tag,
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Langganan Bulanan",
      value: formatRupiah(stats.subscriptionCost),
      icon: CreditCard,
      color: "text-rose-500",
      bgColor: "bg-rose-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {statItems.map((item, index) => (
        <Card key={index} className="border shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-semibold mt-1">{item.value}</p>
              </div>
              <div className={`p-2 rounded-full ${item.bgColor}`}>
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
