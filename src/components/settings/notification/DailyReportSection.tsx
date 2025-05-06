
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, ChevronUp, Activity, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Componente para visualizar puntos destacados con variación
const HighlightPoint = ({ text, type }: { text: string, type: "positive" | "negative" | "warning" }) => {
  const icons = {
    positive: <Activity className="h-4 w-4 mr-2 text-green-500" />,
    negative: <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />,
    warning: <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
  };
  
  return (
    <div className="flex items-start mb-2">
      {icons[type]}
      <span className="text-sm">{text}</span>
    </div>
  );
};

interface DailyReportSectionProps {
  reports: any[];
  loadingReports: boolean;
  onViewHistory: () => void;
  onChangeDateRange: (days: number) => void;
  selectedDays: number;
  isDropdown: boolean;
  showDateSelector?: boolean;
}

export default function DailyReportSection({
  reports,
  loadingReports,
  onViewHistory,
  onChangeDateRange,
  selectedDays,
  isDropdown,
  showDateSelector = false
}: DailyReportSectionProps) {
  const [expandedDays, setExpandedDays] = React.useState<Record<string, boolean>>({});
  
  // Toggle expanded state for a specific date
  const toggleExpanded = (date: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };
  
  // Group reports by date and calculate metrics
  const reportsByDate = React.useMemo(() => {
    if (!reports || reports.length === 0) return [];
    
    const grouped: Record<string, any> = {};
    reports.forEach(report => {
      const date = report.date.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = {
          date,
          callCount: 0,
          averageScore: 0,
          totalCalls: 0,
          agents: [],
          positiveHighlights: [],
          negativeHighlights: []
        };
      }
      
      grouped[date].callCount += report.callCount;
      grouped[date].totalCalls += report.callCount;
      
      // Track unique agents
      report.agents.forEach((agent: any) => {
        const existingAgent = grouped[date].agents.find((a: any) => a.id === agent.id);
        if (!existingAgent) {
          grouped[date].agents.push({
            id: agent.id,
            name: agent.name,
            callCount: agent.callCount,
            averageScore: agent.averageScore
          });
        } else {
          existingAgent.callCount += agent.callCount;
          existingAgent.averageScore = ((existingAgent.averageScore * existingAgent.callCount) + 
                                      (agent.averageScore * agent.callCount)) / 
                                      (existingAgent.callCount + agent.callCount);
        }
      });
      
      // Calculate average score
      const totalScore = grouped[date].agents.reduce(
        (sum: number, agent: any) => sum + agent.averageScore * agent.callCount, 0
      );
      grouped[date].averageScore = Math.round(totalScore / grouped[date].totalCalls);
      
      // Generate highlights dynamically based on data
      // Highlights vary based on actual data, not repetitive templates
      if (grouped[date].averageScore > 80) {
        grouped[date].positiveHighlights.push("Alto nivel de efectividad en gestión de llamadas");
      } else if (grouped[date].averageScore > 70) {
        grouped[date].positiveHighlights.push("Nivel satisfactorio en calidad de interacciones");
      } else {
        grouped[date].positiveHighlights.push("Cumplimiento básico de estándares de atención");
      }
      
      if (grouped[date].totalCalls > 10) {
        grouped[date].positiveHighlights.push("Volumen significativo de llamadas gestionado");
      } else if (grouped[date].totalCalls > 5) {
        grouped[date].positiveHighlights.push("Gestión efectiva de volumen medio de llamadas");
      } else {
        grouped[date].positiveHighlights.push("Atención personalizada en cada interacción");
      }
      
      // Negative highlights based on score patterns
      if (grouped[date].averageScore < 70) {
        grouped[date].negativeHighlights.push("Necesidad de reforzar estándares básicos de calidad");
      } else if (grouped[date].averageScore < 80) {
        grouped[date].negativeHighlights.push("Oportunidad de mejora en técnicas avanzadas de atención");
      } else {
        grouped[date].negativeHighlights.push("Perfeccionar detalles para alcanzar excelencia");
      }
      
      // Add highlight based on agent performance variation
      const scores = grouped[date].agents.map((a: any) => a.averageScore);
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      
      if (maxScore - minScore > 20 && grouped[date].agents.length > 1) {
        grouped[date].negativeHighlights.push("Alta variabilidad en desempeño entre agentes");
      }
    });
    
    // Convert to array and sort by date (newest first)
    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [reports]);

  if (loadingReports) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Cargando reportes diarios...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-6">
            <Activity className="mb-2 h-10 w-10 text-muted-foreground" />
            <h3 className="font-medium">No hay reportes disponibles</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              No se encontraron reportes diarios para el período seleccionado.
            </p>
            <Button onClick={onViewHistory} variant="outline" size="sm">
              Ver historial completo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className={`${isDropdown ? "pt-4" : "pt-6"}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">Reportes Diarios</h3>
          
          {showDateSelector && (
            <Select
              defaultValue={selectedDays.toString()}
              onValueChange={(value) => onChangeDateRange(parseInt(value))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Últimos días" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="15">Últimos 15 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {reportsByDate.map((dayReport: any, i: number) => {
          const isExpanded = expandedDays[dayReport.date] || false;
          const dateObj = new Date(dayReport.date);
          const formattedDate = dateObj.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          });
          
          return (
            <div key={dayReport.date} className={`${i > 0 ? "mt-6" : ""}`}>
              <div 
                className="flex justify-between items-center cursor-pointer" 
                onClick={() => toggleExpanded(dayReport.date)}
              >
                <div>
                  <span className="font-medium">{formattedDate}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {dayReport.callCount} llamadas
                    </Badge>
                    <Badge 
                      variant={dayReport.averageScore >= 80 ? "success" : dayReport.averageScore >= 70 ? "outline" : "destructive"} 
                      className="text-xs"
                    >
                      {dayReport.averageScore}% calidad
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
              
              {isExpanded && (
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Hallazgos principales:</h4>
                    <div className="space-y-1">
                      {dayReport.positiveHighlights.map((item: string, j: number) => (
                        <HighlightPoint key={`pos-${j}`} text={item} type="positive" />
                      ))}
                      {dayReport.negativeHighlights.map((item: string, j: number) => (
                        <HighlightPoint key={`neg-${j}`} text={item} type="negative" />
                      ))}
                    </div>
                  </div>
                  
                  {dayReport.agents.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Desempeño de agentes:</h4>
                      <div className="space-y-2">
                        {dayReport.agents
                          .sort((a: any, b: any) => b.averageScore - a.averageScore)
                          .slice(0, 3)
                          .map((agent: any, j: number) => (
                            <div key={`agent-${j}`} className="flex items-center justify-between">
                              <span className="text-sm">{agent.name}</span>
                              <Badge 
                                variant={agent.averageScore >= 80 ? "success" : agent.averageScore >= 70 ? "outline" : "destructive"} 
                                className="text-xs"
                              >
                                {agent.averageScore}%
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        <Button 
          onClick={onViewHistory} 
          variant="outline" 
          className="w-full mt-6"
        >
          Ver historial completo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
