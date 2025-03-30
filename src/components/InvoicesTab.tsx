// src/components/InvoicesTab.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ExternalLink,
  Loader2,
  PlusCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api";
import { useRouter } from "next/navigation";
import InvoiceDetail from "./InvoiceDetail";
import { formatRupiah, formatDate, getStatusColor, Invoice } from "@/lib/invoiceUtils";

interface InvoicesTabProps {
  transaction: any;
}

export default function InvoicesTab({ transaction }: InvoicesTabProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch invoices related to this transaction
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!transaction?.id) return;
      
      try {
        setLoading(true);
        const res = await fetchWithAuth(`/api/invoices?transactionId=${transaction.id}`, {
          cache: "no-store",
        });
        
        if (!res.ok) throw new Error("Failed to fetch invoices");
        
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        toast.error("Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [transaction]);

  // Handle navigation to create invoice page
  const handleCreateInvoice = () => {
    // We'll use a query parameter to pre-fill the invoice form
    router.push(`/invoices/create?transactionId=${transaction.id}`);
  };

  // Handle view invoice
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Transaction Invoices</h3>
        <Button 
          size="sm" 
          onClick={handleCreateInvoice}
          className="flex items-center gap-1"
        >
          <PlusCircle className="h-4 w-4" /> Create Invoice
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-muted-foreground">No invoices created for this transaction</p>
          <Button 
            variant="outline"
            className="mt-4"
            onClick={handleCreateInvoice}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Create First Invoice
          </Button>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell className="text-right">
                    Rp{formatRupiah(invoice.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(invoice.paymentStatus)}`}>
                      {invoice.paymentStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invoice Detail Dialog */}
      <InvoiceDetail
        invoice={selectedInvoice}
        isOpen={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
      />
    </div>
  );
}