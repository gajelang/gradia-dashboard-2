"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api/api";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Loader2, Save } from "lucide-react";
import InvoicePreview from "@/components/invoices/InvoicePreview";
import { Invoice } from "@/lib/formatters/invoiceUtils";

interface EditInvoiceFormProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onInvoiceUpdated: (updatedInvoice: Invoice) => void;
}

export default function EditInvoiceForm({
  invoice,
  isOpen,
  onClose,
  onInvoiceUpdated,
}: EditInvoiceFormProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState(invoice.client?.id || "none");
  const [selectedTransaction, setSelectedTransaction] = useState(invoice.transaction?.id || "none");
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Invoice state
  const [invoiceData, setInvoiceData] = useState({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    date: new Date(invoice.date).toISOString().split("T")[0],
    dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
    clientName: invoice.client?.name || "",
    clientEmail: invoice.client?.email || "",
    clientPhone: invoice.client?.phone || "",
    clientId: invoice.client?.id || "",
    projectName: invoice.transaction?.name || "",
    description: invoice.description || "",
    amount: invoice.amount,
    tax: invoice.tax || 0,
    totalAmount: invoice.totalAmount,
    paymentStatus: invoice.paymentStatus,
    transactionId: invoice.transaction?.id || "",
  });

  // Fetch transactions and clients when the dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
      fetchClients();
    }
  }, [isOpen]);

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setIsLoadingData(true);
      const res = await fetchWithAuth("/api/transactions");
      if (!res.ok) throw new Error("Failed to fetch transactions");

      const data = await res.json();
      setTransactions(data.filter((t: any) => !t.isDeleted));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setIsLoadingData(false);
    }
  };

  // Fetch clients
  const fetchClients = async () => {
    try {
      setIsLoadingData(true);
      const res = await fetchWithAuth("/api/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");

      const data = await res.json();
      setClients(data.filter((c: any) => !c.isDeleted));
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setIsLoadingData(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Special handling for amount to calculate tax and total
    if (name === "amount") {
      const amount = parseFloat(value) || 0;
      const tax = amount * 0.11; // 11% tax
      const totalAmount = amount + tax;

      setInvoiceData({
        ...invoiceData,
        amount,
        tax,
        totalAmount,
      });
    } else {
      setInvoiceData({
        ...invoiceData,
        [name]: value,
      });
    }
  };

  // Handle client selection
  const handleClientChange = (value: string) => {
    setSelectedClient(value);

    if (value === "none") {
      // Clear client data
      setInvoiceData({
        ...invoiceData,
        clientId: "",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
      });
      return;
    }

    const selectedClientData = clients.find((c) => c.id === value);
    if (selectedClientData) {
      setInvoiceData({
        ...invoiceData,
        clientId: selectedClientData.id,
        clientName: selectedClientData.name,
        clientEmail: selectedClientData.email || "",
        clientPhone: selectedClientData.phone || "",
      });
    }
  };

  // Handle transaction selection
  const handleTransactionChange = (value: string) => {
    setSelectedTransaction(value);

    if (value === "none") {
      // Clear transaction data
      setInvoiceData({
        ...invoiceData,
        transactionId: "",
        projectName: "",
      });
      return;
    }

    const selectedTransactionData = transactions.find((t) => t.id === value);
    if (selectedTransactionData) {
      // Update invoice data with transaction details
      setInvoiceData({
        ...invoiceData,
        transactionId: selectedTransactionData.id,
        projectName: selectedTransactionData.name,
        amount: selectedTransactionData.projectValue || 0,
        tax: (selectedTransactionData.projectValue || 0) * 0.11,
        totalAmount: (selectedTransactionData.projectValue || 0) * 1.11,
      });

      // If transaction has a client, update client details too
      if (selectedTransactionData.client) {
        setSelectedClient(selectedTransactionData.client.id);
        setInvoiceData((prev) => ({
          ...prev,
          clientId: selectedTransactionData.client.id,
          clientName: selectedTransactionData.client.name,
          clientEmail: selectedTransactionData.client.email || "",
          clientPhone: selectedTransactionData.client.phone || "",
        }));
      }
    }
  };

  // Handle payment status change
  const handleStatusChange = (value: string) => {
    setInvoiceData({
      ...invoiceData,
      paymentStatus: value,
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate required fields
    if (!invoiceData.invoiceNumber || !invoiceData.date || !invoiceData.dueDate || !invoiceData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare invoice data
      const payload = {
        id: invoiceData.id,
        invoiceNumber: invoiceData.invoiceNumber,
        date: new Date(invoiceData.date).toISOString(),
        dueDate: new Date(invoiceData.dueDate).toISOString(),
        amount: parseFloat(invoiceData.amount.toString()),
        tax: invoiceData.tax,
        totalAmount: invoiceData.totalAmount,
        paymentStatus: invoiceData.paymentStatus,
        description: invoiceData.description,
        clientId: selectedClient === "none" ? null : invoiceData.clientId,
        transactionId: selectedTransaction === "none" ? null : invoiceData.transactionId,
      };

      // Send to API
      const response = await fetchWithAuth("/api/invoices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update invoice");
      }

      const result = await response.json();

      // Show success message
      toast.success("Invoice updated successfully");

      // Call the callback with the updated invoice
      onInvoiceUpdated(result.invoice);

      // Close the dialog
      onClose();
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to update invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Edit Invoice {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="details">Invoice Details</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

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
                <Select value={invoiceData.paymentStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger id="paymentStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Belum Bayar">Belum Bayar</SelectItem>
                    <SelectItem value="DP">DP</SelectItem>
                    <SelectItem value="Lunas">Lunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <h3 className="font-medium">Client Information</h3>
              <div className="space-y-2">
                <Label htmlFor="clientSelect">Select Client</Label>
                <Select value={selectedClient} onValueChange={handleClientChange}>
                  <SelectTrigger id="clientSelect">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    value={invoiceData.clientName}
                    onChange={handleInputChange}
                    disabled={!!selectedClient}
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
                    disabled={!!selectedClient}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Client Phone</Label>
                  <Input
                    id="clientPhone"
                    name="clientPhone"
                    value={invoiceData.clientPhone}
                    onChange={handleInputChange}
                    disabled={!!selectedClient}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <h3 className="font-medium">Project Information</h3>
              <div className="space-y-2">
                <Label htmlFor="transactionSelect">Select Project</Label>
                <Select value={selectedTransaction} onValueChange={handleTransactionChange}>
                  <SelectTrigger id="transactionSelect">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {transactions.map((transaction) => (
                      <SelectItem key={transaction.id} value={transaction.id}>
                        {transaction.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 mt-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  name="projectName"
                  value={invoiceData.projectName}
                  onChange={handleInputChange}
                  disabled={!!selectedTransaction}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={invoiceData.description}
                  onChange={handleInputChange}
                  placeholder="Enter invoice description"
                  rows={3}
                />
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
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview">
            <InvoicePreview
              invoice={{
                id: invoiceData.id,
                invoiceNumber: invoiceData.invoiceNumber,
                date: invoiceData.date,
                dueDate: invoiceData.dueDate,
                amount: invoiceData.amount,
                tax: invoiceData.tax,
                totalAmount: invoiceData.totalAmount,
                paymentStatus: invoiceData.paymentStatus,
                description: invoiceData.description,
                client: {
                  id: invoiceData.clientId,
                  code: "",
                  name: invoiceData.clientName,
                  email: invoiceData.clientEmail,
                  phone: invoiceData.clientPhone,
                },
                transaction: {
                  id: invoiceData.transactionId,
                  name: invoiceData.projectName,
                },
              }}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

