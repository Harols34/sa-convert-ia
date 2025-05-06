
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

// Type definition for the grouped agent
type AgentGrouped = {
  id: string;
  name: string;
  totalCalls: number;
  averageScore: number;
  datePoints: {
    date: string;
    score: number;
    callCount: number;
  }[];
};

interface FeedbackTrainingSectionProps {
  groupedAgents: AgentGrouped[];
  loadingReports: boolean;
  onGenerateReport: () => void;
}

export default function FeedbackTrainingSection({
  groupedAgents,
  loadingReports,
  onGenerateReport
}: FeedbackTrainingSectionProps) {
  
  // Function to generate training recommendations based on score
  const getTrainingRecommendations = (score: number) => {
    if (score < 70) {
      return [
        "Capacitación en protocolos de atención al cliente",
        "Refuerzo en técnicas de comunicación efectiva",
        "Seguimiento del guion de llamada"
      ];
    } else if (score < 85) {
      return [
        "Mejora en técnicas de negociación",
        "Refuerzo en conocimiento de productos"
      ];
    } else {
      return [
        "Desarrollo de habilidades de liderazgo",
        "Capacitación para ser mentor de otros agentes"
      ];
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Feedback para Formación
        </CardTitle>
        <CardDescription>
          Retroalimentación específica para agentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingReports ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : groupedAgents.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No hay datos disponibles para mostrar
          </p>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-4">
              {groupedAgents.map((agent, idx) => (
                <div key={idx} className="border-b pb-4 last:border-0">
                  <h4 className="font-medium">{agent.name}</h4>
                  <div className="flex items-center mt-1 mb-2">
                    <span className="text-sm text-muted-foreground">{agent.totalCalls} llamadas totales</span>
                    <span className="mx-2">•</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      agent.averageScore >= 80 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : agent.averageScore >= 60
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    }`}>
                      Promedio: {agent.averageScore}/100
                    </span>
                  </div>
                  
                  <div className="text-sm">
                    <h5 className="font-medium mb-1">Áreas de mejora recomendadas:</h5>
                    <ul className="list-disc pl-5">
                      {getTrainingRecommendations(agent.averageScore).map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex justify-end mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        toast.success(`Plan de formación para ${agent.name}`, {
                          description: "Plan personalizado generado correctamente"
                        });
                      }}
                    >
                      Ver plan de formación
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onGenerateReport}>
            Generar reporte completo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
