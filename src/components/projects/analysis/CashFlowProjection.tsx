"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface CashFlowProjectionProps {
  projectsData: any[];
  isLoading: boolean;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export default function CashFlowProjection({
  projectsData,
  isLoading,
  dateRange,
}: CashFlowProjectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Projection</CardTitle>
        <CardDescription>
          This feature will be implemented in a future update
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p className="text-muted-foreground">Cash Flow Projection feature coming soon</p>
            <p className="text-sm text-muted-foreground mt-1">This feature will provide cash flow forecasting based on project timelines and payment schedules</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
