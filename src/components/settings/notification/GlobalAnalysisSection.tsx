
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart, LineChart } from "lucide-react";
import { DailyReport } from "@/hooks/useDailyReports";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GlobalAnalysisSectionProps {
  reports: DailyReport[];
  loadingReports: boolean;
  onViewDetailedAnalysis: () => void;
  onChangeDateRange: (days: number) => void;
  selectedDays: number;
  isDropdown?: boolean;
}

// Use React.memo to prevent unnecessary re-renders
const GlobalAnalysisSection = React.memo(function GlobalAnalysisSection({
  reports,
  loadingReports,
  onViewDetailedAnalysis,
  onChangeDateRange,
  selectedDays,
  isDropdown = false
}: GlobalAnalysisSectionProps) {
  
  // Use useMemo for expensive calculations to improve performance
  const { aggregatedFindings, totalCalls } = useMemo(() => {
    // Function to get aggregated findings from all reports
    const getAggregatedFindings = () => {
      if (!reports || reports.length === 0) return {
        positive: ["No hay datos disponibles"],
        negative: ["No hay datos disponibles"],
        opportunities: ["No hay datos disponibles"]
      };
      
      // Collect all findings
      const allPositive: string[] = [];
      const allNegative: string[] = [];
      const allOpportunities: string[] = [];
      
      reports.forEach(report => {
        if (report.topFindings.positive && report.topFindings.positive.length > 0 &&
            report.topFindings.positive[0] !== "No hay datos disponibles para este día") {
          allPositive.push(...report.topFindings.positive);
        }
        
        if (report.topFindings.negative && report.topFindings.negative.length > 0 &&
            report.topFindings.negative[0] !== "No hay datos disponibles para este día") {
          allNegative.push(...report.topFindings.negative);
        }
        
        if (report.topFindings.opportunities && report.topFindings.opportunities.length > 0 &&
            report.topFindings.opportunities[0] !== "No hay datos disponibles para este día") {
          allOpportunities.push(...report.topFindings.opportunities);
        }
      });
      
      // Count occurrences and get top findings
      const getTop = (findings: string[], limit = isDropdown ? 3 : 5) => {
        if (findings.length === 0) return ["No hay datos disponibles"];
        
        const count: Record<string, number> = {};
        findings.forEach(finding => {
          count[finding] = (count[finding] || 0) + 1;
        });
        
        return Object.entries(count)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([finding]) => finding);
      };
      
      return {
        positive: getTop(allPositive),
        negative: getTop(allNegative),
        opportunities: getTop(allOpportunities)
      };
    };
    
    // Calculate total calls across all reports
    const getTotalCalls = () => {
      if (!reports || reports.length === 0) return 0;
      return reports.reduce((total, report) => total + report.callCount, 0);
    };
    
    return {
      aggregatedFindings: getAggregatedFindings(),
      totalCalls: getTotalCalls()
    };
  }, [reports, isDropdown]);

  // If in dropdown mode, use a simpler layout
  if (isDropdown) {
    return (
      <div className="space-y-3 border-t pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Análisis Global</h3>
          
          <Select 
            defaultValue={selectedDays.toString()} 
            onValueChange={(value) => onChangeDateRange(parseInt(value))}
          >
            <SelectTrigger className="w-[120px] h-7 text-xs">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 días</SelectItem>
              <SelectItem value="15">15 días</SelectItem>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="0">Todo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {loadingReports ? (
          <div className="flex justify-center p-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : totalCalls === 0 ? (
          <p className="text-xs text-muted-foreground">No hay datos disponibles</p>
        ) : (
          <div className="space-y-2 text-xs">
            <div>
              <p className="font-medium">Total de llamadas: <span className="font-bold">{totalCalls}</span></p>
            </div>
            
            <div>
              <h5 className="text-muted-foreground mb-0.5">Aspectos positivos:</h5>
              <ul className="list-disc pl-4 space-y-0.5">
                {aggregatedFindings.positive.slice(0, 3).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h5 className="text-muted-foreground mb-0.5">Aspectos negativos:</h5>
              <ul className="list-disc pl-4 space-y-0.5">
                {aggregatedFindings.negative.slice(0, 3).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            
            <div className="flex justify-end pt-1">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onViewDetailedAnalysis}>
                Ver análisis detallado
              </Button>
            </div>
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
            <LineChart className="h-5 w-5" />
            Análisis Global de Llamadas
          </CardTitle>
          <CardDescription>
            Visión general del periodo analizado ({selectedDays === 0 ? "Todas las llamadas" : `Últimos ${selectedDays} días`})
          </CardDescription>
        </div>
        
        <Select 
          defaultValue={selectedDays.toString()} 
          onValueChange={(value) => onChangeDateRange(parseInt(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Periodo de tiempo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="15">Últimos 15 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="0">Todas las llamadas</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loadingReports ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : totalCalls === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No hay datos para el periodo seleccionado
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">Total de llamadas analizadas</p>
              <p className="text-2xl font-bold">{totalCalls}</p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Principales hallazgos globales</h4>
              
              <div>
                <h5 className="text-sm text-muted-foreground mb-1">Aspectos positivos</h5>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {aggregatedFindings.positive.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="text-sm text-muted-foreground mb-1">Aspectos negativos</h5>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {aggregatedFindings.negative.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="text-sm text-muted-foreground mb-1">Oportunidades</h5>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {aggregatedFindings.opportunities.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onViewDetailedAnalysis}>
                Ver análisis detallado
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default GlobalAnalysisSection;
