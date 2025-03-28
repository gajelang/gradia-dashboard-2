// components/SubscriptionManagement.tsx
"use client";

import { useEffect, useState } from "react";

interface Vendor {
  id: string;
  name: string;
  serviceDesc: string;
}

export interface Subscription {
  id: string;
  name: string;
  description?: string;
  status: string;
  purchaseDate: string;
  expiryDate?: string | null;
  cost: number;
  paymentStatus: string;
  isRecurring: boolean;
  recurringType?: string;
  nextBillingDate?: string | null;
  reminderDays?: number;
  vendor?: Vendor | null;
  createdAt: string;
  updatedAt: string;
}

const THRESHOLD_DAYS = 7;

function isDueSoon(nextBillingDate: string | null | undefined): boolean {
  if (!nextBillingDate) return false;
  const billingDate = new Date(nextBillingDate);
  const today = new Date();
  const diffTime = billingDate.getTime() - today.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);
  return diffDays <= THRESHOLD_DAYS && diffDays >= 0;
}

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [dueSoon, setDueSoon] = useState<Subscription[]>([]);
  const [others, setOthers] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        setLoading(true);
        const res = await fetch("/api/subscriptions");
        if (!res.ok) {
          throw new Error("Failed to fetch subscriptions");
        }
        const data = await res.json();
        setSubscriptions(data);
      } catch (err: any) {
        setError(err.message || "Error fetching subscriptions");
      } finally {
        setLoading(false);
      }
    }
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    const due = subscriptions.filter(sub => isDueSoon(sub.nextBillingDate));
    const notDue = subscriptions.filter(sub => !isDueSoon(sub.nextBillingDate));
    setDueSoon(due);
    setOthers(notDue);
  }, [subscriptions]);

  if (loading) {
    return <div className="p-4">Loading subscriptions...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
      
      <section>
        <h2 className="text-xl font-semibold mb-2">
          Due Soon (within {THRESHOLD_DAYS} days)
        </h2>
        {dueSoon.length === 0 ? (
          <p className="text-gray-500">No subscriptions are due soon.</p>
        ) : (
          <div className="space-y-4">
            {dueSoon.map(sub => (
              <div key={sub.id} className="border p-4 rounded shadow-sm">
                <h3 className="font-semibold text-lg">{sub.name}</h3>
                {sub.description && (
                  <p className="text-gray-600">{sub.description}</p>
                )}
                <p>
                  Next Billing Date:{" "}
                  <span className="font-medium">
                    {sub.nextBillingDate 
                      ? new Date(sub.nextBillingDate).toLocaleDateString() 
                      : "N/A"}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  Payment Status: {sub.paymentStatus}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Other Subscriptions</h2>
        {others.length === 0 ? (
          <p className="text-gray-500">All subscriptions are due soon!</p>
        ) : (
          <div className="space-y-4">
            {others.map(sub => (
              <div key={sub.id} className="border p-4 rounded shadow-sm">
                <h3 className="font-semibold text-lg">{sub.name}</h3>
                {sub.description && (
                  <p className="text-gray-600">{sub.description}</p>
                )}
                <p>
                  Next Billing Date:{" "}
                  <span className="font-medium">
                    {sub.nextBillingDate 
                      ? new Date(sub.nextBillingDate).toLocaleDateString() 
                      : "N/A"}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  Payment Status: {sub.paymentStatus}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
