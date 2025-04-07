"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateViewProps {
  /** Ikon yang ditampilkan */
  icon: LucideIcon;
  /** Judul */
  title: string;
  /** Deskripsi */
  description: string;
  /** Label untuk tombol aksi utama */
  actionLabel?: string;
  /** Ikon untuk tombol aksi utama */
  actionIcon?: LucideIcon;
  /** Fungsi yang dipanggil saat tombol aksi utama diklik */
  onAction?: () => void;
  /** Label untuk tombol aksi sekunder */
  secondaryActionLabel?: string;
  /** Ikon untuk tombol aksi sekunder */
  secondaryActionIcon?: LucideIcon;
  /** Fungsi yang dipanggil saat tombol aksi sekunder diklik */
  onSecondaryAction?: () => void;
  /** Kelas CSS tambahan */
  className?: string;
  /** Ukuran komponen */
  size?: "sm" | "md" | "lg";
}

/**
 * Komponen EmptyStateView untuk menampilkan keadaan kosong
 */
export function EmptyStateView({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  secondaryActionLabel,
  secondaryActionIcon: SecondaryActionIcon,
  onSecondaryAction,
  className,
  size = "md",
}: EmptyStateViewProps) {
  // Tentukan ukuran berdasarkan prop size
  const sizeClasses = {
    sm: {
      icon: "h-8 w-8",
      title: "text-base font-medium",
      description: "text-xs",
      padding: "py-6",
    },
    md: {
      icon: "h-12 w-12",
      title: "text-lg font-medium",
      description: "text-sm",
      padding: "py-10",
    },
    lg: {
      icon: "h-16 w-16",
      title: "text-xl font-semibold",
      description: "text-base",
      padding: "py-16",
    },
  };
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizeClasses[size].padding,
      className
    )}>
      <Icon className={cn("text-muted-foreground mb-4", sizeClasses[size].icon)} />
      <h3 className={sizeClasses[size].title}>{title}</h3>
      <p className={cn("text-muted-foreground mt-2 max-w-md mx-auto", sizeClasses[size].description)}>
        {description}
      </p>
      
      <div className="flex flex-wrap gap-3 mt-6 justify-center">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="flex items-center gap-2">
            {ActionIcon && <ActionIcon className="h-4 w-4" />}
            {actionLabel}
          </Button>
        )}
        
        {secondaryActionLabel && onSecondaryAction && (
          <Button 
            onClick={onSecondaryAction} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            {SecondaryActionIcon && <SecondaryActionIcon className="h-4 w-4" />}
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export default EmptyStateView;
