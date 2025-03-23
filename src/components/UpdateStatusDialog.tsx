"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api"; // Import the authentication utility

// Define a proper Transaction interface
interface Transaction {
  id: string;
  paymentStatus: string;
  downPaymentAmount?: number;
  totalProfit?: number;
}

interface UpdateStatusDialogProps {
  transaction: Transaction;
  onStatusUpdated: (updatedTransaction: Transaction) => void;
}

// Define the payload interface for the update request
interface StatusUpdatePayload {
  id: string;
  paymentStatus: string;
  downPaymentAmount?: number;
  amount?: number;
  remainingAmount?: number;
}

export default function UpdateStatusDialog({ transaction, onStatusUpdated }: UpdateStatusDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(transaction.paymentStatus);
  const [downPaymentAmount, setDownPaymentAmount] = useState(transaction.downPaymentAmount?.toString() || "");
  const [confirmText, setConfirmText] = useState("");
  const paymentStatusOptions = ["Belum Bayar", "DP", "Lunas"];

  const confirmUpdateStatus = async () => {
    if (confirmText !== "UPDATE") {
      toast.error("Please type UPDATE to confirm");
      return;
    }

    // Build payload for update
    const payload: StatusUpdatePayload = {
      id: transaction.id,
      paymentStatus: status,
    };

    if (status === "DP") {
      const dpAmount = parseFloat(downPaymentAmount);
      if (isNaN(dpAmount) || dpAmount <= 0) {
        toast.error("Down payment amount must be greater than 0");
        return;
      }
      payload.downPaymentAmount = dpAmount;
      const totalProfit = transaction.totalProfit || 0;
      if (payload.downPaymentAmount > totalProfit) {
        toast.error("Down payment cannot exceed total profit");
        return;
      }
      payload.amount = payload.downPaymentAmount;
      payload.remainingAmount = totalProfit - payload.downPaymentAmount;
    } else if (status === "Lunas") {
      payload.amount = transaction.totalProfit || 0;
      payload.remainingAmount = 0;
    } else {
      payload.amount = 0;
      payload.remainingAmount = transaction.totalProfit || 0;
    }

    try {
      // Use fetchWithAuth instead of fetch
      const res = await fetchWithAuth("/api/transactions/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update payment status");
      }
      
      const updated = await res.json();
      toast.success("Payment status updated successfully");
      onStatusUpdated(updated.transaction);
      setOpen(false);
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error(`Error updating payment status: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Update Status</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Payment Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select Payment Status" />
            </SelectTrigger>
            <SelectContent>
              {paymentStatusOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {status === "DP" && (
            <div>
              <label className="text-sm font-medium">Down Payment Amount</label>
              <Input
                type="number"
                min="0"
                value={downPaymentAmount}
                onChange={(e) => setDownPaymentAmount(e.target.value)}
                placeholder="Enter down payment amount"
                className="mt-1"
              />
            </div>
          )}
          <div className="mt-4">
            <p className="mb-2">Type &quot;UPDATE&quot; to confirm changing payment status.</p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type UPDATE to confirm"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={confirmUpdateStatus} disabled={confirmText !== "UPDATE"}>
              <Save className="mr-2 h-4 w-4" />
              Update
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
