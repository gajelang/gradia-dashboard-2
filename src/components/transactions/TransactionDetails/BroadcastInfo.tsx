"use client";

import { Calendar, Store } from "lucide-react";

// Get broadcast status based on start and end dates
function getBroadcastStatus(tx: any): string {
  const now = new Date();
  if (tx.startDate) {
    const start = new Date(tx.startDate);
    if (now < start) {
      return "Belum Dimulai";
    }
  }
  if (tx.endDate) {
    const end = new Date(tx.endDate);
    const diff = end.getTime() - now.getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (diff < 0) return "Berakhir";
    if (diff < oneWeek) return "Akan Berakhir";
    return "Aktif";
  }
  return "Aktif";
}

// Broadcast status indicator component
function BroadcastIndicator({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) {
  const status = getBroadcastStatus({ startDate, endDate });
  let bgColor = "";
  switch (status) {
    case "Belum Dimulai":
      bgColor = "bg-blue-500";
      break;
    case "Berakhir":
      bgColor = "bg-neutral-500";
      break;
    case "Akan Berakhir":
      bgColor = "bg-yellow-500";
      break;
    case "Aktif":
      bgColor = "bg-green-500";
      break;
    default:
      bgColor = "bg-gray-500";
  }
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium text-white ${bgColor}`}
    >
      {status}
    </span>
  );
}

interface BroadcastInfoProps {
  transaction: any;
}

/**
 * Broadcast information section for transaction details
 */
export default function BroadcastInfo({ transaction }: BroadcastInfoProps) {
  // Format date for display
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Broadcast Information */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary" />
          Broadcast Information
        </h3>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-sm font-medium">Start Date:</div>
          <div className="text-sm col-span-2">
            {formatDate(transaction.startDate)}
          </div>

          <div className="text-sm font-medium">End Date:</div>
          <div className="text-sm col-span-2">
            {formatDate(transaction.endDate)}
          </div>

          <div className="text-sm font-medium">Broadcast Status:</div>
          <div className="text-sm col-span-2">
            <BroadcastIndicator
              startDate={transaction.startDate}
              endDate={transaction.endDate}
            />
          </div>
        </div>
      </div>

      {/* Vendor Information */}
      {transaction.vendors && transaction.vendors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-bold flex items-center">
            <Store className="h-5 w-5 mr-2 text-primary" />
            Vendors/Subcontractors
          </h3>
          <div className="grid grid-cols-1 gap-1 pl-2">
            {transaction.vendors.map((vendor: any, index: number) => (
              <div key={vendor.id} className="text-sm">
                {index + 1}. {vendor.name} - {vendor.serviceDesc}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}