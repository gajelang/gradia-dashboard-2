"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/formatters/formatters";
import { 
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineIcon,
  TimelineBody,
} from "@/components/ui/timeline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar as CalendarIcon,
  CreditCard,
  BarChart4,
  Users,
  Building
} from "lucide-react";
import { format, parseISO, isValid, isBefore, isAfter } from "date-fns";
import { id } from "date-fns/locale";

interface FinancialTimelineViewProps {
  projectsData: any[];
  isLoading: boolean;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export default function FinancialTimelineView({
  projectsData,
  isLoading,
  dateRange,
}: FinancialTimelineViewProps) {
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Get unique clients
  const clients = useMemo(() => {
    const clientSet = new Set<string>();
    projectsData.forEach(project => {
      if (project.client?.name) {
        clientSet.add(project.client.name);
      }
    });
    return Array.from(clientSet).sort();
  }, [projectsData]);

  // Toggle project expansion
  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  // Prepare timeline events
  const timelineEvents = useMemo(() => {
    if (!projectsData.length) return [];

    // Extract all events from projects
    let events: any[] = [];

    projectsData.forEach(project => {
      const clientName = project.client?.name || "Unknown Client";
      
      // Skip if filtered by client
      if (filterClient !== "all" && clientName !== filterClient) {
        return;
      }
      
      // Skip if filtered by status
      if (filterStatus !== "all" && project.paymentStatus !== filterStatus) {
        return;
      }

      // Project start event
      if (project.startDate && isValid(parseISO(project.startDate))) {
        events.push({
          projectId: project.id,
          projectName: project.name,
          clientName,
          date: parseISO(project.startDate),
          type: "start",
          description: "Project Start",
          value: project.projectValue || 0,
          paymentStatus: project.paymentStatus,
          project
        });
      }

      // Project end event
      if (project.endDate && isValid(parseISO(project.endDate))) {
        events.push({
          projectId: project.id,
          projectName: project.name,
          clientName,
          date: parseISO(project.endDate),
          type: "end",
          description: "Project End",
          value: project.projectValue || 0,
          paymentStatus: project.paymentStatus,
          project
        });
      }

      // Payment events
      if (project.expenses && project.expenses.length > 0) {
        project.expenses.forEach((expense: any) => {
          if (expense.date && isValid(parseISO(expense.date))) {
            events.push({
              projectId: project.id,
              projectName: project.name,
              clientName,
              date: parseISO(expense.date),
              type: "payment",
              description: expense.description || "Payment",
              value: expense.amount || 0,
              paymentStatus: project.paymentStatus,
              project,
              expense
            });
          }
        });
      }

      // Down payment event
      if (project.paymentStatus === "DP" && project.downPaymentDate && isValid(parseISO(project.downPaymentDate))) {
        events.push({
          projectId: project.id,
          projectName: project.name,
          clientName,
          date: parseISO(project.downPaymentDate),
          type: "downpayment",
          description: "Down Payment",
          value: project.downPaymentAmount || 0,
          paymentStatus: project.paymentStatus,
          project
        });
      }
    });

    // Filter events by date range
    if (dateRange.from) {
      events = events.filter(event => isAfter(event.date, dateRange.from!));
    }
    if (dateRange.to) {
      events = events.filter(event => isBefore(event.date, dateRange.to!));
    }

    // Sort events
    switch (sortBy) {
      case "date-asc":
        events.sort((a, b) => a.date.getTime() - b.date.getTime());
        break;
      case "date-desc":
        events.sort((a, b) => b.date.getTime() - a.date.getTime());
        break;
      case "value-asc":
        events.sort((a, b) => a.value - b.value);
        break;
      case "value-desc":
        events.sort((a, b) => b.value - a.value);
        break;
      case "client":
        events.sort((a, b) => a.clientName.localeCompare(b.clientName));
        break;
      default:
        events.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    return events;
  }, [projectsData, dateRange, filterClient, filterStatus, sortBy]);

  // Get event icon based on type
  const getEventIcon = (type: string) => {
    switch (type) {
      case "start":
        return <Calendar className="h-4 w-4" />;
      case "end":
        return <CheckCircle2 className="h-4 w-4" />;
      case "payment":
        return <DollarSign className="h-4 w-4" />;
      case "downpayment":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Get event color based on type
  const getEventColor = (type: string, paymentStatus: string) => {
    switch (type) {
      case "start":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "end":
        return paymentStatus === "Lunas" 
          ? "bg-green-100 text-green-800 border-green-300"
          : "bg-amber-100 text-amber-800 border-amber-300";
      case "payment":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "downpayment":
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Lunas":
        return "bg-green-100 text-green-800";
      case "DP":
        return "bg-amber-100 text-amber-800";
      case "Belum Bayar":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex">
                  <Skeleton className="h-10 w-10 rounded-full mr-4" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Financial Timeline</CardTitle>
              <CardDescription>
                Visualize project milestones and financial events
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Lunas">Lunas</SelectItem>
                  <SelectItem value="DP">DP</SelectItem>
                  <SelectItem value="Belum Bayar">Belum Bayar</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                  <SelectItem value="value-desc">Value (Highest First)</SelectItem>
                  <SelectItem value="value-asc">Value (Lowest First)</SelectItem>
                  <SelectItem value="client">Client Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {timelineEvents.length > 0 ? (
            <Timeline>
              {timelineEvents.map((event, index) => (
                <TimelineItem key={`${event.projectId}-${event.type}-${index}`}>
                  {index < timelineEvents.length - 1 && <TimelineConnector />}
                  <TimelineHeader>
                    <TimelineIcon className={getEventColor(event.type, event.paymentStatus)}>
                      {getEventIcon(event.type)}
                    </TimelineIcon>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-2">
                      <div>
                        <Button 
                          variant="ghost" 
                          className="p-0 h-auto font-medium text-left justify-start hover:bg-transparent"
                          onClick={() => toggleProjectExpansion(event.projectId)}
                        >
                          {event.projectName}
                          {expandedProjects.has(event.projectId) ? (
                            <ChevronUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-2 h-4 w-4" />
                          )}
                        </Button>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>{format(event.date, "dd MMM yyyy", { locale: id })}</span>
                          <Badge className={getStatusBadgeColor(event.paymentStatus)}>
                            {event.paymentStatus}
                          </Badge>
                          <span className="flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            {event.clientName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-medium">
                          {event.type === "payment" || event.type === "downpayment" 
                            ? `Payment: ${formatRupiah(event.value)}`
                            : `Project Value: ${formatRupiah(event.value)}`
                          }
                        </Badge>
                        <Badge variant="outline" className={
                          event.type === "start" ? "bg-blue-50" :
                          event.type === "end" ? "bg-green-50" :
                          event.type === "payment" ? "bg-emerald-50" :
                          "bg-purple-50"
                        }>
                          {event.description}
                        </Badge>
                      </div>
                    </div>
                  </TimelineHeader>
                  
                  {expandedProjects.has(event.projectId) && (
                    <TimelineBody>
                      <Card className="mt-2 bg-gray-50">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">Project Details</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Project Value:</span>
                                  <span>{formatRupiah(event.project.projectValue || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Start Date:</span>
                                  <span>
                                    {event.project.startDate 
                                      ? format(parseISO(event.project.startDate), "dd MMM yyyy", { locale: id })
                                      : "Not set"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">End Date:</span>
                                  <span>
                                    {event.project.endDate 
                                      ? format(parseISO(event.project.endDate), "dd MMM yyyy", { locale: id })
                                      : "Not set"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Payment Status:</span>
                                  <Badge className={getStatusBadgeColor(event.project.paymentStatus)}>
                                    {event.project.paymentStatus}
                                  </Badge>
                                </div>
                                {event.project.paymentStatus === "DP" && (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Down Payment:</span>
                                      <span>{formatRupiah(event.project.downPaymentAmount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Remaining:</span>
                                      <span>{formatRupiah(event.project.remainingAmount || 0)}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Financial Summary</h4>
                              <div className="space-y-1 text-sm">
                                {(() => {
                                  // Calculate total expenses
                                  const totalExpenses = event.project.expenses?.reduce(
                                    (sum: number, exp: any) => sum + (exp.amount || 0), 
                                    0
                                  ) || 0;
                                  
                                  // Calculate revenue based on payment status
                                  let revenue = 0;
                                  if (event.project.paymentStatus === "Lunas") {
                                    revenue = event.project.projectValue || 0;
                                  } else if (event.project.paymentStatus === "DP") {
                                    revenue = event.project.downPaymentAmount || 0;
                                  }
                                  
                                  // Calculate profit
                                  const profit = revenue - totalExpenses;
                                  
                                  // Calculate profit margin
                                  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
                                  
                                  return (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total Revenue:</span>
                                        <span className="text-emerald-600 font-medium">
                                          {formatRupiah(revenue)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total Expenses:</span>
                                        <span className="text-rose-600 font-medium">
                                          {formatRupiah(totalExpenses)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Profit:</span>
                                        <span className={profit >= 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                                          {formatRupiah(Math.abs(profit))}
                                          {profit < 0 && " (Loss)"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Profit Margin:</span>
                                        <span className={profitMargin >= 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                                          {profitMargin.toFixed(1)}%
                                        </span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          
                          {/* Event-specific details */}
                          {event.type === "payment" && event.expense && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="font-medium mb-2">Payment Details</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <span className="font-medium">{formatRupiah(event.expense.amount || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Date:</span>
                                  <span>
                                    {event.expense.date 
                                      ? format(parseISO(event.expense.date), "dd MMM yyyy", { locale: id })
                                      : "Not set"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Description:</span>
                                  <span>{event.expense.description || "No description"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Category:</span>
                                  <span>{event.expense.category || "Uncategorized"}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TimelineBody>
                  )}
                </TimelineItem>
              ))}
            </Timeline>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p className="text-muted-foreground">No timeline events found for the selected filters</p>
                <p className="text-sm text-muted-foreground mt-1">Try changing your filters or date range</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
