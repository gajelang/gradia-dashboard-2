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
  DialogDescription,
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
  Link as LinkIcon,
  Eye,
  Loader2,
  Calendar,
  Filter,
  X,
} from "lucide-react";
import { formatRupiah } from "@/lib/formatters";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api";

const InvoiceList = () => {
  // State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<any[]>([]);
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
  
  // Edit invoice status dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  
  // View invoice dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

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
      // Fix: Use a Set with explicit number type and convert to array
      const yearsSet = new Set<number>();
      data.forEach((invoice: any) => {
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

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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

  // Handle invoice download (simple version - redirects to create invoice with data)
  const handleDownloadInvoice = (invoice: any) => {
    // This is a simple implementation - in a full solution you would use
    // similar PDF generation as in InvoiceCreator component
    
    // For now, we'll just show a toast message
    toast.success(`Downloading invoice ${invoice.invoiceNumber}...`);
    
    // Here you would normally:
    // 1. Fetch the full invoice data if needed
    // 2. Generate the PDF using similar code to InvoiceCreator
    // 3. Trigger the download
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter({ month: null, year: null });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
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

  // Month names for filter dropdown
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Invoice Management</h2>
        
        <Button onClick={() => {/* Navigate to create invoice */}}>
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
          
          {(searchTerm || statusFilter !== "all" || dateFilter.month !== null || dateFilter.year !== null) && (
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
                <TableRow key={invoice.id} className="cursor-pointer hover:bg-gray-50" onClick={() => {
                  setSelectedInvoice(invoice);
                  setViewDialogOpen(true);
                }}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.client?.name || "-"}</TableCell>
                  <TableCell>{invoice.transaction?.name || "-"}</TableCell>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell className="text-right">Rp{formatRupiah(invoice.totalAmount)}</TableCell>
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
                        <DropdownMenuItem onClick={() => {
                          setSelectedInvoice(invoice);
                          setViewDialogOpen(true);
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
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
            <DialogDescription>
              Change the payment status for invoice {currentInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
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

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">INVOICE</h2>
                  <p className="text-sm text-gray-600">
                    {selectedInvoice.invoiceNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">Status:</p>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    getStatusColor(selectedInvoice.paymentStatus)
                  }`}>
                    {selectedInvoice.paymentStatus}
                  </span>
                </div>
              </div>
              
              {/* Client and Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Client:</h3>
                  <p>{selectedInvoice.client?.name || "-"}</p>
                  <p className="text-sm">{selectedInvoice.client?.email || "-"}</p>
                  <p className="text-sm">{selectedInvoice.client?.phone || "-"}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Invoice Date:</span>
                    <span>{formatDate(selectedInvoice.date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Due Date:</span>
                    <span>{formatDate(selectedInvoice.dueDate)}</span>
                  </div>
                  {selectedInvoice.transaction && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Project:</span>
                      <span>{selectedInvoice.transaction.name}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Invoice Details */}
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {selectedInvoice.description || "Project services"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        Rp{formatRupiah(selectedInvoice.amount)}
                      </td>
                    </tr>
                    {selectedInvoice.tax > 0 && (
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          Tax (11%)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          Rp{formatRupiah(selectedInvoice.tax)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-sm font-medium">
                        Total:
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium">
                        Rp{formatRupiah(selectedInvoice.totalAmount)}
                      </th>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setCurrentInvoice(selectedInvoice);
                    setNewStatus(selectedInvoice.paymentStatus);
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceList;