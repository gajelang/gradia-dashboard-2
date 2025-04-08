// src/lib/invoiceUtils.ts
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { RefObject } from "react";
import { formatRupiah as formatRupiahUtil } from './formatters';

// Re-export formatRupiah for backward compatibility
export const formatRupiah = formatRupiahUtil;

// Types
export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  tax?: number;
  totalAmount: number;
  paymentStatus: string;
  description?: string;
  client?: Client;
  transaction?: Transaction;
  createdBy?: User;
  createdAt?: string;
  updatedAt?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectName?: string;
}

export interface Client {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Transaction {
  id: string;
  name: string;
  description?: string;
  projectValue?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface InvoicePreviewProps {
  invoice: Invoice;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
}

// Formatting functions
export const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Use formatRupiah from formatters.ts

export const getStatusColor = (status: string) => {
  switch (status) {
    case "Lunas":
      return "bg-green-100 text-green-800";
    case "DP":
      return "bg-yellow-100 text-yellow-800";
    case "Belum Bayar":
    default:
      return "bg-red-100 text-red-800";
  }
};

// PDF generation functions
// PDF generation functions
export const generateInvoicePDF = async (
  invoiceRef: React.RefObject<HTMLDivElement | null>,
  fileName: string
): Promise<boolean> => {
  if (!invoiceRef.current) {
    throw new Error("Invoice reference is not available");
  }

  try {
    // Capture invoice element as canvas
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2, // Higher scale for better quality
      logging: false,
      useCORS: true
    });

    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;

    // Create PDF with A4 size
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Get the dimensions of the canvas
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate the aspect ratio
    const aspectRatio = canvasWidth / canvasHeight;

    // Calculate dimensions to fit within A4 without stretching
    let pdfWidth = a4Width;
    let pdfHeight = pdfWidth / aspectRatio;

    // If the calculated height is greater than A4 height, adjust
    if (pdfHeight > a4Height) {
      pdfHeight = a4Height;
      pdfWidth = pdfHeight * aspectRatio;
    }

    // Calculate centering position
    const xPosition = (a4Width - pdfWidth) / 2;
    const yPosition = 15; // 15mm from top

    // Get canvas data
    const imgData = canvas.toDataURL('image/png');

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', xPosition, yPosition, pdfWidth, pdfHeight);

    // Save the PDF
    pdf.save(fileName);

    return true;
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return false;
  }
};