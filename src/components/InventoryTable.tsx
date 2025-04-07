"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import {
  Search,
  Loader2,
  Plus,
  Edit,
  Archive,
  RefreshCw,
  Package2,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/formatters";
import { Inventory } from "@/app/types/inventory";
import { Input } from "./ui/input";

export interface InventoryTableProps {
  inventory: Inventory[];
  isLoading: boolean;
  categories: string[];
  categoryFilter: string | null;
  searchTerm: string;
  isArchived?: boolean;
  onUpdate?: (updatedItem: Inventory) => void;
  onArchive?: (archivedItem: Inventory) => void;
  onRestore?: (restoredItem: Inventory) => void;
}

export default function InventoryTable({
  inventory,
  isLoading,
  categories,
  categoryFilter,
  searchTerm,
  isArchived = false,
  onUpdate,
  onArchive,
  onRestore
}: InventoryTableProps) {
  const { user } = useAuth();
  const [filteredInventory, setFilteredInventory] = useState<Inventory[]>(inventory);

  // State for edit inventory dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Inventory | null>(null);
  const [itemFormData, setItemFormData] = useState<Partial<Inventory>>({});

  // State for archive dialog
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [itemToArchive, setItemToArchive] = useState<Inventory | null>(null);
  const [confirmArchiveText, setConfirmArchiveText] = useState("");

  // State for restore dialog
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [itemToRestore, setItemToRestore] = useState<Inventory | null>(null);

  // Apply filters when inventory, categoryFilter, or searchTerm changes
  useEffect(() => {
    let filtered = [...inventory];

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        (item.description?.toLowerCase().includes(searchLower)) ||
        (item.category?.toLowerCase().includes(searchLower)) ||
        (item.supplier?.toLowerCase().includes(searchLower)) ||
        (item.location?.toLowerCase().includes(searchLower))
      );
    }

    setFilteredInventory(filtered);
  }, [inventory, categoryFilter, searchTerm]);

  // Format datetime
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

  // Reset form data
  const resetFormData = () => {
    setItemFormData({});
    setItemToEdit(null);
  };

  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    // Convert numeric values
    if (type === "number") {
      setItemFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setItemFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle edit dialog open
  const handleEditClick = (item: Inventory) => {
    setItemToEdit(item);
    setItemFormData({
      name: item.name,
      description: item.description || "",
      category: item.category || "",
      status: item.status || "ACTIVE",
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      minimumStock: item.minimumStock || 0,
      location: item.location || "",
      supplier: item.supplier || "",
    });
    setIsEditDialogOpen(true);
  };

  // Handle update item submission
  const handleUpdateItem = async () => {
    if (!itemToEdit || !itemFormData.name) {
      toast.error("Item name is required");
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/inventory`, {
        method: "PATCH",
        body: JSON.stringify({
          id: itemToEdit.id,
          ...itemFormData,
          updatedById: user?.id
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update inventory item");
      }

      const { item: updatedItem } = await res.json();

      // Call the onUpdate callback
      if (onUpdate) {
        onUpdate(updatedItem);
      }

      toast.success("Inventory item updated successfully");
      setIsEditDialogOpen(false);
      resetFormData();
    } catch (error) {
      console.error("Error updating inventory item:", error);
      toast.error("Failed to update inventory item");
    }
  };

  // Handle archive dialog open
  const handleArchiveClick = (item: Inventory) => {
    setItemToArchive(item);
    setConfirmArchiveText("");
    setIsArchiveDialogOpen(true);
  };

  // Handle archive item
  const handleArchiveItem = async () => {
    if (!itemToArchive || confirmArchiveText !== "ARCHIVE") {
      toast.error("Please type ARCHIVE to confirm");
      return;
    }

    try {
      const res = await fetchWithAuth("/api/inventory/softDelete", {
        method: "POST",
        body: JSON.stringify({
          id: itemToArchive.id,
          deletedById: user?.id
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to archive inventory item");
      }

      const { item: archivedItem } = await res.json();

      // Call the onArchive callback
      if (onArchive) {
        onArchive(archivedItem);
      }

      toast.success("Inventory item archived successfully");
      setIsArchiveDialogOpen(false);
      setItemToArchive(null);
      setConfirmArchiveText("");
    } catch (error) {
      console.error("Error archiving inventory item:", error);
      toast.error("Failed to archive inventory item");
    }
  };

  // Handle restore dialog open
  const handleRestoreClick = (item: Inventory) => {
    setItemToRestore(item);
    setIsRestoreDialogOpen(true);
  };

  // Handle restore item
  const handleRestoreItem = async () => {
    if (!itemToRestore) return;

    try {
      const res = await fetchWithAuth("/api/inventory/restore", {
        method: "POST",
        body: JSON.stringify({
          id: itemToRestore.id,
          restoredById: user?.id
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to restore inventory item");
      }

      const { item: restoredItem } = await res.json();

      // Call the onRestore callback
      if (onRestore) {
        onRestore(restoredItem);
      }

      toast.success("Inventory item restored successfully");
      setIsRestoreDialogOpen(false);
      setItemToRestore(null);
    } catch (error) {
      console.error("Error restoring inventory item:", error);
      toast.error("Failed to restore inventory item");
    }
  };

  return (
    <div className="space-y-4">
      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2">Loading inventory...</span>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="text-center py-12">
          <Package2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">No inventory items found</h3>
          <p className="text-muted-foreground">
            {isArchived
              ? "Tidak ada item diarsipkan yang cocok dengan kriteria Anda."
              : "Coba sesuaikan filter Anda atau tambahkan item inventaris baru."}
          </p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableCaption>
              {isArchived ? "Daftar item inventaris yang diarsipkan" : "Daftar item inventaris aktif"}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Kuantitas</TableHead>
                <TableHead>Harga Satuan</TableHead>
                <TableHead>Total Nilai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow key={item.id} className={item.isDeleted ? "bg-gray-50" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.category ? (
                      <Badge variant="outline">{item.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {item.quantity}
                      {item.quantity !== undefined &&
                       item.minimumStock !== undefined &&
                       item.quantity <= item.minimumStock &&
                       item.quantity > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-4 w-4 ml-1 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Stok rendah</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatRupiah(item.unitPrice || 0)}</TableCell>
                  <TableCell>{formatRupiah(item.totalValue || 0)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={item.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {item.status || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Tindakan</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {isArchived ? (
                          <DropdownMenuItem
                            onClick={() => handleRestoreClick(item)}
                            className="text-green-600 focus:text-green-700"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Pulihkan
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => handleEditClick(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleArchiveClick(item)}
                              className="text-red-600 focus:text-red-700"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Arsipkan
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Inventory Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item Inventaris</DialogTitle>
            <DialogDescription>
              Perbarui detail item inventaris
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama</label>
              <Input
                name="name"
                value={itemFormData.name || ""}
                onChange={handleFormChange}
                placeholder="Nama item"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategori</label>
                <Input
                  name="category"
                  value={itemFormData.category || ""}
                  onChange={handleFormChange}
                  placeholder="Kategori"
                  list="categories"
                />
                <datalist id="categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
                  value={itemFormData.status || "ACTIVE"}
                  onChange={handleFormChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Tidak Aktif</option>
                  <option value="MAINTENANCE">Pemeliharaan</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kuantitas</label>
                <Input
                  name="quantity"
                  type="number"
                  min="0"
                  value={itemFormData.quantity?.toString() || "0"}
                  onChange={handleFormChange}
                  placeholder="Kuantitas"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Harga Satuan</label>
                <Input
                  name="unitPrice"
                  type="number"
                  min="0"
                  value={itemFormData.unitPrice?.toString() || "0"}
                  onChange={handleFormChange}
                  placeholder="Harga satuan"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Stok Min.</label>
                <Input
                  name="minimumStock"
                  type="number"
                  min="0"
                  value={itemFormData.minimumStock?.toString() || "0"}
                  onChange={handleFormChange}
                  placeholder="Stok minimum"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lokasi</label>
              <Input
                name="location"
                value={itemFormData.location || ""}
                onChange={handleFormChange}
                placeholder="Lokasi penyimpanan"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pemasok</label>
              <Input
                name="supplier"
                value={itemFormData.supplier || ""}
                onChange={handleFormChange}
                placeholder="Nama pemasok"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi</label>
              <Input
                name="description"
                value={itemFormData.description || ""}
                onChange={handleFormChange}
                placeholder="Deskripsi item"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateItem}>
              Perbarui Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Arsipkan Item Inventaris</DialogTitle>
            <DialogDescription>
              Item ini akan diarsipkan dan tidak akan muncul dalam daftar inventaris aktif.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="mb-2 font-medium">
              Item: {itemToArchive?.name}
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              Ketik "ARCHIVE" untuk konfirmasi.
            </p>
            <Input
              value={confirmArchiveText}
              onChange={(e) => setConfirmArchiveText(e.target.value)}
              placeholder="Ketik ARCHIVE untuk konfirmasi"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchiveItem}
              disabled={confirmArchiveText !== "ARCHIVE"}
            >
              Arsipkan Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pulihkan Item Inventaris</DialogTitle>
            <DialogDescription>
              Item ini akan dipulihkan dan akan muncul dalam daftar inventaris aktif lagi.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p>
              Apakah Anda yakin ingin memulihkan item "{itemToRestore?.name}"?
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleRestoreItem}>
              Pulihkan Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}