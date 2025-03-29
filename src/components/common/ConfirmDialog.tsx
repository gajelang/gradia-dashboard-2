"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  confirmRequired?: boolean;
  confirmPlaceholder?: string;
  confirmValue?: string;
  onConfirmValueChange?: (value: string) => void;
  actionLabel: string;
  actionVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  actionClassName?: string;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

/**
 * A reusable confirmation dialog component that can optionally require text confirmation
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "CONFIRM",
  confirmRequired = true,
  confirmPlaceholder,
  confirmValue = "",
  onConfirmValueChange,
  actionLabel,
  actionVariant = "default",
  actionClassName = "",
  onConfirm,
  isSubmitting = false
}: ConfirmDialogProps) {
  const [internalConfirmValue, setInternalConfirmValue] = useState("");
  
  // Use either external state or internal state for confirmation value
  const value = onConfirmValueChange ? confirmValue : internalConfirmValue;
  const setValue = onConfirmValueChange 
    ? onConfirmValueChange 
    : setInternalConfirmValue;
  
  // Reset internal value when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setInternalConfirmValue("");
    }
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        {confirmRequired && (
          <div className="py-4">
            <p className="mb-2">Type &quot;{confirmText}&quot; to confirm.</p>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={confirmPlaceholder || `Type ${confirmText} to confirm`}
            />
          </div>
        )}
        
        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant={actionVariant}
            onClick={onConfirm}
            disabled={(confirmRequired && value !== confirmText) || isSubmitting}
            className={actionClassName}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">↻</span>
                Processing...
              </>
            ) : (
              actionLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}