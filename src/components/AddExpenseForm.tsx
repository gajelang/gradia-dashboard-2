"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";

interface AddExpenseFormProps {
  currentTotalFunds: number;
  onExpenseAdded: (updatedFunds: number) => void;
}

export default function AddExpenseForm({ 
  currentTotalFunds, 
  onExpenseAdded 
}: AddExpenseFormProps) {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: "",
    description: "",
    date: "",
  });

  const expenseCategories: string[] = [
    "gaji",
    "bonus",
    "Pembelian",
    "lembur",
    "produksi",
  ];

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newExpense.category || !newExpense.amount || !newExpense.date) {
      toast.error("Please fill all required fields");
      return;
    }

    // Convert amount to number
    const expenseAmount = parseFloat(newExpense.amount);

    // Check if sufficient funds
    if (expenseAmount > currentTotalFunds) {
      toast.error("Insufficient funds");
      return;
    }

    try {
      // Start a transaction to create expense and update funds
      const result = await prisma.$transaction(async (tx) => {
        // Create expense record
        const expense = await tx.expense.create({
          data: {
            category: newExpense.category,
            amount: expenseAmount,
            description: newExpense.description || null,
            date: new Date(newExpense.date)
          }
        });

        // Find and update company finance (reduce total funds)
        // Assuming there's only one record or we're updating all records
        const updatedFinance = await tx.companyFinance.update({
          where: {
            // Using string ID as the Prisma schema expects a string
            id: "1" // Replace with the actual identifier from your database
          },
          data: {
            totalFunds: {
              decrement: expenseAmount
            }
          }
        });

        return { 
          expense, 
          updatedTotalFunds: updatedFinance.totalFunds 
        };
      });

      // Reset form and close dialog
      setNewExpense({
        category: "",
        amount: "",
        description: "",
        date: "",
      });
      setShowAddExpense(false);

      // Callback to parent component with updated funds
      onExpenseAdded(result.updatedTotalFunds);

      // Success toast
      toast.success("Expense added successfully");

    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    }
  };

  const handleExpenseChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewExpense((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
      <DialogTrigger asChild>
        <Button onClick={() => setShowAddExpense(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Current Available Funds: Rp {currentTotalFunds.toLocaleString()}
          </p>
        </DialogHeader>
        <form onSubmit={handleAddExpense} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">
              Category
            </label>
            <Select
              name="category"
              value={newExpense.category}
              onValueChange={(value) =>
                setNewExpense((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount (Rp)
            </label>
            <Input
              id="amount"
              name="amount"
              type="number"
              value={newExpense.amount}
              onChange={handleExpenseChange}
              placeholder="Enter amount"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="description"
              name="description"
              value={newExpense.description}
              onChange={handleExpenseChange}
              placeholder="Enter description"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-medium">
              Date
            </label>
            <Input
              id="date"
              name="date"
              type="date"
              value={newExpense.date}
              onChange={handleExpenseChange}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAddExpense(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Expense</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}