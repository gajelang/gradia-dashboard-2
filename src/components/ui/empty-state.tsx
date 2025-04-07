"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6" : "py-10",
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "text-muted-foreground mb-3",
            compact ? "h-8 w-8" : "h-12 w-12"
          )}
        />
      )}
      <h3
        className={cn(
          "font-medium text-foreground",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "text-muted-foreground mt-1",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={onAction}
          className="mt-4"
        >
          {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
