
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { DailyReport } from "@/hooks/useDailyReports";
import { useNavigate } from "react-router-dom";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface DailyReportSectionProps {
  reports: DailyReport[];
  loadingReports: boolean;
  onViewHistory: () => void;
  onChangeDateRange: (days: number) => void;
  selectedDays: number;
  isDropdown?: boolean;
  showDateSelector?: boolean;
}

export default function DailyReportSection({
  reports,
  loadingReports,
  onViewHistory,
  onChangeDateRange,
  selectedDays,
  isDropdown = false,
  showDateSelector = false
}: DailyReportSectionProps) {
  const navigate = useNavigate();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Get reports to display (limit to 7 by default)
  const displayReports = reports.slice(0, isDropdown ? 3 : 7);
  
  const handleViewHistory = () => {
    if (onViewHistory) {
      onViewHistory();
    } else {
      navigate("/calls");
    }
  };
  
  const toggleExpandReport = (date: string) => {
    if (expandedReport === date) {
      setExpandedReport(null);
    } else {
      setExpandedReport(date);
    }
  };
  
  // Date range selector
  const renderDateRangeSelector = () => {
    if (!showDateSelector) return null;
    
    return (
      <div className="mb-2">
        <Select 
          value={String(selectedDays)} 
          onValueChange={(value) => onChangeDateRange(Number(value))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Seleccionar rango" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="15">Últimos 15 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };
  
  // If in dropdown mode, use a simpler layout
  if (isDropdown) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Resumen Diario de Cargas</h3>
          {showDateSelector && renderDateRangeSelector()}
        </div>
        
        {loadingReports ? (
          <div className="flex justify-center p-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : !displayReports || displayReports.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay reportes disponibles</p>
        ) : (
          <div className="space-y-2">
            {displayReports.map((report, index) => (
              <div key={report.date} className="border-b pb-2 last:border-0">
                <div 
                  className="cursor-pointer font-semibold flex items-center justify-between" 
                  onClick={() => toggleExpandReport(report.date)}
                >
                  <h4 className="text-sm">
                    {report.date} - {report.callCount} llamadas
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {expandedReport === report.date ? '▲' : '▼'}
                  </span>
                </div>

                {expandedReport === report.date && (
                  <div className="space-y-2 mt-2 text-xs">
                    <div>
                      <h5 className="font-medium">Hallazgos principales:</h5>
                      
                      <div>
                        <h6 className="text-muted-foreground mt-1">Aspectos positivos:</h6>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {report.topFindings.positive.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h6 className="text-muted-foreground mt-1">Aspectos negativos:</h6>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {report.topFindings.negative.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Regular card layout for settings page
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resumen Diario de Cargas
          </CardTitle>
          <CardDescription>Análisis de las llamadas más recientes (Últimos {selectedDays} Días)</CardDescription>
        </div>
        {showDateSelector && (
          <div>{renderDateRangeSelector()}</div>
        )}
      </CardHeader>
      <CardContent>
        {loadingReports ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !displayReports || displayReports.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No hay reportes disponibles
          </p>
        ) : (
          <div className="space-y-4">
            {displayReports.map((report, index) => (
              <div 
                key={report.date} 
                className={`border-b ${index === displayReports.length - 1 ? '' : 'pb-3'} ${index > 0 ? 'pt-3' : ''}`}
              >
                <div 
                  className="cursor-pointer font-semibold flex items-center justify-between" 
                  onClick={() => toggleExpandReport(report.date)}
                >
                  <h4 className="text-sm">
                    {report.date} - {report.callCount} llamadas
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {expandedReport === report.date ? '▲ Contraer' : '▼ Expandir'}
                  </span>
                </div>

                {expandedReport === report.date && (
                  <div className="space-y-4 mt-3">
                    <div>
                      <h5 className="text-sm font-medium">Hallazgos principales:</h5>
                    </div>
                    
                    <div>
                      <h6 className="text-sm text-muted-foreground mb-1">Aspectos positivos:</h6>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {report.topFindings.positive.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h6 className="text-sm text-muted-foreground mb-1">Aspectos negativos:</h6>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {report.topFindings.negative.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h6 className="text-sm text-muted-foreground mb-1">Oportunidades:</h6>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {report.topFindings.opportunities.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
