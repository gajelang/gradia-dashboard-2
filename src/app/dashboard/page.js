// src/app/dashboard/page.tsx
"use client";

import Dashboard from "@/components/dashboard/index";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}