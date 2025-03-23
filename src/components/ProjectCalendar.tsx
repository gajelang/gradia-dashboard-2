"use client";

import { useState, useEffect } from "react";
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
  X,
  Clock,
  CreditCard,
  Mail,
  Phone,
  FileText,
  Calendar,
  Info
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
  isAfter
} from "date-fns";
import { id } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fetchWithAuth } from "@/lib/api"; // Import the fetchWithAuth utility

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
  isDeleted?: boolean; // Added isDeleted flag
}

interface CalendarProject extends Project {
  startDateObj: Date;
  endDateObj: Date;
  weekIndex: number;
  dayStart: number;
  dayEnd: number;
  rowIndex: number;
}

interface WeekProjects {
  [key: number]: CalendarProject[];
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

  // Open modal with selected project
  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProject(null), 300); // Clear selection after animation
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

  // Fetch projects data (filtered from transactions with start/end dates)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await fetchWithAuth("/api/transactions", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch projects");
        
        const data = await res.json();
        
        // Filter transactions that:
        // 1. Have at least a startDate or endDate
        // 2. Are NOT archived (isDeleted !== true)
        // 3. Map all additional transaction fields per the database
        const projectsData = data
          .filter((tx: any) => (tx.startDate || tx.endDate) && !tx.isDeleted)
          .map((tx: any) => ({
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
            isDeleted: tx.isDeleted || false // Explicitly track isDeleted status
          }));
        
        setProjects(projectsData);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError("Failed to load project data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);

  // Handle month navigation
  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    try {
      return format(parseISO(dateString), "d MMM yyyy", { locale: id });
    } catch (e) {
      return "Invalid date";
    }
  };

  // Generate calendar data with projects spanning multiple days
  const generateCalendarData = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const weeks: Date[][] = [];
    let week: Date[] = [];
    
    const firstDayOfWeek = getDay(monthStart);
    for (let i = 0; i < firstDayOfWeek; i++) {
      week.push(addDays(monthStart, i - firstDayOfWeek));
    }
    
    days.forEach((day) => {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    });
    
    if (week.length > 0) {
      const lastDayOfMonth = days[days.length - 1];
      let daysToAdd = 7 - week.length;
      for (let i = 1; i <= daysToAdd; i++) {
        week.push(addDays(lastDayOfMonth, i));
      }
      weeks.push(week);
    }
    
    const validProjects = projects.filter(project => 
      project.startDate && project.endDate && !project.isDeleted
    ).map(project => {
      const startDateObj = parseISO(project.startDate!);
      const endDateObj = parseISO(project.endDate!);
      return { ...project, startDateObj, endDateObj };
    });
    
    const weekProjects: WeekProjects = {};
    weeks.forEach((_, weekIndex) => {
      weekProjects[weekIndex] = [];
    });
    
    validProjects.forEach(project => {
      const { startDateObj, endDateObj } = project;
      
      if (
        (isBefore(startDateObj, monthStart) && isBefore(endDateObj, monthStart)) ||
        (isAfter(startDateObj, monthEnd) && isAfter(endDateObj, monthEnd))
      ) {
        return;
      }
      
      const displayStart = isBefore(startDateObj, monthStart) ? monthStart : startDateObj;
      const displayEnd = isAfter(endDateObj, monthEnd) ? monthEnd : endDateObj;
      
      weeks.forEach((weekDays, weekIndex) => {
        const weekStart = weekDays[0];
        const weekEnd = weekDays[6];
        
        if (
          (isWithinInterval(displayStart, { start: weekStart, end: weekEnd }) ||
           isWithinInterval(displayEnd, { start: weekStart, end: weekEnd })) ||
          (isBefore(displayStart, weekStart) && isAfter(displayEnd, weekEnd))
        ) {
          let dayStart = 0;
          let dayEnd = 6;
          
          for (let i = 0; i < 7; i++) {
            if (isSameDay(weekDays[i], displayStart) || 
                (i === 0 && isBefore(displayStart, weekDays[i]))) {
              dayStart = i;
              break;
            } else if (isAfter(displayStart, weekDays[i]) && 
                      (i === 6 || isBefore(displayStart, weekDays[i + 1]))) {
              dayStart = i + 1;
              break;
            }
          }
          
          for (let i = 6; i >= 0; i--) {
            if (isSameDay(weekDays[i], displayEnd) || 
                (i === 6 && isAfter(displayEnd, weekDays[i]))) {
              dayEnd = i;
              break;
            } else if (isBefore(displayEnd, weekDays[i]) && 
                      (i === 0 || isAfter(displayEnd, weekDays[i - 1]))) {
              dayEnd = i - 1;
              break;
            }
          }
          
          if (isBefore(displayStart, weekDays[0]) && isAfter(displayEnd, weekDays[6])) {
            dayStart = 0;
            dayEnd = 6;
          }
          
          if (dayStart < 0) dayStart = 0;
          if (dayEnd > 6) dayEnd = 6;
          if (dayStart > dayEnd) return;
          
          const calendarProject: CalendarProject = {
            ...project,
            weekIndex,
            dayStart,
            dayEnd,
            rowIndex: 0
          };
          
          weekProjects[weekIndex].push(calendarProject);
        }
      });
    });
    
    Object.keys(weekProjects).forEach(weekIndexStr => {
      const weekIndex = parseInt(weekIndexStr);
      const projectsInWeek = weekProjects[weekIndex];
      
      projectsInWeek.sort((a, b) => {
        if (a.dayStart !== b.dayStart) return a.dayStart - b.dayStart;
        const aDuration = a.dayEnd - a.dayStart;
        const bDuration = b.dayEnd - b.dayStart;
        return aDuration - bDuration;
      });
      
      const occupiedPositions: boolean[][] = [];
      
      projectsInWeek.forEach(project => {
        let rowIndex = 0;
        let foundPosition = false;
        while (!foundPosition) {
          if (!occupiedPositions[rowIndex]) {
            occupiedPositions[rowIndex] = Array(7).fill(false);
          }
          
          let positionAvailable = true;
          for (let day = project.dayStart; day <= project.dayEnd; day++) {
            if (occupiedPositions[rowIndex][day]) {
              positionAvailable = false;
              break;
            }
          }
          
          if (positionAvailable) {
            foundPosition = true;
            for (let day = project.dayStart; day <= project.dayEnd; day++) {
              occupiedPositions[rowIndex][day] = true;
            }
            project.rowIndex = rowIndex;
          } else {
            rowIndex++;
          }
        }
      });
    });
    
    return { weeks, weekProjects };
  };

  // Render calendar view
  const renderCalendarView = () => {
    const { weeks, weekProjects } = generateCalendarData();
    
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
            <Button 
              onClick={handlePreviousMonth}
              className="rounded-full"
              variant="outline"
              size="icon"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              onClick={handleNextMonth}
              className="rounded-full"
              variant="outline"
              size="icon"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
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
            // Increase the maxRows to accommodate the expanded project cards
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
                    height: `${Math.min(maxRows * 30, 200)}px`, // Increase height for more space
                  }}
                >
                  {week.map((_, dayIndex) => (
                    <div 
                      key={`day-col-${dayIndex}`} 
                      className="border-r last:border-r-0 h-full"
                    ></div>
                  ))}
                  
                  {projectsInWeek.map((project, projectIndex) => {
                    const projectStyle = {
                      gridColumnStart: project.dayStart + 1,
                      gridColumnEnd: project.dayEnd + 2,
                      top: `${project.rowIndex * 40 + 4}px`, // Increased spacing between rows
                      width: `calc(100% * ${project.dayEnd - project.dayStart + 1} - 8px)`,
                      left: `calc(${(100 / 7) * project.dayStart}% + 4px)`,
                      height: 'auto',
                      minHeight: '36px', // Taller project boxes
                      maxHeight: '70px', // Limit max height
                      overflow: 'hidden'
                    };
                    
                    return (
                      <button
                        key={`project-${project.id}-${weekIndex}-${projectIndex}`}
                        className={`absolute rounded-md px-2 py-1.5 text-xs flex flex-col border cursor-pointer transition-all hover:shadow-md hover:opacity-90 ${
                          STATUS_COLORS[project.paymentStatus as keyof typeof STATUS_COLORS] || 
                          "bg-gray-100 border-gray-300 text-gray-800"
                        }`}
                        style={projectStyle}
                        onClick={() => handleProjectClick(project)}
                      >
                        <div className="font-medium truncate w-full text-left">
                          {project.name}
                        </div>
                        <div className="text-2xs opacity-75 line-clamp-2 w-full text-left mt-0.5">
                          {project.description || "No description"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
      } catch (e) {
        // Skip invalid dates
      }
    });
    
    return (
      <div className="space-y-6">
        {Object.entries(projectsByMonth).map(([monthKey, monthProjects]) => (
          <div key={monthKey} className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium">
                {format(parseISO(`${monthKey}-01`), "MMMM yyyy", { locale: id })}
              </h3>
            </div>
            <div className="space-y-2">
              {monthProjects.map(project => (
                <div 
                  key={project.id} 
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
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
              ))}
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
        <DialogContent className="sm:max-w-md md:max-w-lg">
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