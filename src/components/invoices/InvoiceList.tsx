// src/components/invoices/InvoiceList.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileText,
  MoreHorizontal,
  Download,
  Trash2,
  Edit,
  Eye,
  Loader2,
  Filter,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api/api";
import { useRouter } from "next/navigation";
import InvoiceDetail from "@/components/invoices/InvoiceDetail";
import {
  Invoice,
  formatDate,
  formatRupiah,
  getStatusColor
} from "@/lib/formatters/invoiceUtils";

export default function InvoiceList() {
  const router = useRouter();

  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<{
    month: number | null;
    year: number | null;
  }>({
    month: null,
    year: null,
  });
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [newStatus, setNewStatus] = useState("");

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Invoice detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch invoices from API
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/invoices", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch invoices");

      const data = await res.json();
      setInvoices(data);
      setFilteredInvoices(data);

      // Extract years for filtering
      const yearsSet = new Set<number>();
      data.forEach((invoice: Invoice) => {
        const date = new Date(invoice.date);
        yearsSet.add(date.getFullYear());
      });

      // Convert to array and sort
      const yearArray = Array.from(yearsSet).sort((a, b) => b - a);
      setAvailableYears(yearArray);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filter invoices based on search, status, and date
  useEffect(() => {
    let filtered = [...invoices];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(term) ||
          (invoice.client?.name || "").toLowerCase().includes(term) ||
          (invoice.transaction?.name || "").toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (invoice) => invoice.paymentStatus === statusFilter
      );
    }

    // Date filter
    if (dateFilter.month !== null || dateFilter.year !== null) {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.date);
        const month = invoiceDate.getMonth();
        const year = invoiceDate.getFullYear();

        if (dateFilter.month !== null && dateFilter.year !== null) {
          return month === dateFilter.month && year === dateFilter.year;
        } else if (dateFilter.month !== null) {
          return month === dateFilter.month;
        } else if (dateFilter.year !== null) {
          return year === dateFilter.year;
        }
        return true;
      });
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchTerm, statusFilter, dateFilter]);

  // Handle invoice status update
  const handleUpdateInvoiceStatus = async () => {
    if (!currentInvoice || !newStatus) return;

    try {
      const res = await fetchWithAuth("/api/invoices", {
        method: "PATCH",
        body: JSON.stringify({
          id: currentInvoice.id,
          paymentStatus: newStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to update invoice status");

      const data = await res.json();

      // Update local data
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === currentInvoice.id ? data.invoice : inv
        )
      );

      toast.success("Invoice status updated successfully");
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast.error("Failed to update invoice status");
    }
  };

  // Handle invoice deletion
  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      const res = await fetchWithAuth(`/api/invoices/${invoiceToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete invoice");

      // Remove from local data
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceToDelete.id));

      toast.success("Invoice deleted successfully");
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  // Handle invoice view
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  // Handle edit invoice
  const handleEditInvoice = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setNewStatus(invoice.paymentStatus);
    setEditDialogOpen(true);
    setDetailDialogOpen(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter({ month: null, year: null });
  };

  // Month names for filter dropdown
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Invoice Management</h2>

        <Button onClick={() => router.push('/invoices/create')}>
          <FileText className="mr-2 h-4 w-4" />
          Create New Invoice
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Filters:</span>
          </div>

          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Lunas">Lunas</SelectItem>
              <SelectItem value="DP">DP</SelectItem>
              <SelectItem value="Belum Bayar">Belum Bayar</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={dateFilter.month?.toString() || "all"}
            onValueChange={(value) =>
              setDateFilter((prev) => ({
                ...prev,
                month: value === "all" ? null : parseInt(value),
              }))
            }
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {monthNames.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={dateFilter.year?.toString() || "all"}
            onValueChange={(value) =>
              setDateFilter((prev) => ({
                ...prev,
                year: value === "all" ? null : parseInt(value),
              }))
            }
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchTerm || statusFilter !== "all"|| dateFilter.month !== null || dateFilter.year !== null) && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableCaption>
            {loading
              ? "Loading invoices..."
              : filteredInvoices.length === 0
              ? "No invoices found"
              : `Total ${filteredInvoices.length} invoices`}
          </TableCaption>

          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleViewInvoice(invoice)}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.client?.name || "-"}</TableCell>
                  <TableCell>{invoice.transaction?.name || "-"}</TableCell>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(invoice.totalAmount)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(invoice.paymentStatus)}`}>
                      {invoice.paymentStatus}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setCurrentInvoice(invoice);
                          setNewStatus(invoice.paymentStatus);
                          setEditDialogOpen(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Update Status
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setInvoiceToDelete(invoice);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Invoice Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Invoice: {currentInvoice?.invoiceNumber}</p>
              <p className="text-sm font-medium">Current Status:</p>
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                getStatusColor(currentInvoice?.paymentStatus || "Belum Bayar")
              }`}>
                {currentInvoice?.paymentStatus}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">New Status:</label>
              <Select
                value={newStatus}
                onValueChange={setNewStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Belum Bayar">Belum Bayar</SelectItem>
                  <SelectItem value="DP">DP</SelectItem>
                  <SelectItem value="Lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateInvoiceStatus}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice {invoiceToDelete?.invoiceNumber}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvoice}
              className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Detail Dialog */}
      <InvoiceDetail
        invoice={selectedInvoice}
        isOpen={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
      />
    </div>
  );
}
