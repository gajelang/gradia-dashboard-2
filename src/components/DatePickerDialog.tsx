"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchWithAuth } from "@/lib/api";
import { DateRange as DayPickerDateRange } from "react-day-picker";

// Define DateRange to match exactly with the parent component
interface DateRange {
  from: Date;
  to: Date;
}

// Props definition matching the parent component exactly
interface DatePickerDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedRange: DateRange | undefined;
  setSelectedRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function DatePickerDialog({ 
  isOpen, 
  setIsOpen, 
  selectedRange, 
  setSelectedRange, 
  onDateRangeChange 
}: DatePickerDialogProps) {
  const [selectedTab, setSelectedTab] = useState<string>("calendar");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  // If you need to fetch any data, define the fetch function using useCallback before any useEffect
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/clients", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        // Process data if needed
        return data;
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  }, []); // Add any dependencies if needed
  
  // Then use the function in useEffect
  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen, fetchClients]); // Now fetchClients is properly defined before reference
  
  // Month names
  const monthNames: string[] = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Available years for dropdown
  const currentYear = new Date().getFullYear();
  const years: string[] = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());
  
  // Preset ranges - ensure it returns DateRange with non-optional properties
  const getPresetRange = (preset: string): DateRange => {
    const today = new Date();
    
    switch (preset) {
      case "today": {
        const from = new Date(today);
        const to = new Date(today);
        return { from, to };
      }
      case "thisWeek": {
        const from = new Date(today);
        from.setDate(from.getDate() - from.getDay());
        const to = new Date(today);
        return { from, to };
      }
      case "thisMonth": {
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        const to = new Date(today);
        return { from, to };
      }
      case "lastMonth": {
        const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const to = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from, to };
      }
      case "thisYear": {
        const from = new Date(today.getFullYear(), 0, 1);
        const to = new Date(today);
        return { from, to };
      }
      default: {
        // Set default values instead of undefined to match the type
        const from = new Date();
        const to = new Date();
        return { from, to };
      }
    }
  };
  
  // Set month and year manually
  const setMonthYearRange = (): void => {
    const from = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
    const to = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0);
    const newRange: DateRange = { from, to };
    setSelectedRange(newRange);
    onDateRangeChange(newRange);
    setIsOpen(false);
  };

  // Handle preset button click
  const handlePresetClick = (preset: string): void => {
    const range = getPresetRange(preset);
    setSelectedRange(range);
    onDateRangeChange(range);
    setIsOpen(false);
  };

  // Handler for tabs value change
  const handleTabChange = (value: string): void => {
    setSelectedTab(value);
  };

  // Handle calendar selection - correctly handle the type conversion between react-day-picker's DateRange and our DateRange
  const handleCalendarSelect = (range: DayPickerDateRange | undefined) => {
    if (range?.from && range?.to) {
      // Convert to our DateRange type with non-optional properties
      const convertedRange: DateRange = {
        from: range.from,
        to: range.to
      };
      setSelectedRange(convertedRange);
    } else if (!range) {
      // Handle undefined case
      setSelectedRange(undefined);
    }
  };

  // Apply selected date range
  const handleApply = () => {
    if (selectedRange) {
      onDateRangeChange(selectedRange);
      setIsOpen(false);
    }
  };

  // Handle clearing date range
  const handleClearRange = () => {
    setSelectedRange(undefined);
    onDateRangeChange(undefined);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md sm:max-w-lg w-full font-sans">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-semibold">
            Select Date Range
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="monthYear">Month & Year</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="mt-0">
            <div className="flex justify-center">
              <Calendar
                mode="range"
                defaultMonth={selectedRange?.from ? new Date(selectedRange.from) : new Date()}
                selected={selectedRange ? { from: selectedRange.from, to: selectedRange.to } : undefined}
                onSelect={handleCalendarSelect}
                numberOfMonths={1}
                showOutsideDays={true}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => handlePresetClick("today")}
                className="text-sm"
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handlePresetClick("thisWeek")}
                className="text-sm"
              >
                This Week
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handlePresetClick("thisMonth")}
                className="text-sm"
              >
                This Month
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handlePresetClick("lastMonth")}
                className="text-sm"
              >
                Last Month
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handlePresetClick("thisYear")}
                className="text-sm"
              >
                This Year
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClearRange}
                className="text-sm"
              >
                All Time
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="monthYear" className="mt-0">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={setMonthYearRange} className="w-full">Apply</Button>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4 gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Date Range
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}