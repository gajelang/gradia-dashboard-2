// src/components/InvoiceDetail.tsx
"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate, formatRupiah, getStatusColor, Invoice, generateInvoicePDF } from "@/lib/invoiceUtils";
import { Download, Edit, Loader2, Printer } from "lucide-react";
import { toast } from "react-hot-toast";

interface InvoiceDetailProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (invoice: Invoice) => void;
}

export default function InvoiceDetail({
  invoice,
  isOpen,
  onClose,
  onEdit,
}: InvoiceDetailProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;

    setIsDownloading(true);
    try {
      const fileName = `${invoice.invoiceNumber}.pdf`;
      const success = await generateInvoicePDF(invoiceRef, fileName);
      
      if (success) {
        toast.success("Invoice downloaded successfully!");
      } else {
        throw new Error("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast.error("An error occurred while generating the PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle print invoice
  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex justify-between items-center">
            Invoice {invoice.invoiceNumber}
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(invoice.paymentStatus)}`}>
              {invoice.paymentStatus}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div ref={invoiceRef} className="bg-white p-6 rounded-lg">
          {/* Company Information */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold">INVOICE</h2>
              <p className="text-gray-600">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">Your Company Name</p>
              <p className="text-sm text-gray-600">123 Business Street</p>
              <p className="text-sm text-gray-600">City, Country 12345</p>
              <p className="text-sm text-gray-600">contact@yourcompany.com</p>
              <p className="text-sm text-gray-600">+123 456 7890</p>
            </div>
          </div>

          {/* Client Information */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-sm uppercase text-gray-500 mb-1">Billed To:</p>
              <p className="font-semibold">{invoice.client?.name || "N/A"}</p>
              <p className="text-sm text-gray-600">{invoice.client?.email || "N/A"}</p>
              <p className="text-sm text-gray-600">{invoice.client?.phone || "N/A"}</p>
              <p className="text-sm text-gray-600">{invoice.client?.address || "N/A"}</p>
            </div>
            <div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm uppercase text-gray-500 mb-1">Invoice Date:</p>
                  <p className="text-sm">{formatDate(invoice.date)}</p>
                </div>
                <div>
                  <p className="text-sm uppercase text-gray-500 mb-1">Due Date:</p>
                  <p className="text-sm">{formatDate(invoice.dueDate)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Project Information */}
          <div className="mb-8">
            <h3 className="font-semibold mb-2">Project Details</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-4 py-3">
                      <p className="font-medium">{invoice.transaction?.name || "Project Services"}</p>
                      <p className="text-gray-600 text-sm">{invoice.description || "Professional services as agreed"}</p>
                    </td>
                    <td className="px-4 py-3 text-right">Rp{formatRupiah(invoice.amount)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 text-right font-medium">Subtotal</td>
                    <td className="px-4 py-3 text-right">Rp{formatRupiah(invoice.amount)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-right font-medium">Tax (11%)</td>
                    <td className="px-4 py-3 text-right">Rp{formatRupiah(invoice.tax || 0)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="px-4 py-3 text-right">Total</td>
                    <td className="px-4 py-3 text-right">Rp{formatRupiah(invoice.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-8">
            <h3 className="font-semibold mb-2">Payment Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-2">Please make payment to:</p>
              <p className="font-medium">Bank Transfer</p>
              <p>Bank: Your Bank Name</p>
              <p>Account: 1234-5678-9012</p>
              <p>Account Name: Your Company Name</p>
            </div>
          </div>

          {/* Notes */}
          <div className="text-sm text-gray-600">
            <p>Thank you for your business. Please make payment by the due date.</p>
            <p>If you have any questions, please contact us at finance@yourcompany.com</p>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePrintInvoice}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
            {onEdit && (
              <Button
                className="gap-2"
                onClick={() => onEdit(invoice)}
              >
                <Edit className="h-4 w-4" />
                Edit Invoice
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}