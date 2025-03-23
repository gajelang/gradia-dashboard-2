"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { formatRupiah } from "@/lib/formatters"
import { Calendar } from "lucide-react"

// Updated Transaction interface
interface Transaction {
  id: string;
  name?: string; // Optional
  description: string;
  amount: number;
  paymentStatus: string; // Changed from status
  date: string;
  email?: string; // Now optional
  phone?: string; // New field
  startDate?: string; // New field
  endDate?: string; // New field
  isDeleted?: boolean; // Added isDeleted flag
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  // Filter out archived transactions first
  const activeTransactions = transactions.filter(tx => !tx.isDeleted);
  
  // Then limit to most recent 8
  const limitedTransactions = activeTransactions.slice(0, 8);
  
  const handleSeeMore = () => {
    // Navigate to projects tab
    document.querySelector('[value="projects"]')?.dispatchEvent(
      new Event('click', { bubbles: true })
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short'
    });
  };

  // Get payment status badge style
  const getPaymentStatusStyle = (status: string) => {
    switch(status) {
      case "Lunas":
        return "bg-green-50 text-green-700 border border-green-200";
      case "DP":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "Belum Bayar":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  // Get broadcast status
  const getBroadcastStatus = (tx: Transaction): string => {
    const now = new Date();
    
    if (tx.startDate) {
      const start = new Date(tx.startDate);
      if (now < start) {
        return "Belum Dimulai";
      }
    }
    
    if (tx.endDate) {
      const end = new Date(tx.endDate);
      const diff = end.getTime() - now.getTime();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      
      if (diff < 0) return "Berakhir";
      if (diff < oneWeek) return "Akan Berakhir";
      return "Aktif";
    }
    
    return "";
  };

  // Get broadcast status badge style
  const getBroadcastStatusStyle = (status: string) => {
    switch (status) {
      case "Belum Dimulai":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Berakhir":
        return "bg-neutral-50 text-neutral-700 border border-neutral-200";
      case "Akan Berakhir":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "Aktif":
        return "bg-green-50 text-green-700 border border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  return (
    <div className="space-y-0 rounded-lg border overflow-hidden">
      <Table>
        <TableBody>
          {limitedTransactions.length > 0 ? (
            limitedTransactions.map((transaction) => (
              <TableRow key={transaction.id} className="hover:bg-gray-50">
                <TableCell className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={`/placeholder.svg?height=40&width=40`} alt="Avatar" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {transaction.name ? transaction.name.charAt(0).toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {transaction.name || "Unnamed Transaction"}
                        </p>
                        <span className="text-green-600 font-medium whitespace-nowrap">
                          Rp{formatRupiah(Math.abs(transaction.amount))}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                        {transaction.description || "No description"}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="inline-flex items-center text-xs text-muted-foreground" title={new Date(transaction.date).toLocaleString('id-ID')}>
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(transaction.date)}
                        </div>
                        
                        <div className="mx-1 w-1 h-1 bg-muted-foreground rounded-full"></div>
                        
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPaymentStatusStyle(transaction.paymentStatus)}`}>
                          {transaction.paymentStatus}
                        </span>
                        
                        {(transaction.startDate || transaction.endDate) && 
                          getBroadcastStatus(transaction) && (
                          <>
                            <div className="mx-1 w-1 h-1 bg-muted-foreground rounded-full"></div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getBroadcastStatusStyle(getBroadcastStatus(transaction))}`}>
                              {getBroadcastStatus(transaction)}
                            </span>
                          </>
                        )}
                        
                      </div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center">No recent transactions</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {activeTransactions.length > 8 && (
        <div className="flex justify-center p-2 border-t bg-gray-50">
          <Button 
            variant="ghost" 
            onClick={handleSeeMore}
            className="text-sm"
            size="sm"
          >
            See All Transactions
          </Button>
        </div>
      )}
    </div>
  )
}