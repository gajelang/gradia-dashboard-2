// src/app/dashboard/page.tsx
"use client";

import Dashboard from "@/components/dashboard";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}