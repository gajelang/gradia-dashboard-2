"use client";

import React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  /** Teks yang ditampilkan di bawah spinner */
  text?: string;
  /** Ukuran spinner (small, medium, large) */
  size?: "sm" | "md" | "lg";
  /** Apakah spinner berputar */
  spinning?: boolean;
  /** Kelas CSS tambahan */
  className?: string;
  /** Tipe spinner (default, circle) */
  variant?: "default" | "circle";
}

/**
 * Komponen Loading untuk menampilkan indikator loading
 */
export function Loading({
  text = "Memuat...",
  size = "md",
  spinning = true,
  className,
  variant = "default",
}: LoadingProps) {
  // Tentukan ukuran berdasarkan prop size
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };
  
  // Tentukan ukuran teks berdasarkan prop size
  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };
  
  // Pilih ikon berdasarkan variant
  const Icon = variant === "default" ? Loader2 : RefreshCw;
  
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <Icon
        className={cn(
          sizeClasses[size],
          spinning && "animate-spin",
          "text-primary"
        )}
      />
      {text && (
        <p className={cn("mt-2 text-muted-foreground", textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  );
}

interface LoadingOverlayProps extends LoadingProps {
  /** Apakah overlay ditampilkan */
  visible: boolean;
  /** Apakah overlay menutupi seluruh layar */
  fullScreen?: boolean;
}

/**
 * Komponen LoadingOverlay untuk menampilkan overlay loading
 */
export function LoadingOverlay({
  visible,
  fullScreen = false,
  text = "Memuat...",
  size = "lg",
  className,
  variant = "default",
}: LoadingOverlayProps) {
  if (!visible) return null;
  
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-background/80 z-50",
        fullScreen
          ? "fixed inset-0"
          : "absolute inset-0 rounded-lg",
        className
      )}
    >
      <Loading text={text} size={size} variant={variant} />
    </div>
  );
}

interface LoadingButtonProps {
  /** Apakah button dalam keadaan loading */
  loading: boolean;
  /** Teks yang ditampilkan saat loading */
  loadingText?: string;
  /** Teks yang ditampilkan saat tidak loading */
  children: React.ReactNode;
  /** Kelas CSS tambahan */
  className?: string;
  /** Props lainnya untuk button */
  [key: string]: any;
}

/**
 * Komponen LoadingButton untuk menampilkan button dengan indikator loading
 */
export function LoadingButton({
  loading,
  loadingText = "Memuat...",
  children,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default Loading;
