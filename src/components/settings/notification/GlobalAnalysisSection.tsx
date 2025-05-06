
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, BarChart, TrendingUp, TrendingDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Componente para visualizar tendencias e insights
const InsightItem = ({ 
  text, 
  type, 
  trend 
}: { 
  text: string, 
  type: "positive" | "negative" | "neutral",
  trend?: "up" | "down" | "stable" 
}) => {
  const getIcon = () => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 mr-2 text-green-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 mr-2 text-red-500" />;
    if (type === "positive") return <Activity className="h-4 w-4 mr-2 text-green-500" />;
    if (type === "negative") return <Activity className="h-4 w-4 mr-2 text-amber-500" />;
    return <Activity className="h-4 w-4 mr-2 text-blue-500" />;
  };
  
  return (
    <div className="flex items-start mb-3">
      {getIcon()}
      <span className="text-sm">{text}</span>
    </div>
  );
};

interface GlobalAnalysisSectionProps {
  reports: any[];
  loadingReports: boolean;
  onViewDetailedAnalysis: () => void;
  onChangeDateRange: (days: number) => void;
  selectedDays: number;
  isDropdown: boolean;
}

export default function GlobalAnalysisSection({
  reports,
  loadingReports,
  onViewDetailedAnalysis,
  onChangeDateRange,
  selectedDays,
  isDropdown
}: GlobalAnalysisSectionProps) {

  // Función para analizar tendencias y generar insights personalizados
  const generateInsights = (reports: any[]) => {
    if (!reports || reports.length === 0) return {
      positives: [],
      negatives: [],
      trends: { score: "stable", volume: "stable" }
    };
    
    // Ordenar por fecha para analizar correctamente
    const sortedReports = [...reports].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Calcular métricas globales
    const totalCalls = sortedReports.reduce((sum, r) => sum + r.callCount, 0);
    const avgScore = Math.round(
      sortedReports.reduce((sum, r) => sum + r.averageScore, 0) / sortedReports.length
    );
    
    // Analizar tendencias
    let scoreTrend = "stable";
    let volumeTrend = "stable";
    
    if (sortedReports.length > 1) {
      const firstHalf = sortedReports.slice(0, Math.floor(sortedReports.length / 2));
      const secondHalf = sortedReports.slice(Math.floor(sortedReports.length / 2));
      
      const avgScoreFirstHalf = firstHalf.reduce((sum, r) => sum + r.averageScore, 0) / firstHalf.length;
      const avgScoreSecondHalf = secondHalf.reduce((sum, r) => sum + r.averageScore, 0) / secondHalf.length;
      
      const avgVolumeFirstHalf = firstHalf.reduce((sum, r) => sum + r.callCount, 0) / firstHalf.length;
      const avgVolumeSecondHalf = secondHalf.reduce((sum, r) => sum + r.callCount, 0) / secondHalf.length;
      
      // Determinar tendencias
      if (avgScoreSecondHalf - avgScoreFirstHalf > 3) scoreTrend = "up";
      else if (avgScoreFirstHalf - avgScoreSecondHalf > 3) scoreTrend = "down";
      
      if (avgVolumeSecondHalf - avgVolumeFirstHalf > 1) volumeTrend = "up";
      else if (avgVolumeFirstHalf - avgVolumeSecondHalf > 1) volumeTrend = "down";
    }
    
    // Identificar agentes destacados y con oportunidades
    const allAgents = [];
    for (const report of sortedReports) {
      for (const agent of report.agents) {
        const existingAgent = allAgents.find(a => a.id === agent.id);
        if (existingAgent) {
          existingAgent.totalCalls += agent.callCount;
          existingAgent.scoreSum += agent.averageScore * agent.callCount;
        } else {
          allAgents.push({
            id: agent.id,
            name: agent.name,
            totalCalls: agent.callCount,
            scoreSum: agent.averageScore * agent.callCount
          });
        }
      }
    }
    
    // Calcular score promedio por agente
    allAgents.forEach(agent => {
      agent.averageScore = Math.round(agent.scoreSum / agent.totalCalls);
    });
    
    // Ordenar por score
    allAgents.sort((a, b) => b.averageScore - a.averageScore);
    const topAgent = allAgents.length > 0 ? allAgents[0] : null;
    const bottomAgent = allAgents.length > 1 ? allAgents[allAgents.length - 1] : null;
    
    // Generar insights personalizados basados en los datos
    const positives = [];
    const negatives = [];
    
    // Insights sobre calidad
    if (avgScore >= 85) {
      positives.push("Excelente nivel de calidad general en atención al cliente");
    } else if (avgScore >= 75) {
      positives.push("Nivel satisfactorio de calidad en servicio al cliente");
    } else if (avgScore >= 65) {
      positives.push("Calidad de atención aceptable con margen de mejora");
    } else {
      negatives.push("Nivel de calidad por debajo del estándar esperado");
    }
    
    // Insights sobre tendencias
    if (scoreTrend === "up") {
      positives.push("Tendencia positiva en calidad de atención");
    } else if (scoreTrend === "down") {
      negatives.push("Tendencia preocupante: disminución en calidad de servicio");
    } else {
      positives.push("Consistencia en mantener estándares de calidad");
    }
    
    // Insights sobre volumen
    if (volumeTrend === "up") {
      if (scoreTrend === "up" || scoreTrend === "stable") {
        positives.push("Aumento de volumen gestionado sin sacrificar calidad");
      } else {
        negatives.push("El aumento de volumen está afectando la calidad de atención");
      }
    } else if (volumeTrend === "down" && scoreTrend !== "up") {
      negatives.push("Reducción de volumen sin mejora proporcional en calidad");
    }
    
    // Insights sobre agentes
    if (topAgent && bottomAgent && topAgent.averageScore - bottomAgent.averageScore > 20) {
      negatives.push("Alta disparidad en desempeño entre agentes requiere homogeneización");
    }
    
    if (topAgent && topAgent.averageScore > 85) {
      positives.push(`Destaca ${topAgent.name} con excelente desempeño consistente`);
    }
    
    if (bottomAgent && bottomAgent.averageScore < 65) {
      negatives.push(`Oportunidad de desarrollo para agente con menor desempeño`);
    }
    
    // Insights basados en volumen
    if (totalCalls < 10 && reports.length >= 7) {
      negatives.push("Volumen bajo de llamadas sugiere revisar capacidad operativa");
    } else if (totalCalls > 50 && reports.length <= 7) {
      positives.push("Alta capacidad de gestión de volumen demostrada");
    }
    
    // Asegurar suficientes insights
    if (positives.length < 3) {
      const additionalPositives = [
        "Cumplimiento de protocolos básicos de atención",
        "Gestión efectiva de casos según prioridades",
        "Comunicación profesional con los clientes",
        "Base sólida para desarrollo de mejoras continuas",
        "Potencial para implementación de técnicas avanzadas"
      ];
      
      for (const insight of additionalPositives) {
        if (positives.length >= 3) break;
        positives.push(insight);
      }
    }
    
    if (negatives.length < 3) {
      const additionalNegatives = [
        "Oportunidad de mejorar técnicas de indagación de necesidades",
        "Potencial para optimizar tiempos de respuesta",
        "Posibilidad de incrementar ofertas complementarias",
        "Margen para perfeccionar técnicas de cierre y seguimiento",
        "Área de mejora en personalización de propuestas"
      ];
      
      for (const insight of additionalNegatives) {
        if (negatives.length >= 3) break;
        negatives.push(insight);
      }
    }
    
    return {
      positives: positives.slice(0, 3),
      negatives: negatives.slice(0, 3),
      trends: { score: scoreTrend, volume: volumeTrend }
    };
  };
  
  // Generar insights basados en los reportes
  const insights = React.useMemo(() => generateInsights(reports), [reports]);

  if (loadingReports) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Cargando análisis global...</p>
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
            <BarChart className="mb-2 h-10 w-10 text-muted-foreground" />
            <h3 className="font-medium">No hay datos para análisis</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              No se encontraron datos suficientes para el análisis global.
            </p>
            <Button onClick={onViewDetailedAnalysis} variant="outline" size="sm">
              Ver análisis detallado <ArrowRight className="ml-2 h-4 w-4" />
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
          <h3 className="font-medium text-lg">Análisis Global</h3>
          {!isDropdown && (
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
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Aspectos positivos:</h4>
            <div className="space-y-1">
              {insights.positives.map((positive, i) => (
                <InsightItem 
                  key={`positive-${i}`} 
                  text={positive} 
                  type="positive" 
                  trend={positive.includes("Tendencia positiva") ? "up" : undefined}
                />
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Aspectos a mejorar:</h4>
            <div className="space-y-1">
              {insights.negatives.map((negative, i) => (
                <InsightItem 
                  key={`negative-${i}`} 
                  text={negative} 
                  type="negative" 
                  trend={negative.includes("Tendencia preocupante") ? "down" : undefined}
                />
              ))}
            </div>
          </div>
        </div>
        
        <Button 
          onClick={onViewDetailedAnalysis} 
          variant="outline" 
          className="w-full mt-6"
        >
          Ver análisis detallado <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
