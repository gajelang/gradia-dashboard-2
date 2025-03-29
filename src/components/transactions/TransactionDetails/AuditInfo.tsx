"use client";

interface AuditInfoProps {
  transaction: any;
}

/**
 * Audit information section for transaction details
 */
export default function AuditInfo({ transaction }: AuditInfoProps) {
  // Format date and time
  const formatDateTime = (dateString: string | undefined | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-bold">Audit Information</h3>
      <div className="grid grid-cols-3 gap-1">
        {transaction.createdBy && (
          <>
            <div className="text-sm font-medium">
              Created By:
            </div>
            <div className="text-sm col-span-2">
              {transaction.createdBy.name}
            </div>

            <div className="text-sm font-medium">
              Created At:
            </div>
            <div className="text-sm col-span-2">
              {formatDateTime(transaction.createdAt)}
            </div>
          </>
        )}

        {transaction.updatedBy && (
          <>
            <div className="text-sm font-medium">
              Last Updated By:
            </div>
            <div className="text-sm col-span-2">
              {transaction.updatedBy.name}
            </div>

            <div className="text-sm font-medium">
              Updated At:
            </div>
            <div className="text-sm col-span-2">
              {formatDateTime(transaction.updatedAt)}
            </div>
          </>
        )}

        {transaction.deletedBy && (
          <>
            <div className="text-sm font-medium">
              Archived By:
            </div>
            <div className="text-sm col-span-2">
              {transaction.deletedBy.name}
            </div>

            <div className="text-sm font-medium">
              Archived At:
            </div>
            <div className="text-sm col-span-2">
              {formatDateTime(transaction.deletedAt)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}