"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "react-hot-toast";

// Import detail section components
import BasicInfo from "./BasicInfo";
import FinancialInfo from "./FinancialInfo";
import BroadcastInfo from "./BroadcastInfo";
import AuditInfo from "./AuditInfo";
import ExpenseTable from "../ExpenseTable";

// Import dialogs
import UpdateStatusDialog from "@/components/UpdateStatusDialog";
import UpdateTransactionDialog from "@/components/UpdateTransactionDialog";

interface TransactionDetailsProps {
  transaction: any;
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdated: (updatedTransaction: any) => void;
}

export default function TransactionDetails({
  transaction,
  isOpen,
  onClose,
  onTransactionUpdated
}: TransactionDetailsProps) {
  const [detailViewTab, setDetailViewTab] = useState<string>("details");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(transaction);
  const [transactionExpenses, setTransactionExpenses] = useState<any[]>([]);
  const [activeExpenses, setActiveExpenses] = useState<any[]>([]);
  const [archivedExpenses, setArchivedExpenses] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  
  // Update local transaction when prop changes
  useEffect(() => {
    if (transaction) {
      setSelectedTransaction(transaction);
      fetchTransactionExpenses(transaction.id);
    }
  }, [transaction]);
  
  // Fetch transaction expenses
  const fetchTransactionExpenses = async (transactionId: string) => {
    try {
      setLoadingExpenses(true);
      
      const res = await fetchWithAuth(
        `/api/transactions/expenses?transactionId=${transactionId}&includeArchived=true`,
        { cache: "no-store" }
      );
      
      if (!res.ok) {
        throw new Error("Failed to fetch transaction expenses");
      }
      
      const data = await res.json();
      
      setTransactionExpenses(data.expenses || []);
      setActiveExpenses(data.activeExpenses || []);
      setArchivedExpenses(data.archivedExpenses || []);
      
      // Update capital cost in the selected transaction
      if (data.totalCapitalCost !== undefined) {
        setSelectedTransaction((prev: any) => ({
          ...prev,
          capitalCost: data.totalCapitalCost
        }));
      }
    } catch (error) {
      console.error("Error fetching transaction expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoadingExpenses(false);
    }
  };
  
  // Handle transaction update
  const handleTransactionUpdated = (updatedTransaction: any) => {
    setSelectedTransaction(updatedTransaction);
    onTransactionUpdated(updatedTransaction);
    
    // Refresh expenses after update
    if (updatedTransaction.id) {
      fetchTransactionExpenses(updatedTransaction.id);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          <Tabs value={detailViewTab} onValueChange={setDetailViewTab}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="details">Information</TabsTrigger>
              <TabsTrigger value="expenses">
                Expenses
                {(activeExpenses?.length > 0 || archivedExpenses?.length > 0) && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                    {(selectedTransaction.capitalCost || 0).toLocaleString()}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <div className="max-h-[calc(90vh-150px)] overflow-y-auto py-4">
              <TabsContent value="details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <BasicInfo transaction={selectedTransaction} />
                    <FinancialInfo transaction={selectedTransaction} />
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-6">
                    <BroadcastInfo transaction={selectedTransaction} />
                    {selectedTransaction.vendors && selectedTransaction.vendors.length > 0 && (
                      <div>
                        {/* Render vendors info */}
                      </div>
                    )}
                    <AuditInfo transaction={selectedTransaction} />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="expenses">
                {loadingExpenses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2">Loading expenses...</span>
                  </div>
                ) : (
                  <ExpenseTable 
                    transaction={selectedTransaction}
                    activeExpenses={activeExpenses}
                    archivedExpenses={archivedExpenses}
                    onExpensesUpdated={() => fetchTransactionExpenses(selectedTransaction.id)}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="pt-4 mt-auto border-t flex justify-between items-center">
            <div className="flex gap-2">
              <UpdateStatusDialog
                transaction={selectedTransaction}
                onStatusUpdated={handleTransactionUpdated}
              />
              
              <UpdateTransactionDialog
                transaction={selectedTransaction}
                onTransactionUpdated={handleTransactionUpdated}
              />
            </div>
            
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}