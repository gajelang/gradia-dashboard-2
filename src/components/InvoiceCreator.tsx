"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Save,
  Loader2,
  SearchIcon
} from "lucide-react";
import { formatRupiah } from "@/lib/formatters";
import { toast } from "react-hot-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// Types
interface Transaction {
  isDeleted: boolean;
  id: string;
  name: string;
  description: string;
  projectValue?: number;
  totalProfit?: number;
  amount?: number;
  paymentStatus: string;
  email?: string;
  phone?: string;
  date: string;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  client?: Client;
}

interface Client {
  isDeleted: boolean;
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function InvoiceCreator() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  // State for transactions and clients
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  // Invoice state
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, "0")}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientId: "",
    projectName: "",
    description: "",
    amount: 0,
    tax: 0,
    totalAmount: 0,
    paymentStatus: "Belum Bayar",
    startDate: "",
    endDate: "",
    transactionId: "",
  });

  // Fetch transactions and clients when the dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
      fetchClients();
    }
  }, [isOpen]);

  // Filter transactions when search query changes
  useEffect(() => {
    if (searchQuery) {
      const filtered = transactions.filter(
        tx => tx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             tx.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions(transactions);
    }
  }, [searchQuery, transactions]);

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const res = await fetchWithAuth("/api/transactions", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      // Only include active transactions with non-empty names
      const activeTransactions = data.filter((tx: Transaction) => !tx.isDeleted && tx.name);
      setTransactions(activeTransactions);
      setFilteredTransactions(activeTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fetch clients
  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const res = await fetchWithAuth("/api/clients", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      // Only include active clients
      const activeClients = data.filter((client: Client) => !client.isDeleted);
      setClients(activeClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoadingClients(false);
    }
  };

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setInvoiceData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      // If amount changes, update tax and totalAmount
      if (name === "amount") {
        const amount = parseFloat(value) || 0;
        const tax = amount * 0.11; // 11% tax
        updated.tax = tax;
        updated.totalAmount = amount + tax;
      }

      return updated;
    });
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setInvoiceData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle transaction selection
  const handleTransactionSelect = (transactionId: string) => {
    const transaction = transactions.find(tx => tx.id === transactionId);
    
    if (transaction) {
      setSelectedTransaction(transactionId);
      
      // Update invoice data with transaction details
      setInvoiceData(prev => ({
        ...prev,
        transactionId: transaction.id,
        projectName: transaction.name,
        description: transaction.description,
        amount: transaction.projectValue || 0,
        tax: (transaction.projectValue || 0) * 0.11,
        totalAmount: (transaction.projectValue || 0) * 1.11,
        startDate: transaction.startDate || "",
        endDate: transaction.endDate || "",
        // If transaction has a client, use their info
        ...(transaction.client ? {
          clientId: transaction.client.id,
          clientName: transaction.client.name,
          clientEmail: transaction.client.email || "",
          clientPhone: transaction.client.phone || ""
        } : {
          clientId: "",
          clientEmail: transaction.email || "",
          clientPhone: transaction.phone || ""
        })
      }));
      
      // If transaction has a client, select that client
      if (transaction.client) {
        setSelectedClient(transaction.client.id);
      } else {
        setSelectedClient("");
      }
    }
  };

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    
    if (client) {
      setSelectedClient(clientId);
      
      // Update invoice data with client details
      setInvoiceData(prev => ({
        ...prev,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email || "",
        clientPhone: client.phone || ""
      }));
    }
  };

  // Function to download invoice as PDF
  // Function to download invoice as PDF with proper A4 proportions
const handleDownloadPDF = async () => {
  if (!invoiceRef.current) return;

  try {
    // Capture invoice element as canvas
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2, // Higher scale for better quality
      logging: false,
      useCORS: true
    });
    
    // A4 dimensions in mm and points (used by jsPDF)
    const a4Width = 210; // mm
    const a4Height = 297; // mm
    
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
    let yPosition = 30; // Leave space at the top for company logo (30mm from top)
    
    // Get canvas data
    const imgData = canvas.toDataURL('image/png');
    
    // Add image to PDF (centered and scaled properly)
    pdf.addImage(imgData, 'PNG', xPosition, yPosition, pdfWidth, pdfHeight);
    
    // Save the PDF
    pdf.save(`${invoiceData.invoiceNumber}.pdf`);

    toast.success("Invoice berhasil diunduh sebagai PDF!");
  } catch (error) {
    console.error("Gagal mengunduh PDF:", error);
    toast.error("Terjadi kesalahan saat mengunduh PDF.");
  }
};

  // Submit invoice
  const handleSubmitInvoice = async () => {
    if (!invoiceData.clientName || !invoiceData.projectName || !invoiceData.amount) {
      toast.error("Client name, project name, dan amount wajib diisi");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare invoice data
      const payload = {
        invoiceNumber: invoiceData.invoiceNumber,
        date: new Date(invoiceData.date).toISOString(),
        dueDate: new Date(invoiceData.dueDate).toISOString(),
        amount: parseFloat(invoiceData.amount.toString()),
        tax: invoiceData.tax,
        totalAmount: invoiceData.totalAmount,
        paymentStatus: invoiceData.paymentStatus,
        description: invoiceData.description,
        clientId: invoiceData.clientId || null,
        transactionId: invoiceData.transactionId || null,
        createdById: user?.userId || null
      };

      // Send to API
      const response = await fetchWithAuth("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create invoice");
      }

      toast.success("Invoice berhasil dibuat!");
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error membuat invoice:", error);
      toast.error("Gagal membuat invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setInvoiceData({
      invoiceNumber: `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1)
        .toString()
        .padStart(2, "0")}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")}`,
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientId: "",
      projectName: "",
      description: "",
      amount: 0,
      tax: 0,
      totalAmount: 0,
      paymentStatus: "Belum Bayar",
      startDate: "",
      endDate: "",
      transactionId: "",
    });

    setSelectedTransaction("");
    setSelectedClient("");
    setActiveTab("details");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Create Invoice
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Create New Invoice
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="project">Select Project</TabsTrigger>
              <TabsTrigger value="details">Invoice Details</TabsTrigger>
              <TabsTrigger value="preview">Preview & Save</TabsTrigger>
            </TabsList>

            {/* Project Selection Tab */}
            <TabsContent value="project" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <SearchIcon className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>

              {loadingTransactions ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading projects...</p>
                </div>
              ) : filteredTransactions.length > 0 ? (
                <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredTransactions.map(transaction => (
                    <div 
                      key={transaction.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTransaction === transaction.id 
                          ? "border-blue-500 bg-blue-50" 
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleTransactionSelect(transaction.id)}
                    >
                      <div className="flex justify-between mb-1">
                        <h3 className="font-medium">{transaction.name}</h3>
                        <span className="text-sm">
                          Rp{formatRupiah(transaction.projectValue || 0)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{transaction.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${
                          transaction.paymentStatus === "Lunas" 
                            ? "bg-green-100 text-green-800" 
                            : transaction.paymentStatus === "DP"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {transaction.paymentStatus}
                        </span>
                        <span className="text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                        {transaction.client && (
                          <span className="text-blue-600">
                            Client: {transaction.client.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p>No projects found. Create a transaction first.</p>
                </div>
              )}

              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setActiveTab("details")}>
                  Skip Selection
                </Button>
                <Button 
                  onClick={() => setActiveTab("details")}
                  disabled={!selectedTransaction}
                >
                  Continue to Details
                </Button>
              </div>
            </TabsContent>

            {/* Invoice Details */}
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    name="invoiceNumber"
                    value={invoiceData.invoiceNumber}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Invoice Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={invoiceData.date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={invoiceData.paymentStatus}
                    onValueChange={(value) =>
                      handleSelectChange("paymentStatus", value)
                    }
                  >
                    <SelectTrigger id="paymentStatus">
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Belum Bayar">
                        Belum Bayar
                      </SelectItem>
                      <SelectItem value="DP">DP</SelectItem>
                      <SelectItem value="Lunas">Lunas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Client Information</h3>
                  {loadingClients ? (
                    <div className="text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : clients.length > 0 && (
                    <Select 
                      value={selectedClient} 
                      onValueChange={handleClientSelect}
                    >
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Select existing client" />
                      </SelectTrigger>
                      <SelectContent>
  <SelectItem value="new">Create new client</SelectItem>
  {clients.map(client => (
    <SelectItem key={client.id} value={client.id}>
      {client.name} ({client.code})
    </SelectItem>
  ))}
</SelectContent>

                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      name="clientName"
                      value={invoiceData.clientName}
                      onChange={handleInputChange}
                      placeholder="Enter client name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Client Email</Label>
                    <Input
                      id="clientEmail"
                      name="clientEmail"
                      type="email"
                      value={invoiceData.clientEmail}
                      onChange={handleInputChange}
                      placeholder="Enter client email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Client Phone</Label>
                    <Input
                      id="clientPhone"
                      name="clientPhone"
                      value={invoiceData.clientPhone}
                      onChange={handleInputChange}
                      placeholder="Enter client phone"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">Project Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input
                      id="projectName"
                      name="projectName"
                      value={invoiceData.projectName}
                      onChange={handleInputChange}
                      placeholder="Enter project name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Project Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={invoiceData.description}
                      onChange={handleInputChange}
                      placeholder="Enter project description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Project Start Date</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      value={invoiceData.startDate}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Project End Date</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="date"
                      value={invoiceData.endDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">Amount</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Base Amount</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      value={invoiceData.amount || ""}
                      onChange={handleInputChange}
                      placeholder="Enter amount"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax">Tax (11%)</Label>
                    <Input
                      id="tax"
                      name="tax"
                      type="number"
                      value={invoiceData.tax || ""}
                      disabled
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="totalAmount">Total Amount</Label>
                    <Input
                      id="totalAmount"
                      name="totalAmount"
                      type="number"
                      value={invoiceData.totalAmount || ""}
                      disabled
                      className="font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setActiveTab("preview")}>
                  Preview Invoice
                </Button>
              </div>
            </TabsContent>

            {/* Preview & Save */}
            <TabsContent value="preview" className="space-y-4">
              <div className="border rounded-md p-6 bg-white" ref={invoiceRef}>
                {/* Invoice Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">
                      INVOICE
                    </h1>
                    <p className="text-sm text-gray-600">
                      {invoiceData.invoiceNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-gray-800">
                      Your Company Name
                    </h2>
                    <p className="text-sm text-gray-600">123 Business Street</p>
                    <p className="text-sm text-gray-600">
                      Jakarta, Indonesia 12345
                    </p>
                    <p className="text-sm text-gray-600">
                      contact@yourcompany.com
                    </p>
                    <p className="text-sm text-gray-600">+62 21 1234 5678</p>
                  </div>
                </div>

                {/* Bill To & Invoice Info */}
                <div className="flex justify-between mb-8">
                  <div className="w-1/2">
                    <h3 className="font-bold text-gray-800 mb-1">Bill To:</h3>
                    <p className="text-sm font-semibold">
                      {invoiceData.clientName}
                    </p>
                    <p className="text-sm text-gray-700">
                      {invoiceData.clientEmail}
                    </p>
                    <p className="text-sm text-gray-700">
                      {invoiceData.clientPhone}
                    </p>
                  </div>
                  <div className="w-1/3">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">Invoice Date:</span>
                      <span>
                        {new Date(invoiceData.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">Due Date:</span>
                      <span>
                        {new Date(invoiceData.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">Project:</span>
                      <span>{invoiceData.projectName}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">Status:</span>
                      <span
                        className={
                          invoiceData.paymentStatus === "Lunas"
                            ? "text-green-600 font-semibold"
                            : invoiceData.paymentStatus === "DP"
                            ? "text-yellow-600 font-semibold"
                            : "text-red-600 font-semibold"
                        }
                      >
                        {invoiceData.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-8">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left py-2 px-4">
                          Description
                        </th>
                        <th className="text-right py-2 px-4">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-4">
                          {invoiceData.projectName} - {invoiceData.description}
                        </td>
                        <td className="py-2 px-4 text-right">
                          Rp{formatRupiah(invoiceData.amount)}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="text-right py-2 px-4">
                          Tax (11%):
                        </td>
                        <td className="text-right py-2 px-4">
                          Rp{formatRupiah(invoiceData.tax)}
                        </td>
                      </tr>
                      <tr className="font-bold">
                        <td className="text-right py-2 px-4">
                          Total Amount:
                        </td>
                        <td className="text-right py-2 px-4">
                          Rp{formatRupiah(invoiceData.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Project Period */}
                {(invoiceData.startDate || invoiceData.endDate) && (
                  <div className="mb-8">
                    <h3 className="font-bold text-gray-800 mb-2">
                      Project Period
                    </h3>
                    <p className="text-sm">
                      {invoiceData.startDate && (
                        <span>
                          Start Date:{" "}
                          {new Date(invoiceData.startDate).toLocaleDateString()}
                        </span>
                      )}
                      {invoiceData.startDate && invoiceData.endDate && (
                        <span> - </span>
                      )}
                      {invoiceData.endDate && (
                        <span>
                          End Date:{" "}
                          {new Date(invoiceData.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Notes and Terms */}
                <div className="mb-8">
                  <h3 className="font-bold text-gray-800 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700">
                    Payment is due within 14 days of invoice date.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 mb-2">
                    Terms and Conditions
                  </h3>
                  <p className="text-sm text-gray-700">
                    Late payment is subject to a 2% monthly interest charge.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("details")}>
                  Back to Details
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleDownloadPDF}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button
                    className="gap-2"
                    onClick={handleSubmitInvoice}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Invoice
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}