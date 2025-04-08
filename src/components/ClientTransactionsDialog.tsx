"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, DollarSign, FileText } from "lucide-react";
import { fetchWithAuth } from "@/lib/api/api";
import { formatRupiah } from "@/lib/formatters/formatters";

interface Transaction {
  id: string;
  name: string;
  description: string;
  projectValue: number;
  paymentStatus: string;
  date: string;
  startDate?: string;
  endDate?: string;
}

interface Client {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
}

interface ClientTransactionsDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClientTransactionsDialog({
  client,
  open,
  onOpenChange,
}: ClientTransactionsDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && client) {
      fetchClientTransactions();
    }
  }, [open, client]);

  const fetchClientTransactions = async () => {
    if (!client) return;

    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/transactions/client/${client.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client transactions");
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching client transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "Lunas":
        return <Badge className="bg-green-100 text-green-800">Lunas</Badge>;
      case "DP":
        return <Badge className="bg-yellow-100 text-yellow-800">DP</Badge>;
      case "Belum Bayar":
      default:
        return <Badge className="bg-red-100 text-red-800">Belum Bayar</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaksi Klien: {client?.name}</DialogTitle>
          <DialogDescription>
            Kode Klien: {client?.code} | {client?.email} | {client?.phone}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Memuat transaksi...</span>
          </div>
        ) : transactions.length > 0 ? (
          <div className="border rounded-md">
            <Table>
              <TableCaption>
                Total {transactions.length} transaksi untuk {client?.name}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deskripsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                        {formatDate(transaction.date)}
                      </div>
                      {transaction.startDate && transaction.endDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(transaction.startDate)} - {formatDate(transaction.endDate)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                        {formatRupiah(transaction.projectValue)}
                      </div>
                    </TableCell>
                    <TableCell>{getPaymentStatusBadge(transaction.paymentStatus)}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={transaction.description}>
                        {transaction.description || "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Tidak ada transaksi untuk klien ini</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
