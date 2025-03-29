"use client";

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A reusable component for displaying payment status badges
 */
export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  // Determine color based on status
  const getColorClass = (status: string) => {
    switch (status) {
      case "Lunas":
        return "bg-green-100 text-green-800";
      case "DP":
        return "bg-yellow-100 text-yellow-800";
      case "Belum Bayar":
      default:
        return "bg-red-100 text-red-800";
    }
  };
  
  // Determine size classes
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2.5 py-0.5",
    lg: "text-sm px-3 py-1"
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${getColorClass(status)} ${sizeClasses[size]}`}>
      {status}
    </span>
  );
}