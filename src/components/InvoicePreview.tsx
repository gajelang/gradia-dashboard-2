// src/components/InvoicePreview.tsx
import React from "react";
import { 
  InvoicePreviewProps, 
  formatDate, 
  formatRupiah 
} from "@/lib/invoiceUtils";

export function InvoicePreview({ 
  invoice, 
  companyName = "Your Company Name", 
  companyAddress = "123 Business Street, City, Country 12345", 
  companyEmail = "contact@yourcompany.com", 
  companyPhone = "+123 456 7890" 
}: InvoicePreviewProps) {
  return (
    <div className="bg-white p-6 rounded-lg border">
      {/* Company Information */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-bold">INVOICE</h2>
          <p className="text-gray-600">{invoice.invoiceNumber}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">{companyName}</p>
          <p className="text-sm text-gray-600">{companyAddress}</p>
          <p className="text-sm text-gray-600">{companyEmail}</p>
          <p className="text-sm text-gray-600">{companyPhone}</p>
        </div>
      </div>

      {/* Client Information */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-sm uppercase text-gray-500 mb-1">Billed To:</p>
          <p className="font-semibold">{invoice.client?.name || invoice.clientName || "N/A"}</p>
          <p className="text-sm text-gray-600">{invoice.client?.email || invoice.clientEmail || "N/A"}</p>
          <p className="text-sm text-gray-600">{invoice.client?.phone || invoice.clientPhone || "N/A"}</p>
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
                  <p className="font-medium">{invoice.transaction?.name || invoice.projectName || "Project Services"}</p>
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
          <p>Account Name: {companyName}</p>
        </div>
      </div>

      {/* Notes */}
      <div className="text-sm text-gray-600">
        <p>Thank you for your business. Please make payment by the due date.</p>
        <p>If you have any questions, please contact us at finance@yourcompany.com</p>
      </div>
    </div>
  );
}

export default InvoicePreview;