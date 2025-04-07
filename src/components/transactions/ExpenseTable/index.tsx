"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle } from "lucide-react";
import { formatRupiah } from "@/lib/formatters";
import FundTypeIndicator from "@/components/common/FundTypeIndicator";
import AddExpense from "./AddExpense";

interface ExpenseTableProps {
  transaction: any;
  activeExpenses: any[];
  archivedExpenses: any[];
  onExpensesUpdated: () => void;
}

/**
 * Expense table component for transaction details
 */
export default function ExpenseTable({
  transaction,
  activeExpenses,
  archivedExpenses,
  onExpensesUpdated
}: ExpenseTableProps) {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Format date for display
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate total expense amount
  const totalActiveExpenses = activeExpenses.reduce(
    (sum, expense) => sum + (typeof expense.amount === 'number' ?
      expense.amount : parseFloat(expense.amount) || 0),
    0
  );

  const totalArchivedExpenses = archivedExpenses.reduce(
    (sum, expense) => sum + (typeof expense.amount === 'number' ?
      expense.amount : parseFloat(expense.amount) || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Transaction Expenses</h3>
        <Button
          size="sm"
          onClick={() => setIsAddExpenseOpen(true)}
          className="flex items-center gap-1"
        >
          <PlusCircle className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="active">
            Active Expenses ({activeExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived Expenses ({archivedExpenses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeExpenses.length > 0 ? (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeExpenses.map((expense) => {
                    // Find vendor if available
                    const vendorName =
                      expense.vendorId &&
                      transaction.vendors?.find(
                        (v: any) => v.id === expense.vendorId
                      )?.name;
                    return (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {expense.category}
                        </TableCell>
                        <TableCell>{vendorName || "N/A"}</TableCell>
                        <TableCell>
                          {formatRupiah(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <FundTypeIndicator fundType={expense.fundType || "petty_cash"} size="sm" />
                        </TableCell>
                        <TableCell>
                          {expense.description || "-"}
                        </TableCell>
                        <TableCell>
                          {formatDate(expense.date)}
                        </TableCell>
                        <TableCell>
                          {expense.createdBy?.name || "Unknown"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 text-right font-bold">
                Total: {formatRupiah(totalActiveExpenses)}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No active expenses for this transaction
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived">
          {archivedExpenses.length > 0 ? (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Archived By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedExpenses.map((expense) => {
                    const vendorName =
                      expense.vendorId &&
                      transaction.vendors?.find(
                        (v: any) => v.id === expense.vendorId
                      )?.name;
                    return (
                      <TableRow key={expense.id} className="bg-gray-50">
                        <TableCell className="font-medium">
                          {expense.category}
                        </TableCell>
                        <TableCell>{vendorName || "N/A"}</TableCell>
                        <TableCell>
                          {formatRupiah(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <FundTypeIndicator fundType={expense.fundType || "petty_cash"} size="sm" />
                        </TableCell>
                        <TableCell>
                          {expense.description || "-"}
                        </TableCell>
                        <TableCell>
                          {formatDate(expense.date)}
                        </TableCell>
                        <TableCell>
                          {expense.deletedBy?.name || "Unknown"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 text-right">
                <p className="text-sm text-muted-foreground">
                  Archived expenses are not included in the capital cost calculation
                </p>
                <p className="font-medium mt-1">
                  Total Archived: {formatRupiah(totalArchivedExpenses)}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No archived expenses for this transaction
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AddExpense component will be a Sheet/Modal for adding expenses */}
      <AddExpense
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        transaction={transaction}
        onExpenseAdded={() => {
          setIsAddExpenseOpen(false);
          onExpensesUpdated();
        }}
      />
    </div>
  );
}