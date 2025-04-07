"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Inventory } from "@/app/types/inventory";
import { fetchWithAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface UpdateInventoryQuantityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: Inventory;
  adjustmentType: "increase" | "decrease";
  onQuantityUpdated: (updatedItem: Inventory) => void;
}

const reasonOptions = [
  { value: "purchase", label: "New Purchase" },
  { value: "sales", label: "Sales/Usage" },
  { value: "damaged", label: "Damaged/Defective" },
  { value: "returned", label: "Customer Return" },
  { value: "correction", label: "Inventory Correction" },
  { value: "other", label: "Other" },
];

export default function UpdateInventoryQuantityDialog({
  isOpen,
  onClose,
  item,
  adjustmentType,
  onQuantityUpdated,
}: UpdateInventoryQuantityDialogProps) {
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("purchase");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setQuantity("1");
    setReason(adjustmentType === "increase" ? "purchase" : "sales");
    setNotes("");
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const quantityValue = parseInt(quantity, 10);
    if (!quantity || isNaN(quantityValue) || quantityValue <= 0) {
      errors.quantity = "Please enter a valid positive number";
    }

    // For decrease, check if there's enough stock
    if (adjustmentType === "decrease" && quantityValue > (item.quantity || 0)) {
      errors.quantity = `Cannot decrease by more than current quantity (${item.quantity || 0})`;
    }

    if (!reason) {
      errors.reason = "Please select a reason";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        inventoryId: item.id,
        adjustmentType: adjustmentType,
        adjustmentQuantity: parseInt(quantity, 10),
        reason: reason,
        notes: notes.trim() || null,
      };

      const res = await fetchWithAuth("/api/inventory/adjustment", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update inventory quantity");
      }

      const data = await res.json();
      toast.success(`Inventory quantity ${adjustmentType}d successfully`);

      if (onQuantityUpdated) {
        onQuantityUpdated(data.item);
      }

      onClose();
    } catch (error) {
      console.error("Error updating inventory quantity:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update inventory quantity"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set appropriate reason based on adjustment type when opening the dialog
  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      resetForm();
      setReason(adjustmentType === "increase" ? "purchase" : "sales");
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {adjustmentType === "increase"
              ? "Increase Inventory Quantity"
              : "Decrease Inventory Quantity"}
          </DialogTitle>
          <DialogDescription>
            {adjustmentType === "increase"
              ? "Add more units to the inventory stock."
              : "Remove units from the inventory stock."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label className="text-base font-medium">
              {item.name} (Current: {item.quantity})
            </Label>
            {item.category && (
              <p className="text-sm text-muted-foreground">
                Category: {item.category}
              </p>
            )}
          </div>

          {/* Quantity Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <div className="col-span-3">
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={formErrors.quantity ? "border-red-500" : ""}
              />
              {formErrors.quantity && (
                <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>
              )}
            </div>
          </div>

          {/* Reason Select */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Reason
            </Label>
            <div className="col-span-3">
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger
                  className={formErrors.reason ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions
                    .filter(option =>
                      adjustmentType === "increase"
                        ? ["purchase", "returned", "correction", "other"].includes(option.value)
                        : ["sales", "damaged", "correction", "other"].includes(option.value)
                    )
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              {formErrors.reason && (
                <p className="text-red-500 text-xs mt-1">{formErrors.reason}</p>
              )}
            </div>
          </div>

          {/* Notes Textarea */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Optional notes about this adjustment"
              className="col-span-3"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant={adjustmentType === "decrease" ? "destructive" : "default"}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              adjustmentType === "increase"
                ? "Add Stock"
                : "Remove Stock"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}