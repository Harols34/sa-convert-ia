import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Calendar, ChevronDown } from "lucide-react";
import { DailyReport } from "@/components/settings/notification/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export interface DailyReportSectionProps {
  reports: DailyReport[];
  loadingReports: boolean;
  onViewHistory: () => void;
  onChangeDateRange: (days: number) => void;
  selectedDays: number;
  isDropdown: boolean;
  showDateSelector?: boolean;
  hasCalls?: boolean;
}

const DailyReportSection: React.FC<DailyReportSectionProps> = ({
  reports,
  loadingReports,
  onViewHistory,
  onChangeDateRange,
  selectedDays,
  isDropdown,
  showDateSelector = true,
  hasCalls = false
}) => {
  // Get today's date for display
  const today = new Date();
  const formattedDate = format(today, "dd MMMM yyyy", { locale: es });

  // Format date for daily reports
  const formatReportDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd MMM yyyy", { locale: es });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString || "Fecha desconocida";
    }
  };

  // Date range options
  const dateRangeOptions = [
    { value: "7", label: "7 días" },
    { value: "15", label: "15 días" },
    { value: "30", label: "30 días" },
    { value: "90", label: "90 días" }
  ];

  // Get the latest report if available
  const latestReport = reports && reports.length > 0 ? reports[0] : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-xl">Reporte Diario</CardTitle>
          <CardDescription>Resumen de actividad reciente</CardDescription>
        </div>
        <div className="flex space-x-2">
          {showDateSelector && (
            isDropdown ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {selectedDays} días <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {dateRangeOptions.map((option) => (
                    <DropdownMenuItem 
                      key={option.value}
                      onClick={() => onChangeDateRange(parseInt(option.value))}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Select 
                value={selectedDays.toString()} 
                onValueChange={(value) => onChangeDateRange(parseInt(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="7 días" />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          )}
          <Button variant="outline" size="sm" onClick={onViewHistory}>
            <BarChart className="mr-2 h-4 w-4" />
            Ver Historial
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingReports ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-6" />
            <Skeleton className="w-full h-24" />
          </div>
        ) : (
          <div className="space-y-4">
            {reports && reports.length > 0 ? (
              reports.map((report, index) => (
                <div key={index} className="pb-4 border-b last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      {formatReportDate(report.date)} 
                      {report.callCount ? (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          - {report.callCount} llamada{report.callCount !== 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </h3>
                    {report.trend === "up" ? (
                      <span className="text-bright-green text-sm">▲</span>
                    ) : report.trend === "down" ? (
                      <span className="text-destructive text-sm">▼</span>
                    ) : null}
                  </div>
                  
                  {report.callCount && report.callCount > 0 ? (
                    <>
                      <h4 className="text-sm font-medium mb-1">Hallazgos principales:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground">Aspectos positivos:</h5>
                          <ul className="text-xs list-disc list-inside">
                            {report.findings?.positive?.slice(0, 3).map((finding, i) => (
                              <li key={i}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground">Aspectos negativos:</h5>
                          <ul className="text-xs list-disc list-inside">
                            {report.findings?.negative?.slice(0, 3).map((finding, i) => (
                              <li key={i}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay llamadas registradas en esta fecha.
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No hay datos disponibles para el período seleccionado.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={onViewHistory}>
                  Explorar historial completo
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyReportSection;
