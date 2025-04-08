// src/components/TimeRangeFilter.tsx
"use client";

import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import DateRangePicker from "@/components/DateRangePicker";
import { TimeRange, formatTimePeriodLabel } from "@/lib/api/apiController";
import { RefreshCw } from "lucide-react";

interface TimeRangeFilterProps {
  timeRange: TimeRange;
  onFilterChange: (timeRange: TimeRange) => void;
}

export default function TimeRangeFilter({
  timeRange,
  onFilterChange,
}: TimeRangeFilterProps) {
  const [selectedType, setSelectedType] = useState<TimeRange["type"]>(timeRange.type);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    timeRange.type === 'custom' && timeRange.startDate && timeRange.endDate
      ? { from: timeRange.startDate, to: timeRange.endDate }
      : undefined
  );
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    // Update local state when props change
    setSelectedType(timeRange.type);

    if (timeRange.type === 'custom' && timeRange.startDate && timeRange.endDate) {
      setDateRange({ from: timeRange.startDate, to: timeRange.endDate });
    } else {
      setDateRange(undefined);
    }

    setIsChanged(false);
  }, [timeRange]);

  // Handle filter type change
  const handleTypeChange = (value: string) => {
    const newType = value as TimeRange["type"];
    setSelectedType(newType);
    setIsChanged(true);
  };

  // Handle date range changes from DateRangePicker
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setIsChanged(true);
  };

  // Apply the filter
  const handleApplyFilter = () => {
    const newTimeRange: TimeRange = {
      type: selectedType,
      startDate: selectedType === 'custom' ? dateRange?.from : undefined,
      endDate: selectedType === 'custom' ? dateRange?.to : undefined
    };

    onFilterChange(newTimeRange);
    setIsChanged(false);
  };

  return (
    <Card className="shadow-sm mb-4">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-grow">
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pilih rentang waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_time">Semua Waktu</SelectItem>
                <SelectItem value="this_month">Bulan Ini</SelectItem>
                <SelectItem value="this_year">Tahun Ini</SelectItem>
                <SelectItem value="custom">Kustom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedType === "custom" && (
            <div className="flex items-center">
              <DateRangePicker
                onDateRangeChange={handleDateRangeChange}
              />
            </div>
          )}

          <Button
            variant="default"
            onClick={handleApplyFilter}
            disabled={!isChanged || (selectedType === "custom" && (!dateRange?.from || !dateRange?.to))}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Terapkan Filter
          </Button>
        </div>
        {timeRange.type !== 'all_time' && (
          <div className="mt-2 text-sm text-muted-foreground">
            Menampilkan data untuk: <span className="font-medium">{formatTimePeriodLabel(timeRange)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}