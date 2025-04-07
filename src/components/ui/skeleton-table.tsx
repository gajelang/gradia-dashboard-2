"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonTableProps {
  /** Jumlah baris */
  rowCount?: number;
  /** Jumlah kolom */
  columnCount?: number;
  /** Header kolom */
  headers?: string[];
  /** Kelas CSS tambahan */
  className?: string;
  /** Apakah menampilkan header */
  showHeader?: boolean;
  /** Konfigurasi lebar kolom */
  columnWidths?: string[];
}

/**
 * Komponen SkeletonTable untuk menampilkan loading state tabel
 */
export function SkeletonTable({
  rowCount = 5,
  columnCount = 5,
  headers,
  className,
  showHeader = true,
  columnWidths,
}: SkeletonTableProps) {
  // Jika headers disediakan, gunakan panjang headers sebagai columnCount
  const effectiveColumnCount = headers?.length || columnCount;
  
  // Buat array untuk iterasi
  const rows = Array(rowCount).fill(0);
  const columns = Array(effectiveColumnCount).fill(0);
  
  return (
    <div className={cn("border rounded-md", className)}>
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {headers
                ? headers.map((header, index) => (
                    <TableHead
                      key={index}
                      className={columnWidths?.[index] ? `w-[${columnWidths[index]}]` : undefined}
                    >
                      {header}
                    </TableHead>
                  ))
                : columns.map((_, index) => (
                    <TableHead key={index}>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableHead>
                  ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {rows.map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((_, colIndex) => (
                <TableCell key={colIndex}>
                  {colIndex === 0 ? (
                    // Kolom pertama biasanya nama/judul
                    <div className="flex flex-col space-y-1">
                      <Skeleton className="h-4 w-[180px]" />
                      <Skeleton className="h-3 w-[120px]" />
                    </div>
                  ) : colIndex === columns.length - 1 ? (
                    // Kolom terakhir biasanya aksi
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  ) : (
                    // Kolom lainnya
                    <Skeleton className="h-4 w-[100px]" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default SkeletonTable;
