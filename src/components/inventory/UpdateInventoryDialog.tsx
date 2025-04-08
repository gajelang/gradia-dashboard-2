"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Edit, Loader2, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import { Inventory } from "@/app/types/inventory";
import { fetchWithAuth } from "@/lib/api/api";

interface UpdateInventoryDialogProps {
  item: Inventory;
  categories: string[];
  onItemUpdated?: (updatedItem: Inventory) => void;
  triggerId?: string; // Added missing prop
}

interface FormData {
  name: string;
  category: string;
  unitPrice: string;
  location: string;
  minimumStock: string;
  supplier: string;
  description: string;
  purchaseDate: string;
}

export default function UpdateInventoryDialog({
  item,
  categories,
  onItemUpdated,
  triggerId,
}: UpdateInventoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: item.name,
    category: item.category || "",
    unitPrice: (item.unitPrice || item.cost).toString(),
    location: item.location || "",
    minimumStock: item.minimumStock?.toString() || "",
    supplier: item.supplier || item.vendor?.name || "",
    description: item.description || "",
    purchaseDate: item.purchaseDate 
      ? new Date(item.purchaseDate).toISOString().split("T")[0]
      : "",
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: item.name,
        category: item.category || "",
        unitPrice: (item.unitPrice || item.cost).toString(),
        location: item.location || "",
        minimumStock: item.minimumStock?.toString() || "",
        supplier: item.supplier || item.vendor?.name || "",
        description: item.description || "",
        purchaseDate: item.purchaseDate 
          ? new Date(item.purchaseDate).toISOString().split("T")[0]
          : "",
      });
      setConfirmText("");
      setFormErrors({});
      setNewCategory("");
      setShowNewCategoryInput(false);
    }
  }, [open, item]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when field is being edited
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === "new") {
      setShowNewCategoryInput(true);
      return;
    }
    
    setFormData((prev) => ({ 
      ...prev, 
      category: value === "none" ? "" : value 
    }));
    setShowNewCategoryInput(false);
    
    // Clear category error
    if (formErrors.category) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.category;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = "Item name is required";
    }
    
    if (!formData.unitPrice) {
      errors.unitPrice = "Unit price is required";
    } else if (isNaN(parseFloat(formData.unitPrice)) || parseFloat(formData.unitPrice) < 0) {
      errors.unitPrice = "Unit price must be a valid positive number";
    }
    
    if (formData.minimumStock && (
      isNaN(parseInt(formData.minimumStock)) || 
      parseInt(formData.minimumStock) < 0
    )) {
      errors.minimumStock = "Minimum stock must be a valid non-negative number";
    }
    
    if (showNewCategoryInput && !newCategory.trim()) {
      errors.newCategory = "Category name is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (confirmText !== "UPDATE") {
      toast.error("Please type UPDATE to confirm changes");
      return;
    }

    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare the payload
      const effectiveCategory = showNewCategoryInput ? newCategory : formData.category;
      
      const payload = {
        id: item.id,
        name: formData.name,
        category: effectiveCategory,
        unitPrice: parseFloat(formData.unitPrice),
        location: formData.location || null,
        minimumStock: formData.minimumStock ? parseInt(formData.minimumStock) : null,
        supplier: formData.supplier || null,
        description: formData.description || null,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
      };

      const res = await fetchWithAuth("/api/inventory", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update inventory item");
      }

      const data = await res.json();
      toast.success("Inventory item updated successfully");
      
      if (onItemUpdated) {
        onItemUpdated(data.item);
      }
      
      setOpen(false);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update inventory item"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerId ? (
          <Button
            id={triggerId}
            variant="outline"
            size="icon"
            title="Edit item"
            className="hidden"
          >
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            title="Edit item"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Inventory Item</DialogTitle>
          <DialogDescription>
            Make changes to the inventory item details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Item Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Item Name*
            </Label>
            <div className="col-span-3">
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
              )}
            </div>
          </div>
          
          {/* Category */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <div className="col-span-3">
              {!showNewCategoryInput ? (
                <Select
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">+ Add New Category</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter new category name"
                    className={formErrors.newCategory ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setNewCategory("");
                    }}
                  >
                    &times;
                  </Button>
                </div>
              )}
              {formErrors.newCategory && (
                <p className="text-red-500 text-xs mt-1">{formErrors.newCategory}</p>
              )}
            </div>
          </div>
          
          {/* Unit Price */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unitPrice" className="text-right">
              Unit Price*
            </Label>
            <div className="col-span-3">
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={handleChange}
                className={formErrors.unitPrice ? "border-red-500" : ""}
              />
              {formErrors.unitPrice && (
                <p className="text-red-500 text-xs mt-1">{formErrors.unitPrice}</p>
              )}
            </div>
          </div>
          
          {/* Location */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              Location
            </Label>
            <Input
              id="location"
              name="location"
              className="col-span-3"
              value={formData.location}
              onChange={handleChange}
            />
          </div>
          
          {/* Minimum Stock */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="minimumStock" className="text-right">
              Min. Stock
            </Label>
            <div className="col-span-3">
              <Input
                id="minimumStock"
                name="minimumStock"
                type="number"
                min="0"
                value={formData.minimumStock}
                onChange={handleChange}
                className={formErrors.minimumStock ? "border-red-500" : ""}
              />
              {formErrors.minimumStock && (
                <p className="text-red-500 text-xs mt-1">{formErrors.minimumStock}</p>
              )}
            </div>
          </div>
          
          {/* Supplier */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supplier" className="text-right">
              Supplier
            </Label>
            <Input
              id="supplier"
              name="supplier"
              className="col-span-3"
              value={formData.supplier}
              onChange={handleChange}
            />
          </div>
          
          {/* Purchase Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="purchaseDate" className="text-right">
              Purchase Date
            </Label>
            <Input
              id="purchaseDate"
              name="purchaseDate"
              type="date"
              className="col-span-3"
              value={formData.purchaseDate}
              onChange={handleChange}
            />
          </div>
          
          {/* Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right align-self-start pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              className="col-span-3"
              rows={3}
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          
          {/* Confirmation */}
          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="confirm" className="text-right">
              Confirm
            </Label>
            <div className="col-span-3">
              <p className="text-sm text-muted-foreground mb-2">
                Type "UPDATE" to confirm changes
              </p>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "UPDATE" to confirm'
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || confirmText !== "UPDATE"}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}