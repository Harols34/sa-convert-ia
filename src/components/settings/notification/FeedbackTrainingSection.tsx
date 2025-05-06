
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

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
  onChangeDateRange: (days: number) => void;
  selectedDays: number;
}

export default function FeedbackTrainingSection({
  groupedAgents,
  loadingReports,
  onGenerateReport,
  onChangeDateRange,
  selectedDays
}: FeedbackTrainingSectionProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentGrouped | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [trainingPlan, setTrainingPlan] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const navigate = useNavigate();
  
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

  // Function to generate a training plan for an agent
  const generateTrainingPlan = async (agent: AgentGrouped) => {
    setSelectedAgent(agent);
    setGeneratingPlan(true);
    setPlanOpen(true);
    
    try {
      // Generate the plan - we'll create a realistic text for now
      const recommendations = getTrainingRecommendations(agent.averageScore);
      
      const planText = `# Plan de Formación para ${agent.name}

## Resumen del Desempeño
- **Calificación promedio**: ${agent.averageScore}/100
- **Total llamadas analizadas**: ${agent.totalCalls}
- **Fortalezas**: ${agent.averageScore > 80 ? "Comunicación, seguimiento de protocolos" : "Atención básica al cliente"}
- **Áreas de mejora**: ${agent.averageScore < 75 ? "Técnicas de venta, manejo de objeciones" : "Ventas cruzadas, cierre efectivo"}

## Recomendaciones de Capacitación
${recommendations.map(r => `- ${r}`).join('\n')}

## Plan de Acción
1. **Semana 1-2**: Formación intensiva en ${recommendations[0].toLowerCase()}
2. **Semana 3-4**: Talleres prácticos sobre ${recommendations[1].toLowerCase()} 
3. **Semana 5**: Evaluación de progreso y ajustes al plan
4. **Semana 6-8**: Seguimiento y mentoría personalizada

## Métricas de Éxito
- Incremento de 10% en calificación promedio
- Reducción de 15% en tiempo de resolución
- Aumento de 20% en satisfacción del cliente

Generado el ${new Date().toLocaleDateString()} | ID Plan: TRAINING-${agent.id.substring(0, 8)}`;
      
      setTrainingPlan(planText);
      
      // Save to our training_plans table
      const { error } = await supabase
        .from('training_plans')
        .insert({
          agent_id: agent.id,
          plan_content: planText,
          created_at: new Date().toISOString(),
          status: 'active'
        });
        
      if (error) {
        console.error("Error saving training plan:", error);
        throw error;
      } else {
        toast.success("Plan de formación guardado correctamente");
      }
      
    } catch (error) {
      console.error("Error generating training plan:", error);
      toast.error("Error al generar el plan de formación");
    } finally {
      setGeneratingPlan(false);
    }
  };
  
  // Function to handle the download of the training plan
  const handleDownloadPlan = () => {
    if (!trainingPlan) return;
    
    const element = document.createElement("a");
    const file = new Blob([trainingPlan], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `plan_formacion_${selectedAgent?.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast.success("Plan de formación descargado");
  };
  
  // Function to generate a complete report for all agents
  const handleGenerateFullReport = async () => {
    if (groupedAgents.length === 0) {
      toast.error("No hay datos disponibles para generar un reporte");
      return;
    }
    
    toast.loading("Generando reporte completo", { id: "generate-report" });
    
    try {
      // Generate a comprehensive report for all agents
      let reportText = `# REPORTE COMPLETO DE FORMACIÓN\n\n`;
      reportText += `Fecha de generación: ${new Date().toLocaleDateString()}\n`;
      reportText += `Total de agentes analizados: ${groupedAgents.length}\n\n`;
      reportText += `Periodo: ${selectedDays === 0 ? "Todas las llamadas" : `Últimos ${selectedDays} días`}\n\n`;
      
      groupedAgents.forEach(agent => {
        reportText += `## ${agent.name}\n`;
        reportText += `- Calificación promedio: ${agent.averageScore}/100\n`;
        reportText += `- Total llamadas: ${agent.totalCalls}\n`;
        reportText += `- Recomendaciones de capacitación:\n`;
        
        const recs = getTrainingRecommendations(agent.averageScore);
        recs.forEach(rec => {
          reportText += `  - ${rec}\n`;
        });
        
        reportText += '\n';
      });
      
      // Create and trigger download
      const element = document.createElement("a");
      const file = new Blob([reportText], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = "reporte_completo_formacion.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      // Also save to our training_reports table
      const { error } = await supabase
        .from('training_reports')
        .insert({
          report_content: reportText,
          agent_count: groupedAgents.length
        });
        
      if (error) {
        console.error("Error saving training report:", error);
        throw error;
      }
        
      toast.success("Reporte completo generado y guardado", { id: "generate-report" });
    } catch (error) {
      console.error("Error generating complete report:", error);
      toast.error("Error al generar el reporte completo", { id: "generate-report" });
    }
  };
  
  // If no data is available, show a message with button to go to calls page
  if (!loadingReports && groupedAgents.length === 0) {
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
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
          <p className="text-center text-sm text-muted-foreground">
            No hay datos de agentes disponibles para este periodo.
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Para generar feedback para formación, necesitas tener llamadas analizadas con agentes asignados.
          </p>
          
          <div className="flex space-x-2">
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
            
            <Button variant="outline" size="sm" onClick={() => navigate('/calls')}>
              Ver llamadas
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Feedback para Formación
            </CardTitle>
            <CardDescription>
              Retroalimentación específica para agentes
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
                        onClick={() => generateTrainingPlan(agent)}
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateFullReport}
              disabled={groupedAgents.length === 0}
            >
              Generar reporte completo
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialog for displaying the training plan */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAgent ? `Plan de Formación para ${selectedAgent.name}` : "Plan de Formación"}
            </DialogTitle>
            <DialogDescription>
              Plan personalizado basado en el análisis de desempeño
            </DialogDescription>
          </DialogHeader>
          
          {generatingPlan ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">Generando plan personalizado...</p>
            </div>
          ) : (
            <Textarea 
              value={trainingPlan} 
              readOnly
              rows={15}
              className="font-mono text-sm"
            />
          )}
          
          <DialogFooter>
            <Button 
              onClick={handleDownloadPlan}
              disabled={generatingPlan || !trainingPlan}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Descargar Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
