"use client";

import { Info, User } from "lucide-react";

interface BasicInfoProps {
  transaction: any;
}

/**
 * Basic information section for transaction details
 */
export default function BasicInfo({ transaction }: BasicInfoProps) {
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
    <div className="space-y-4">
      {/* Basic Information */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold flex items-center">
          <Info className="h-5 w-5 mr-2 text-primary" />
          Basic Information
        </h3>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-sm font-medium">Name:</div>
          <div className="text-sm col-span-2">
            {transaction.name}
          </div>

          <div className="text-sm font-medium">Description:</div>
          <div className="text-sm col-span-2">
            {transaction.description || "-"}
          </div>

          <div className="text-sm font-medium">Date:</div>
          <div className="text-sm col-span-2">
            {formatDate(transaction.date)}
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold flex items-center">
          <User className="h-5 w-5 mr-2 text-primary" />
          Contact Information
        </h3>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-sm font-medium">Client:</div>
          <div className="text-sm col-span-2">
            {transaction.client
              ? `${transaction.client.name} (${transaction.client.code})`
              : "-"}
          </div>

          {transaction.email && (
            <>
              <div className="text-sm font-medium">Email:</div>
              <div className="text-sm col-span-2">
                {transaction.email}
              </div>
            </>
          )}

          {transaction.phone && (
            <>
              <div className="text-sm font-medium">Phone:</div>
              <div className="text-sm col-span-2">
                {transaction.phone}
              </div>
            </>
          )}

          {transaction.pic && (
            <>
              <div className="text-sm font-medium">PIC:</div>
              <div className="text-sm col-span-2">
                {transaction.pic.name}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}