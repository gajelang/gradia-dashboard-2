"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api";

interface AddSubscriptionModalProps {
  onSubscriptionAdded: (subscription: any) => void;
}

export default function AddSubscriptionModal({ onSubscriptionAdded }: AddSubscriptionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cost: "",
    paymentStatus: "BELUM_BAYAR",
    nextBillingDate: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    if (!formData.cost || isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) <= 0) {
      errors.cost = "Valid cost is required";
    }
    if (!formData.nextBillingDate) {
      errors.nextBillingDate = "Next billing date is required";
    } else {
      const nextBilling = new Date(formData.nextBillingDate);
      if (nextBilling <= new Date()) {
        errors.nextBillingDate = "Next billing date must be in the future";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        cost: parseFloat(formData.cost),
        paymentStatus: formData.paymentStatus,
        nextBillingDate: new Date(formData.nextBillingDate).toISOString(),
        type: "SUBSCRIPTION",
        isRecurring: true,
        recurringType: "MONTHLY",
      };
      const res = await fetchWithAuth("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add subscription");
      }
      const data = await res.json();
      onSubscriptionAdded(data);
      toast.success("Subscription added successfully");
      setIsOpen(false);
      setFormData({
        name: "",
        description: "",
        cost: "",
        paymentStatus: "BELUM_BAYAR",
        nextBillingDate: "",
      });
    } catch (error) {
      console.error("Error adding subscription:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Subscription</DialogTitle>
          <DialogDescription>
            Enter subscription details below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium">Name*</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={formErrors.name ? "border-red-500" : ""}
            />
            {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Cost (Rp)*</label>
            <Input
              name="cost"
              type="number"
              value={formData.cost}
              onChange={handleChange}
              className={formErrors.cost ? "border-red-500" : ""}
            />
            {formErrors.cost && <p className="text-red-500 text-xs mt-1">{formErrors.cost}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Next Billing Date*</label>
            <Input
              name="nextBillingDate"
              type="date"
              value={formData.nextBillingDate}
              onChange={handleChange}
              className={formErrors.nextBillingDate ? "border-red-500" : ""}
            />
            {formErrors.nextBillingDate && <p className="text-red-500 text-xs mt-1">{formErrors.nextBillingDate}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Subscription"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
