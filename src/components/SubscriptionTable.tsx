"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  RefreshCw, 
  ArrowUpDown, 
  Filter, 
  MoreHorizontal,
  AlertCircle
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";
import { formatRupiah } from "@/lib/formatters";
import { fetchWithAuth } from "@/lib/api"; // Use authenticated fetch
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface Subscription {
  id: string;
  name: string;
  description?: string;
  paymentStatus: 'LUNAS' | 'DP' | 'BELUM_BAYAR';
  nextBillingDate?: string | null;
  cost: number;
  isRecurring: boolean;
  recurringType?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | null;
  reminderDays?: number;
  createdAt: string;
  updatedAt: string;
}

const THRESHOLD_DAYS = 7;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const targetDate = new Date(dateStr);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 3600 * 24));
}

export default function SubscriptionTable() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof Subscription | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<Subscription['paymentStatus'] | 'ALL'>('ALL');

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
  
      // Use authenticated fetch
      const response = await fetchWithAuth('/api/subscriptions');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subscriptions');
      }
      
      const data: Subscription[] = await response.json();
      setSubscriptions(data);
    } catch (err: any) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred';
      
      setError(errorMessage);
      toast.error(`${errorMessage}. Unable to fetch subscriptions. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const filteredSubs = useMemo(() => {
    return subscriptions
      .filter((sub) => 
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterStatus === 'ALL' || sub.paymentStatus === filterStatus)
      )
      .sort((a, b) => {
        if (!sortColumn) return 0;
        
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue === undefined || bValue === undefined) return 0;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' 
            ? aValue - bValue 
            : bValue - aValue;
        }
        
        return 0;
      });
  }, [subscriptions, searchTerm, sortColumn, sortDirection, filterStatus]);

  const toggleSort = (column: keyof Subscription) => {
    if (sortColumn === column) {
      // If already sorting by this column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If new column, start with ascending sort
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusVariant = (status: Subscription['paymentStatus']) => {
    switch(status) {
      case 'LUNAS': return 'secondary';
      case 'DP': return 'outline';
      case 'BELUM_BAYAR': return 'destructive';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button 
          onClick={fetchSubscriptions} 
          variant="destructive" 
          className="mt-4"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> 
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Payment Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setFilterStatus('ALL')}
                className={filterStatus === 'ALL' ? 'bg-muted' : ''}
              >
                All Subscriptions
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterStatus('LUNAS')}
                className={filterStatus === 'LUNAS' ? 'bg-muted' : ''}
              >
                Paid
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterStatus('DP')}
                className={filterStatus === 'DP' ? 'bg-muted' : ''}
              >
                Partial Payment
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterStatus('BELUM_BAYAR')}
                className={filterStatus === 'BELUM_BAYAR' ? 'bg-muted' : ''}
              >
                Unpaid
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button variant="ghost" onClick={fetchSubscriptions}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <Table>
        <TableCaption>{filteredSubs.length} subscriptions found</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-muted" 
              onClick={() => toggleSort('name')}
            >
              <div className="flex items-center">
                Name 
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted" 
              onClick={() => toggleSort('paymentStatus')}
            >
              <div className="flex items-center">
                Payment Status
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted" 
              onClick={() => toggleSort('cost')}
            >
              <div className="flex items-center">
                Monthly Cost
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted" 
              onClick={() => toggleSort('nextBillingDate')}
            >
              <div className="flex items-center">
                Next Billing Date
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              </div>
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSubs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No subscriptions found.
              </TableCell>
            </TableRow>
          ) : (
            filteredSubs.map((sub) => {
              const dueDays = daysUntil(sub.nextBillingDate);
              const isDueSoon = dueDays !== null && dueDays <= THRESHOLD_DAYS && dueDays >= 0;
              return (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(sub.paymentStatus)}>
                      {sub.paymentStatus === 'LUNAS' ? 'Paid' 
                        : sub.paymentStatus === 'DP' ? 'Partial' 
                        : 'Unpaid'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    Rp{formatRupiah(sub.cost)}/month
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-2 ${isDueSoon ? 'text-yellow-600 font-semibold' : ''}`}>
                      {formatDate(sub.nextBillingDate)}
                      {isDueSoon && (
                        <Badge variant="destructive" className="text-xs">
                          Due Soon
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            // Get inventory ID for this subscription
                            const inventoryId = sub.id;
                            // Open inventory edit dialog using the inventory ID
                            const editButton = document.getElementById(`update-inventory-${inventoryId}`);
                            if (editButton) {
                              editButton.click();
                            } else {
                              toast.error("Edit dialog not found");
                            }
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>Make Payment</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Cancel Subscription</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* Hidden trigger buttons for edit modal (needed by inventory system) */}
                    <div className="hidden">
                      <span id={`update-inventory-${sub.id}`}></span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}