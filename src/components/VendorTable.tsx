"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "react-hot-toast";
import {
  Search,
  Loader2,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  User,
  Clock
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface Vendor {
  id: string;
  name: string;
  serviceDesc: string;
  email?: string;
  phone?: string;
  address?: string;
  isDeleted?: boolean;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    name: string;
    email: string;
  };
  deletedBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export default function VendorTable() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "deleted">("active");
  
  // State for add/edit vendor dialog
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [vendorFormData, setVendorFormData] = useState<Omit<Vendor, 'id'>>({
    name: "",
    serviceDesc: "",
    email: "",
    phone: "",
    address: "",
  });
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  
  // State for delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  
  // State for restore dialog
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [vendorToRestore, setVendorToRestore] = useState<Vendor | null>(null);

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const queryParam = viewMode === "deleted" ? "?deleted=true" : "";
      const res = await fetchWithAuth(`/api/vendors${queryParam}`, { cache: "no-store" });
      
      if (!res.ok) {
        throw new Error("Failed to fetch vendors");
      }
      
      const data = await res.json();
      setVendors(data);
      setFilteredVendors(data);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Failed to load vendors");
      setVendors([]);
      setFilteredVendors([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    fetchVendors();
  }, [viewMode, fetchVendors]);

  // Search vendors
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredVendors(vendors);
      return;
    }
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    const results = vendors.filter(vendor => 
      vendor.name.toLowerCase().includes(lowerCaseSearch) ||
      vendor.serviceDesc.toLowerCase().includes(lowerCaseSearch) ||
      (vendor.email && vendor.email.toLowerCase().includes(lowerCaseSearch)) ||
      (vendor.phone && vendor.phone.toLowerCase().includes(lowerCaseSearch))
    );
    
    setFilteredVendors(results);
  };

  // Reset vendor form
  const resetVendorForm = () => {
    setVendorFormData({
      name: "",
      serviceDesc: "",
      email: "",
      phone: "",
      address: "",
    });
    setVendorToEdit(null);
    setIsEditMode(false);
  };

  // Handle dialog open for adding new vendor
  const handleAddVendor = () => {
    resetVendorForm();
    setIsEditMode(false);
    setIsVendorDialogOpen(true);
  };

  // Handle dialog open for editing vendor
  const handleEditVendor = (vendor: Vendor) => {
    setVendorToEdit(vendor);
    setVendorFormData({
      name: vendor.name,
      serviceDesc: vendor.serviceDesc,
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
    });
    setIsEditMode(true);
    setIsVendorDialogOpen(true);
  };

  // Handle form changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVendorFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit vendor form (add or edit)
  const handleSubmitVendor = async () => {
    // Validate form
    if (!vendorFormData.name || !vendorFormData.serviceDesc) {
      toast.error("Vendor name and service description are required");
      return;
    }
    
    try {
      if (isEditMode && vendorToEdit) {
        // Update existing vendor
        const res = await fetchWithAuth(`/api/vendors/${vendorToEdit.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...vendorFormData,
            updatedById: user?.userId
          }),
        });
        
        if (!res.ok) {
          throw new Error("Failed to update vendor");
        }
        
        const updatedVendor = await res.json();
        
        // Update state
        setVendors(prev => prev.map(v => 
          v.id === updatedVendor.id ? updatedVendor : v
        ));
        setFilteredVendors(prev => prev.map(v => 
          v.id === updatedVendor.id ? updatedVendor : v
        ));
        
        toast.success("Vendor updated successfully");
      } else {
        // Add new vendor
        const res = await fetchWithAuth("/api/vendors", {
          method: "POST",
          body: JSON.stringify({
            ...vendorFormData,
            createdById: user?.userId
          }),
        });
        
        if (!res.ok) {
          throw new Error("Failed to create vendor");
        }
        
        const newVendor = await res.json();
        
        // Update state
        setVendors(prev => [...prev, newVendor]);
        setFilteredVendors(prev => [...prev, newVendor]);
        
        toast.success("Vendor created successfully");
      }
      
      // Close dialog and reset form
      setIsVendorDialogOpen(false);
      resetVendorForm();
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast.error("Failed to save vendor");
    }
  };

  // Handle soft delete
  const handleDeleteClick = (vendor: Vendor) => {
    setVendorToDelete(vendor);
    setConfirmDeleteText("");
    setIsDeleteDialogOpen(true);
  };

  const handleSoftDelete = async () => {
    if (!vendorToDelete || confirmDeleteText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    
    try {
      const res = await fetchWithAuth("/api/vendors/softDelete", {
        method: "POST",
        body: JSON.stringify({
          id: vendorToDelete.id,
          deletedById: user?.userId
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to archive vendor");
      }
      
      // Update state
      setVendors(prev => prev.filter(v => v.id !== vendorToDelete.id));
      setFilteredVendors(prev => prev.filter(v => v.id !== vendorToDelete.id));
      
      setIsDeleteDialogOpen(false);
      setVendorToDelete(null);
      setConfirmDeleteText("");
      
      toast.success("Vendor archived successfully");
    } catch (error) {
      console.error("Error archiving vendor:", error);
      toast.error("Failed to archive vendor");
    }
  };

  // Handle restore
  const handleRestoreClick = (vendor: Vendor) => {
    setVendorToRestore(vendor);
    setIsRestoreDialogOpen(true);
  };

  const handleRestore = async () => {
    if (!vendorToRestore) return;
    
    try {
      const res = await fetchWithAuth("/api/vendors/restore", {
        method: "POST",
        body: JSON.stringify({
          id: vendorToRestore.id,
          restoredById: user?.userId
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to restore vendor");
      }
      
      // Update state
      setVendors(prev => prev.filter(v => v.id !== vendorToRestore.id));
      setFilteredVendors(prev => prev.filter(v => v.id !== vendorToRestore.id));
      
      setIsRestoreDialogOpen(false);
      setVendorToRestore(null);
      
      toast.success("Vendor restored successfully");
    } catch (error) {
      console.error("Error restoring vendor:", error);
      toast.error("Failed to restore vendor");
    }
  };

  // Format datetime with time
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Vendors / Subcontractors</h2>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === "active" ? "default" : "outline"}
            onClick={() => setViewMode("active")}
            className="flex items-center gap-1"
          >
            <Eye className="h-4 w-4" />
            Active
          </Button>
          <Button 
            variant={viewMode === "deleted" ? "default" : "outline"}
            onClick={() => setViewMode("deleted")}
            className="flex items-center gap-1"
          >
            <EyeOff className="h-4 w-4" />
            Archived
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>
        
        {viewMode === "active" && (
          <Button onClick={handleAddVendor} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Add Vendor
          </Button>
        )}
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2">Loading vendors...</span>
        </div>
      )}
      
      {/* Vendors table */}
      {!loading && (
        <div className="border rounded-md">
          <Table>
            <TableCaption>
              {viewMode === "active" ? "List of active vendors/subcontractors" : "List of archived vendors/subcontractors"}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Audit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length > 0 ? (
                filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id} className={vendor.isDeleted ? "bg-gray-50" : ""}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>
                      <div className="max-w-[250px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-start gap-1">
                                <Briefcase className="h-4 w-4 mt-0.5 text-gray-600 shrink-0" />
                                <p className="truncate">{vendor.serviceDesc}</p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{vendor.serviceDesc}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {vendor.email && (
                          <div className="flex items-center text-xs">
                            <Mail className="h-3 w-3 mr-1 text-gray-500" />
                            <span>{vendor.email}</span>
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center text-xs">
                            <Phone className="h-3 w-3 mr-1 text-gray-500" />
                            <span>{vendor.phone}</span>
                          </div>
                        )}
                        {vendor.address && (
                          <div className="flex items-center text-xs">
                            <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                            <span className="truncate max-w-[200px]">{vendor.address}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{vendor.createdBy?.name || "Unknown"}</span>
                        </div>
                        {vendor.createdAt && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatDateTime(vendor.createdAt)}</span>
                          </div>
                        )}
                        {vendor.isDeleted && vendor.deletedBy && (
                          <Badge variant="outline" className="bg-red-50 text-red-800 text-xs mt-1">
                            Archived by {vendor.deletedBy.name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {viewMode === "active" ? (
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditVendor(vendor)}
                            className="h-8 px-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteClick(vendor)}
                            className="h-8 px-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRestoreClick(vendor)}
                          className="h-8 px-2 text-green-600"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    {viewMode === "active" 
                      ? "No active vendors found" 
                      : "No archived vendors found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Add/Edit Vendor Dialog */}
      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update vendor information" 
                : "Fill in the details to create a new vendor/subcontractor"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vendor Name</label>
              <Input
                name="name"
                value={vendorFormData.name}
                onChange={handleFormChange}
                placeholder="Vendor name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Description</label>
              <Textarea
                name="serviceDesc"
                value={vendorFormData.serviceDesc}
                onChange={handleFormChange}
                placeholder="Describe services provided by this vendor"
                required
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                name="email"
                type="email"
                value={vendorFormData.email}
                onChange={handleFormChange}
                placeholder="Email address"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                name="phone"
                value={vendorFormData.phone}
                onChange={handleFormChange}
                placeholder="Phone number"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                name="address"
                value={vendorFormData.address}
                onChange={handleFormChange}
                placeholder="Address"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVendorDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitVendor}>
              {isEditMode ? "Update Vendor" : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Vendor</DialogTitle>
            <DialogDescription>
              This vendor will be archived. You can restore it later if needed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-2 font-medium">Vendor: {vendorToDelete?.name}</p>
            <p className="mb-4 text-sm text-muted-foreground">Type "DELETE" to confirm.</p>
            <Input
              value={confirmDeleteText}
              onChange={(e) => setConfirmDeleteText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSoftDelete}
              disabled={confirmDeleteText !== "DELETE"}
            >
              Archive Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore Vendor</DialogTitle>
            <DialogDescription>
              This vendor will be restored and will appear in the active list again.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p>Are you sure you want to restore vendor "{vendorToRestore?.name}"?</p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestore}>
              Restore Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}