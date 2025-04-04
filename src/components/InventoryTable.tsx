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
  // Removed unused DialogTrigger
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
  // Removed unused Info
  User,
  Clock
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface Client {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
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

export default function ClientTable() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "deleted">("active");
  
  // State for add/edit client dialog
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [clientFormData, setClientFormData] = useState<Omit<Client, 'id'>>({
    code: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    description: "",
  });
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  
  // State for delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  
  // State for restore dialog
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [clientToRestore, setClientToRestore] = useState<Client | null>(null);

  // Define fetchClients with useCallback to avoid dependency issues
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const queryParam = viewMode === "deleted" ? "?deleted=true" : "";
      const res = await fetchWithAuth(`/api/clients${queryParam}`, { cache: "no-store" });
      
      if (!res.ok) {
        throw new Error("Failed to fetch clients");
      }
      
      const data = await res.json();
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
      setClients([]);
      setFilteredClients([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode]); // Add viewMode as dependency

  // Fetch clients
  useEffect(() => {
    fetchClients();
  }, [fetchClients]); // Now fetchClients is properly defined before being used

  // Search clients
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    const results = clients.filter(client => 
      client.code.toLowerCase().includes(lowerCaseSearch) ||
      client.name.toLowerCase().includes(lowerCaseSearch) ||
      (client.email && client.email.toLowerCase().includes(lowerCaseSearch)) ||
      (client.phone && client.phone.toLowerCase().includes(lowerCaseSearch)) ||
      (client.description && client.description.toLowerCase().includes(lowerCaseSearch))
    );
    
    setFilteredClients(results);
  };

  // Reset client form
  const resetClientForm = () => {
    setClientFormData({
      code: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      description: "",
    });
    setClientToEdit(null);
    setIsEditMode(false);
  };

  // Handle dialog open for adding new client
  const handleAddClient = () => {
    resetClientForm();
    setIsEditMode(false);
    setIsClientDialogOpen(true);
  };

  // Handle dialog open for editing client
  const handleEditClient = (client: Client) => {
    setClientToEdit(client);
    setClientFormData({
      code: client.code,
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      description: client.description || "",
    });
    setIsEditMode(true);
    setIsClientDialogOpen(true);
  };

  // Handle form changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setClientFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit client form (add or edit)
  const handleSubmitClient = async () => {
    // Validate form
    if (!clientFormData.code || !clientFormData.name) {
      toast.error("Client code and name are required");
      return;
    }
    
    try {
      if (isEditMode && clientToEdit) {
        // Update existing client
        const res = await fetchWithAuth(`/api/clients/${clientToEdit.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...clientFormData,
            updatedById: user?.userId
          }),
        });
        
        if (!res.ok) {
          throw new Error("Failed to update client");
        }
        
        const updatedClient = await res.json();
        
        // Update state
        setClients(prev => prev.map(c => 
          c.id === updatedClient.id ? updatedClient : c
        ));
        setFilteredClients(prev => prev.map(c => 
          c.id === updatedClient.id ? updatedClient : c
        ));
        
        toast.success("Client updated successfully");
      } else {
        // Add new client
        const res = await fetchWithAuth("/api/clients", {
          method: "POST",
          body: JSON.stringify({
            ...clientFormData,
            createdById: user?.userId
          }),
        });
        
        if (!res.ok) {
          throw new Error("Failed to create client");
        }
        
        const newClient = await res.json();
        
        // Update state
        setClients(prev => [...prev, newClient]);
        setFilteredClients(prev => [...prev, newClient]);
        
        toast.success("Client created successfully");
      }
      
      // Close dialog and reset form
      setIsClientDialogOpen(false);
      resetClientForm();
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Failed to save client");
    }
  };

  // Handle soft delete
  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setConfirmDeleteText("");
    setIsDeleteDialogOpen(true);
  };

  const handleSoftDelete = async () => {
    if (!clientToDelete || confirmDeleteText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    
    try {
      const res = await fetchWithAuth("/api/clients/softDelete", {
        method: "POST",
        body: JSON.stringify({
          id: clientToDelete.id,
          deletedById: user?.userId
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to archive client");
      }
      
      // Update state
      setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
      setFilteredClients(prev => prev.filter(c => c.id !== clientToDelete.id));
      
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      setConfirmDeleteText("");
      
      toast.success("Client archived successfully");
    } catch (error) {
      console.error("Error archiving client:", error);
      toast.error("Failed to archive client");
    }
  };

  // Handle restore
  const handleRestoreClick = (client: Client) => {
    setClientToRestore(client);
    setIsRestoreDialogOpen(true);
  };

  const handleRestore = async () => {
    if (!clientToRestore) return;
    
    try {
      const res = await fetchWithAuth("/api/clients/restore", {
        method: "POST",
        body: JSON.stringify({
          id: clientToRestore.id,
          restoredById: user?.userId
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to restore client");
      }
      
      // Update state
      setClients(prev => prev.filter(c => c.id !== clientToRestore.id));
      setFilteredClients(prev => prev.filter(c => c.id !== clientToRestore.id));
      
      setIsRestoreDialogOpen(false);
      setClientToRestore(null);
      
      toast.success("Client restored successfully");
    } catch (error) {
      console.error("Error restoring client:", error);
      toast.error("Failed to restore client");
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
        <h2 className="text-xl font-semibold">Clients</h2>
        
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
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>
        
        {viewMode === "active" && (
          <Button onClick={handleAddClient} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        )}
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2">Loading clients...</span>
        </div>
      )}
      
      {/* Clients table */}
      {!loading && (
        <div className="border rounded-md">
          <Table>
            <TableCaption>
              {viewMode === "active" ? "List of active clients" : "List of archived clients"}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Client Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Audit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className={client.isDeleted ? "bg-gray-50" : ""}>
                    <TableCell className="font-medium">{client.code}</TableCell>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {client.email && (
                          <div className="flex items-center text-xs">
                            <Mail className="h-3 w-3 mr-1 text-gray-500" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center text-xs">
                            <Phone className="h-3 w-3 mr-1 text-gray-500" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-center text-xs">
                            <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                            <span className="truncate max-w-[200px]">{client.address}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="truncate">
                                {client.description || "No description"}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{client.description || "No description"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{client.createdBy?.name || "Unknown"}</span>
                        </div>
                        {client.createdAt && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatDateTime(client.createdAt)}</span>
                          </div>
                        )}
                        {client.isDeleted && client.deletedBy && (
                          <Badge variant="outline" className="bg-red-50 text-red-800 text-xs mt-1">
                            Archived by {client.deletedBy.name}
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
                            onClick={() => handleEditClient(client)}
                            className="h-8 px-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteClick(client)}
                            className="h-8 px-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRestoreClick(client)}
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
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    {viewMode === "active" 
                      ? "No active clients found" 
                      : "No archived clients found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Add/Edit Client Dialog */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Client" : "Add New Client"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update client information" 
                : "Fill in the details to create a new client"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Code</label>
                <Input
                  name="code"
                  value={clientFormData.code}
                  onChange={handleFormChange}
                  placeholder="Unique client code"
                  required
                  disabled={isEditMode} // Don't allow changing code in edit mode
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Name</label>
                <Input
                  name="name"
                  value={clientFormData.name}
                  onChange={handleFormChange}
                  placeholder="Client name"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                name="email"
                type="email"
                value={clientFormData.email}
                onChange={handleFormChange}
                placeholder="Email address"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                name="phone"
                value={clientFormData.phone}
                onChange={handleFormChange}
                placeholder="Phone number"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                name="address"
                value={clientFormData.address}
                onChange={handleFormChange}
                placeholder="Address"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                name="description"
                value={clientFormData.description}
                onChange={handleFormChange}
                placeholder="Brief description"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClientDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitClient}>
              {isEditMode ? "Update Client" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Client</DialogTitle>
            <DialogDescription>
              This client will be archived. You can restore it later if needed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-2 font-medium">Client: {clientToDelete?.name} ({clientToDelete?.code})</p>
            <p className="mb-4 text-sm text-muted-foreground">Type &quot;DELETE&quot; to confirm.</p>
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
              Archive Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore Client</DialogTitle>
            <DialogDescription>
              This client will be restored and will appear in the active list again.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p>Are you sure you want to restore client &quot;{clientToRestore?.name}&quot;?</p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestore}>
              Restore Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}