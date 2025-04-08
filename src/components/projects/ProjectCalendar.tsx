"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Mail,
  Phone,
  FileText,
  Calendar,
  Info,
  ArrowLeft,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addDays,
  isSameDay,
  isBefore,
  isAfter,
  isSameMonth,
  getMonth,
  getYear
} from "date-fns";
import { id } from "date-fns/locale";
import { formatDate } from "@/lib/formatters/dateUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fetchWithAuth } from "@/lib/api/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import Inter font
import { Inter } from "next/font/google";

// Load Inter font
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

interface Project {
  id: string;
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  paymentStatus: string;
  amount?: number;
  projectValue?: number;
  totalProfit?: number;
  downPaymentAmount?: number;
  remainingAmount?: number;
  email?: string;
  phone?: string;
  date?: string;
  paymentProofLink?: string;
  isDeleted?: boolean;
}

// Transaction type for API response
interface TransactionApiResponse {
  id: string;
  name: string | null;
  description: string | null;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  status?: string;
  amount?: number;
  projectValue?: number;
  totalProfit?: number;
  downPaymentAmount?: number;
  remainingAmount?: number;
  email?: string;
  phone?: string;
  date?: string;
  paymentProofLink?: string;
  isDeleted?: boolean;
}

interface CalendarProject extends Project {
  startDateObj: Date;
  endDateObj: Date;
  weekIndex: number;
  dayStart: number;
  dayEnd: number;
  rowIndex: number;
  startsBeforeMonth: boolean;
  endsAfterMonth: boolean;
}

interface WeekProjects {
  [key: number]: CalendarProject[];
}

interface MonthData {
  year: number;
  month: number;
  hasProjects: boolean;
}

const STATUS_COLORS = {
  "Lunas": "bg-green-100 border-green-500 text-green-800",
  "DP": "bg-yellow-100 border-yellow-500 text-yellow-800",
  "Belum Bayar": "bg-red-100 border-red-500 text-red-800"
};

const STATUS_BADGES = {
  "Lunas": "bg-green-100 text-green-800 hover:bg-green-100",
  "DP": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  "Belum Bayar": "bg-red-100 text-red-800 hover:bg-red-100"
};

export default function ProjectCalendar() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"calendar" | "list">("calendar");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [adjacentMonths, setAdjacentMonths] = useState<{prev: MonthData, next: MonthData}>({
    prev: { year: 0, month: 0, hasProjects: false },
    next: { year: 0, month: 0, hasProjects: false }
  });
  const [lastVisitedProject, setLastVisitedProject] = useState<string | null>(null);

  // Open modal with selected project
  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
    setLastVisitedProject(project.id);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProject(null), 300);
  };

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return "Not set";
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Fetch projects data
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/transactions", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch projects");

      const data = await res.json();

      // Filter transactions with start/end dates and not archived
      const projectsData = data
        .filter((tx: TransactionApiResponse) => (tx.startDate || tx.endDate) && !tx.isDeleted)
        .map((tx: TransactionApiResponse) => ({
          id: tx.id,
          name: tx.name || "Untitled Project",
          description: tx.description || "",
          startDate: tx.startDate,
          endDate: tx.endDate,
          paymentStatus: tx.paymentStatus || tx.status || "Belum Bayar",
          amount: tx.amount,
          projectValue: tx.projectValue,
          totalProfit: tx.totalProfit,
          downPaymentAmount: tx.downPaymentAmount,
          remainingAmount: tx.remainingAmount,
          email: tx.email,
          phone: tx.phone,
          date: tx.date,
          paymentProofLink: tx.paymentProofLink,
          isDeleted: tx.isDeleted || false
        }));

      setProjects(projectsData);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load project data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh projects data
  const refreshProjects = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Initial fetch and refresh when triggered
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, refreshTrigger]);

  // Determine if a month has projects
  const checkMonthHasProjects = useCallback((year: number, month: number) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = endOfMonth(monthStart);

    return projects.some(project => {
      if (!project.startDate || !project.endDate) return false;

      try {
        const startDate = parseISO(project.startDate);
        const endDate = parseISO(project.endDate);

        // Check if project overlaps with this month
        return !(isAfter(startDate, monthEnd) || isBefore(endDate, monthStart));
      } catch (e) {
        return false;
      }
    });
  }, [projects]);

  // Update adjacent months data when current month or projects change
  useEffect(() => {
    const prevMonth = subMonths(currentMonth, 1);
    const nextMonth = addMonths(currentMonth, 1);

    setAdjacentMonths({
      prev: {
        year: getYear(prevMonth),
        month: getMonth(prevMonth),
        hasProjects: checkMonthHasProjects(getYear(prevMonth), getMonth(prevMonth))
      },
      next: {
        year: getYear(nextMonth),
        month: getMonth(nextMonth),
        hasProjects: checkMonthHasProjects(getYear(nextMonth), getMonth(nextMonth))
      }
    });
  }, [currentMonth, projects, checkMonthHasProjects]);

  // Handle month navigation
  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  // Format date for display is now handled by the dateUtils library

  // Generate calendar data with projects spanning multiple days
  const generateCalendarData = useCallback(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const weeks: Date[][] = [];
    let week: Date[] = [];

    // Create first week with padding days
    const firstDayOfWeek = getDay(monthStart);
    for (let i = 0; i < firstDayOfWeek; i++) {
      week.push(addDays(monthStart, i - firstDayOfWeek));
    }

    // Fill in all days of the month
    days.forEach((day) => {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    });

    // Add padding to the last week
    if (week.length > 0) {
      const lastDayOfMonth = days[days.length - 1];
      const daysToAdd = 7 - week.length;
      for (let i = 1; i <= daysToAdd; i++) {
        week.push(addDays(lastDayOfMonth, i));
      }
      weeks.push(week);
    }

    // Process projects for the calendar
    const validProjects = projects
      .filter(project => {
        if (!project.startDate || !project.endDate || project.isDeleted) return false;

        try {
          const startDate = parseISO(project.startDate);
          const endDate = parseISO(project.endDate);

          // Only exclude projects that don't overlap with current month at all
          return !(isAfter(startDate, monthEnd) || isBefore(endDate, monthStart));
        } catch (e) {
          return false;
        }
      })
      .map(project => {
        const startDateObj = parseISO(project.startDate!);
        const endDateObj = parseISO(project.endDate!);

        // Check if project starts before or ends after current month
        const startsBeforeMonth = isBefore(startDateObj, monthStart);
        const endsAfterMonth = isAfter(endDateObj, monthEnd);

        return {
          ...project,
          startDateObj,
          endDateObj,
          startsBeforeMonth,
          endsAfterMonth
        };
      });

    const weekProjects: WeekProjects = {};
    weeks.forEach((_, weekIndex) => {
      weekProjects[weekIndex] = [];
    });

    // Place projects in their respective weeks
    validProjects.forEach(project => {
      const { startDateObj, endDateObj, startsBeforeMonth, endsAfterMonth } = project;

      // Determine display start/end dates clamped to current month if needed
      const displayStart = startsBeforeMonth ? monthStart : startDateObj;
      const displayEnd = endsAfterMonth ? monthEnd : endDateObj;

      // Assign project to each week it spans
      weeks.forEach((weekDays, weekIndex) => {
        const weekStart = weekDays[0];
        const weekEnd = weekDays[6];

        // Check if project overlaps with this week
        if (
          (isWithinInterval(displayStart, { start: weekStart, end: weekEnd }) ||
           isWithinInterval(displayEnd, { start: weekStart, end: weekEnd })) ||
          (isBefore(displayStart, weekStart) && isAfter(displayEnd, weekEnd))
        ) {
          // Calculate day start and end indexes within the week
          let dayStart = 0;
          let dayEnd = 6;

          // For projects that start within this week
          if (!startsBeforeMonth || isSameMonth(displayStart, weekStart)) {
            for (let i = 0; i < 7; i++) {
              if (isSameDay(weekDays[i], displayStart)) {
                dayStart = i;
                break;
              } else if (i < 6 && isAfter(displayStart, weekDays[i]) && isBefore(displayStart, weekDays[i + 1])) {
                dayStart = i + 1;
                break;
              }
            }
          } else if (startsBeforeMonth && weekIndex === 0) {
            // Project starts before this month and we're in the first week
            dayStart = 0;
          }

          // For projects that end within this week
          if (!endsAfterMonth || isSameMonth(displayEnd, weekEnd)) {
            for (let i = 6; i >= 0; i--) {
              if (isSameDay(weekDays[i], displayEnd)) {
                dayEnd = i;
                break;
              } else if (i > 0 && isAfter(displayEnd, weekDays[i - 1]) && isBefore(displayEnd, weekDays[i])) {
                dayEnd = i - 1;
                break;
              }
            }
          } else if (endsAfterMonth && weekIndex === weeks.length - 1) {
            // Project ends after this month and we're in the last week
            dayEnd = 6;
          }

          // Ensure valid day ranges
          if (dayStart <= dayEnd) {
            const calendarProject: CalendarProject = {
              ...project,
              weekIndex,
              dayStart,
              dayEnd,
              rowIndex: 0, // Will be assigned later
              startsBeforeMonth,
              endsAfterMonth
            };

            weekProjects[weekIndex].push(calendarProject);
          }
        }
      });
    });

    // Assign row positions for all projects in each week
    Object.keys(weekProjects).forEach(weekIndexStr => {
      const weekIndex = parseInt(weekIndexStr);
      const projectsInWeek = weekProjects[weekIndex];

      // Sort projects by start day and then by duration (shorter first)
      projectsInWeek.sort((a, b) => {
        if (a.dayStart !== b.dayStart) return a.dayStart - b.dayStart;
        const aDuration = a.dayEnd - a.dayStart;
        const bDuration = b.dayEnd - b.dayStart;
        return aDuration - bDuration;
      });

      // Initialize an empty grid to track occupied positions
      const occupiedPositions: boolean[][] = [];

      // Find a row for each project
      projectsInWeek.forEach(project => {
        let rowIndex = 0;
        let foundPosition = false;

        while (!foundPosition) {
          // Initialize this row if it doesn't exist
          if (!occupiedPositions[rowIndex]) {
            occupiedPositions[rowIndex] = Array(7).fill(false);
          }

          // Check if all positions for this project are available
          let positionAvailable = true;
          for (let day = project.dayStart; day <= project.dayEnd; day++) {
            if (occupiedPositions[rowIndex][day]) {
              positionAvailable = false;
              break;
            }
          }

          if (positionAvailable) {
            // Mark positions as occupied
            for (let day = project.dayStart; day <= project.dayEnd; day++) {
              occupiedPositions[rowIndex][day] = true;
            }
            project.rowIndex = rowIndex;
            foundPosition = true;
          } else {
            // Try next row
            rowIndex++;
          }
        }
      });
    });

    return { weeks, weekProjects };
  }, [currentMonth, projects]);

  // Memoized calendar data
  const calendarData = useMemo(() => generateCalendarData(), [generateCalendarData]);

  // Render calendar view
  const renderCalendarView = () => {
    const { weeks, weekProjects } = calendarData;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium">
              {format(currentMonth, "MMMM yyyy", { locale: id })}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handlePreviousMonth}
                    className={`rounded-full ${adjacentMonths.prev.hasProjects ? "border-blue-300" : ""}`}
                    variant="outline"
                    size="icon"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    {adjacentMonths.prev.hasProjects && (
                      <span className="absolute w-2 h-2 bg-blue-500 rounded-full -top-1 -right-1"></span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {format(subMonths(currentMonth, 1), "MMMM yyyy", { locale: id })}
                    {adjacentMonths.prev.hasProjects ? " (has projects)" : ""}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              onClick={refreshProjects}
              className="rounded-full"
              variant="outline"
              size="icon"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleNextMonth}
                    className={`rounded-full ${adjacentMonths.next.hasProjects ? "border-blue-300" : ""}`}
                    variant="outline"
                    size="icon"
                  >
                    <ChevronRight className="h-5 w-5" />
                    {adjacentMonths.next.hasProjects && (
                      <span className="absolute w-2 h-2 bg-blue-500 rounded-full -top-1 -right-1"></span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {format(addMonths(currentMonth, 1), "MMMM yyyy", { locale: id })}
                    {adjacentMonths.next.hasProjects ? " (has projects)" : ""}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden shadow-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 text-center text-sm font-medium bg-gray-50 border-b">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
              <div key={day} className="py-2 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, weekIndex) => {
            const projectsInWeek = weekProjects[weekIndex] || [];
            // Use max rows with a minimum to ensure consistent height
            const maxRows = Math.max(
              ...projectsInWeek.map(p => p.rowIndex + 1),
              3
            ) * 2; // Multiply by 2 to give more space for project content

            return (
              <div key={`week-${weekIndex}`} className="border-b last:border-b-0">
                {/* Day numbers */}
                <div className="grid grid-cols-7 text-right text-sm">
                  {week.map((day, dayIndex) => {
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={`day-${day.getDate()}-${dayIndex}`}
                        className={`p-1 border-r last:border-r-0 h-8 flex items-center justify-end ${
                          isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {isToday ? (
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white font-medium">
                            {day.getDate()}
                          </span>
                        ) : (
                          <span className="px-1">{day.getDate()}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Project rows */}
                <div
                  className="grid grid-cols-7 relative"
                  style={{
                    height: `${Math.min(maxRows * 30, 200)}px`,
                  }}
                >
                  {week.map((day, dayIndex) => {
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    return (
                      <div
                        key={`day-col-${dayIndex}`}
                        className={`border-r last:border-r-0 h-full ${
                          isCurrentMonth ? '' : 'bg-gray-50'
                        }`}
                      ></div>
                    );
                  })}

                  {projectsInWeek.map((project, projectIndex) => {
                    const projectStyle = {
                      gridColumnStart: project.dayStart + 1,
                      gridColumnEnd: project.dayEnd + 2,
                      top: `${project.rowIndex * 40 + 4}px`,
                      left: `calc(${(100 / 7) * project.dayStart}% + 4px)`,
                      width: `calc(${(100 / 7) * (project.dayEnd - project.dayStart + 1)}% - 8px)`,
                      height: 'auto',
                      minHeight: '36px',
                      maxHeight: '70px',
                      overflow: 'hidden',
                      zIndex: 10
                    };

                    // Highlight previously selected project
                    const isHighlighted = project.id === lastVisitedProject;

                    return (
                      <button
                        key={`project-${project.id}-${weekIndex}-${projectIndex}`}
                        className={`absolute rounded-md px-2 py-1.5 text-xs flex flex-col border cursor-pointer transition-all ${
                          isHighlighted ? 'ring-2 ring-blue-400 shadow-md' : 'hover:shadow-md hover:opacity-90'
                        } ${
                          project.startsBeforeMonth && project.dayStart === 0 ? 'border-l-4 border-l-blue-500' : ''
                        } ${
                          project.endsAfterMonth && project.dayEnd === 6 ? 'border-r-4 border-r-blue-500' : ''
                        } ${
                          STATUS_COLORS[project.paymentStatus as keyof typeof STATUS_COLORS] ||
                          "bg-gray-100 border-gray-300 text-gray-800"
                        }`}
                        style={projectStyle}
                        onClick={() => handleProjectClick(project)}
                      >
                        {/* Start indicator for projects continuing from previous month */}
                        {project.startsBeforeMonth && project.dayStart === 0 && (
                          <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-blue-500">
                            <ArrowLeft className="h-3 w-3" />
                          </div>
                        )}

                        <div className="font-medium truncate w-full text-left">
                          {project.name}
                        </div>
                        <div className="text-2xs opacity-75 line-clamp-1 w-full text-left mt-0.5">
                          {project.description || "No description"}
                        </div>

                        {/* End indicator for projects continuing to next month */}
                        {project.endsAfterMonth && project.dayEnd === 6 && (
                          <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-blue-500">
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend for cross-month projects */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 border-l-4 border-l-blue-500 border rounded"></div>
            <span>Continues from previous month</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 border-r-4 border-r-blue-500 border rounded"></div>
            <span>Continues to next month</span>
          </div>
        </div>
      </div>
    );
  };

  // Render list view
  const renderListView = () => {
    // Filter out archived projects before sorting
    const activeProjects = projects.filter(p => !p.isDeleted);

    const sortedProjects = [...activeProjects].sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    const projectsByMonth: Record<string, Project[]> = {};

    sortedProjects.forEach(project => {
      if (!project.startDate) return;
      try {
        const startDate = parseISO(project.startDate);
        const monthKey = format(startDate, "yyyy-MM");
        if (!projectsByMonth[monthKey]) {
          projectsByMonth[monthKey] = [];
        }
        projectsByMonth[monthKey].push(project);
      } catch {
        // Skip invalid dates
      }
    });

    // If a project spans multiple months, add it to all months it spans
    sortedProjects.forEach(project => {
      if (!project.startDate || !project.endDate) return;

      try {
        const startDate = parseISO(project.startDate);
        const endDate = parseISO(project.endDate);
        const startMonthKey = format(startDate, "yyyy-MM");

        let currentDate = addMonths(startDate, 1);
        while (isBefore(currentDate, endDate) || isSameMonth(currentDate, endDate)) {
          const monthKey = format(currentDate, "yyyy-MM");
          if (monthKey !== startMonthKey) {
            if (!projectsByMonth[monthKey]) {
              projectsByMonth[monthKey] = [];
            }

            // Add only if not already in this month
            if (!projectsByMonth[monthKey].some(p => p.id === project.id)) {
              const projectWithNote = {
                ...project,
                description: `${project.description || ""} (Continues from ${format(startDate, "MMMM yyyy", { locale: id })})`,
              };
              projectsByMonth[monthKey].push(projectWithNote);
            }
          }
          currentDate = addMonths(currentDate, 1);
        }
      } catch {
        // Skip invalid dates
      }
    });

    // Sort month keys chronologically
    const sortedMonthKeys = Object.keys(projectsByMonth).sort();

    return (
      <div className="space-y-6">
        {sortedMonthKeys.map((monthKey) => (
          <div key={monthKey} className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium">
                {format(parseISO(`${monthKey}-01`), "MMMM yyyy", { locale: id })}
              </h3>
            </div>
            <div className="space-y-2">
              {projectsByMonth[monthKey].map(project => {
                // Highlight previously selected project
                const isHighlighted = project.id === lastVisitedProject;

                // Determine if project spans multiple months
                const isMultiMonth = (() => {
                  if (!project.startDate || !project.endDate) return false;
                  const startDate = parseISO(project.startDate);
                  const endDate = parseISO(project.endDate);
                  return !isSameMonth(startDate, endDate);
                })();

                return (
                  <div
                    key={`${project.id}-${monthKey}`}
                    className={`p-4 border rounded-lg transition-colors shadow-sm cursor-pointer ${
                      isHighlighted ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    } ${
                      isMultiMonth ? 'border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleProjectClick(project)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      </div>
                      <Badge
                        className={STATUS_BADGES[project.paymentStatus as keyof typeof STATUS_BADGES] || "bg-gray-100"}
                        variant="outline"
                      >
                        {project.paymentStatus}
                      </Badge>
                    </div>
                    <div className="flex mt-3 text-sm text-gray-500">
                      <span className="inline-flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                        {formatDate(project.startDate)} - {formatDate(project.endDate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(projectsByMonth).length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p>No projects with scheduled dates found</p>
          </div>
        )}
      </div>
    );
  };

  // Render project details modal
  const renderProjectModal = () => {
    if (!selectedProject) return null;

    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg z-50">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedProject.name}</DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang project
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="flex items-center justify-between">
              <h3 className="hidden">{selectedProject.name}</h3>
              <Badge
                className={STATUS_BADGES[selectedProject.paymentStatus as keyof typeof STATUS_BADGES] || "bg-gray-100"}
                variant="outline"
              >
                {selectedProject.paymentStatus}
              </Badge>
            </div>

            <p className="text-sm text-gray-600 mt-1.5 mb-4">{selectedProject.description}</p>

            <div className="h-[1px] w-full bg-gray-200 my-3" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  Informasi Jadwal
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Tanggal Transaksi:</div>
                  <div>{formatDate(selectedProject.date)}</div>

                  <div className="text-gray-500">Tanggal Mulai:</div>
                  <div>{formatDate(selectedProject.startDate)}</div>

                  <div className="text-gray-500">Tanggal Selesai:</div>
                  <div>{formatDate(selectedProject.endDate)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  Informasi Pembayaran
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Jumlah:</div>
                  <div>{formatCurrency(selectedProject.amount)}</div>

                  <div className="text-gray-500">Nilai Proyek:</div>
                  <div>{formatCurrency(selectedProject.projectValue)}</div>

                  <div className="text-gray-500">Total Profit:</div>
                  <div>{formatCurrency(selectedProject.totalProfit)}</div>

                  <div className="text-gray-500">Down Payment:</div>
                  <div>{formatCurrency(selectedProject.downPaymentAmount)}</div>

                  <div className="text-gray-500">Sisa Pembayaran:</div>
                  <div>{formatCurrency(selectedProject.remainingAmount)}</div>
                </div>
              </div>
            </div>

            <div className="h-[1px] w-full bg-gray-200 my-3" />

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Info className="h-4 w-4 text-gray-500" />
                Informasi Kontak
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{selectedProject.email || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{selectedProject.phone || "Not provided"}</span>
                </div>
              </div>
            </div>

            {selectedProject.paymentProofLink && (
              <>
                <div className="h-[1px] w-full bg-gray-200 my-3" />
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Bukti Pembayaran
                  </h4>
                  <a
                    href={selectedProject.paymentProofLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1.5"
                  >
                    Lihat Bukti Pembayaran
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={handleCloseModal}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading project schedule...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-red-500">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={inter.className}>
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Project Broadcast Schedule</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={viewType}
                onValueChange={(value) => setViewType(value as "calendar" | "list")}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="View Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Calendar View
                    </div>
                  </SelectItem>
                  <SelectItem value="list">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      List View
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={refreshProjects}
                title="Refresh projects"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {projects.filter(p => !p.isDeleted).length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>No projects with broadcast dates found</p>
              <p className="text-sm mt-1">Add broadcast dates to your projects to see them here</p>
            </div>
          ) : (
            viewType === "calendar" ? renderCalendarView() : renderListView()
          )}
        </CardContent>
      </Card>

      {renderProjectModal()}
    </div>
  );
}