
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, UserRound } from "lucide-react";
import { AgentGrouped } from "@/components/settings/notification/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export interface FeedbackTrainingSectionProps {
  groupedAgents: AgentGrouped[];
  loadingReports: boolean;
  onGenerateReport: () => void;
  onChangeDateRange?: (days: number) => void;
  selectedDays?: number;
  hasCalls?: boolean;
  onViewHistory?: () => void; // Added this missing prop
}

const FeedbackTrainingSection: React.FC<FeedbackTrainingSectionProps> = ({
  groupedAgents,
  loadingReports,
  onGenerateReport,
  onChangeDateRange,
  selectedDays,
  hasCalls = true, // Default to true to show data
  onViewHistory // Include the prop in component parameters
}) => {
  // Top 3 agents based on total calls or score
  const topAgents = groupedAgents && groupedAgents.length > 0 ? groupedAgents.slice(0, 3) : [];
  const hasAgentData = topAgents.length > 0;

  // Generate dynamic improvement opportunities based on agent data
  const generateImprovementOpportunities = () => {
    if (!hasAgentData) return [];

    // Calculate average score across all agents
    const avgScore = Math.round(
      topAgents.reduce((sum, agent) => sum + agent.averageScore, 0) / topAgents.length
    );

    const opportunities = [];

    // Generate dynamic improvement suggestions based on average score
    if (avgScore < 70) {
      opportunities.push("Fortalecer conocimiento de producto para resolver consultas técnicas");
      opportunities.push("Mejorar manejo de objeciones sobre precio");
      opportunities.push("Implementar guiones de ventas más efectivos");
    } else if (avgScore < 80) {
      opportunities.push("Optimizar técnicas de cierre efectivo de venta");
      opportunities.push("Aumentar conocimiento sobre ventajas competitivas");
      opportunities.push("Desarrollar habilidades de escucha activa y empatía");
    } else {
      opportunities.push("Potenciar técnicas de venta cruzada");
      opportunities.push("Perfeccionar preguntas para descubrir necesidades ocultas");
      opportunities.push("Fortalecer habilidades de negociación avanzada");
    }

    return opportunities;
  };

  const improvementOpportunities = generateImprovementOpportunities();

  // Add the missing handler for onViewHistory
  const handleViewHistory = () => {
    if (onViewHistory) {
      onViewHistory();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-xl">Feedback para Training</CardTitle>
          <CardDescription>Resultados para optimizar entrenamiento</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onGenerateReport}>
          <LineChart className="mr-2 h-4 w-4" />
          Generar Reporte
        </Button>
      </CardHeader>
      <CardContent>
        {loadingReports ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : hasAgentData ? (
          <div className="space-y-6">
            <div className="space-y-4">
              {topAgents.map((agent) => (
                <div key={agent.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{agent.name}</span>
                    </div>
                    <span className="text-sm">{agent.averageScore}%</span>
                  </div>
                  <Progress value={agent.averageScore} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Total llamadas: {agent.totalCalls}</span>
                    <span>
                      {agent.averageScore >= 80 ? "Excelente" : 
                       agent.averageScore >= 70 ? "Bueno" : 
                       agent.averageScore >= 60 ? "Regular" : "Necesita mejorar"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Oportunidades de Mejora Detectadas</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {improvementOpportunities.map((opportunity, index) => (
                  <li key={index}>{opportunity}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <UserRound className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">No hay datos de agentes disponibles</p>
              <p className="text-sm">Sube grabaciones de llamadas para comenzar a ver métricas por agente.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleViewHistory}>
              Ver Panel de Agentes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackTrainingSection;
