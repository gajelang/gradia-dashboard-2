"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface ResourceEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionIcon?: LucideIcon;
  onSecondaryAction?: () => void;
}

export default function ResourceEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  secondaryActionLabel,
  secondaryActionIcon: SecondaryActionIcon,
  onSecondaryAction,
}: ResourceEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto">
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
