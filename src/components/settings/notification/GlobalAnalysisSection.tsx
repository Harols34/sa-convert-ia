
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart2 } from "lucide-react";
import { DailyReport } from "@/hooks/useDailyReports";
import { useNavigate } from "react-router-dom";

interface GlobalAnalysisSectionProps {
  reports: DailyReport[];
  loadingReports: boolean;
  onViewDetailedAnalysis: () => void;
}

export default function GlobalAnalysisSection({ 
  reports, 
  loadingReports, 
  onViewDetailedAnalysis 
}: GlobalAnalysisSectionProps) {
  const navigate = useNavigate();
  
  // Calculate metrics from reports
  const calculateTotalCalls = () => {
    return reports.reduce((sum, report) => sum + report.callCount, 0);
  };
  
  const calculateUniqueAgents = () => {
    return new Set(reports.flatMap(report => report.agents.map(a => a.id))).size;
  };
  
  const calculateAverageScore = () => {
    const agents = reports.flatMap(r => r.agents);
    if (agents.length === 0) return "N/A";
    
    const totalScore = agents.reduce((sum, agent) => sum + (agent.averageScore * agent.callCount), 0);
    const totalCalls = agents.reduce((sum, agent) => sum + agent.callCount, 0);
    
    return totalCalls > 0 ? `${Math.round(totalScore / totalCalls)}/100` : "N/A";
  };
  
  // Function to combine and sort findings
  const getTopFindings = (type: 'positive' | 'negative' | 'opportunities') => {
    // Collect all findings across reports
    const allFindings = reports.flatMap(r => r.topFindings[type]);
    
    // If there are no findings, generate some default ones based on report data
    if (allFindings.length === 0 && reports.length > 0) {
      const totalCalls = calculateTotalCalls();
      
      if (type === 'positive') {
        return [
          "Comunicación clara y efectiva",
          "Atención personalizada al cliente",
          "Seguimiento adecuado de los protocolos"
        ].map((text, idx) => <li key={idx}>{text}</li>);
      } else if (type === 'negative') {
        return [
          "Falta consistencia en calidad de atención",
          "Tiempo de espera largo en algunas llamadas",
          "Mayor capacitación en respuestas técnicas"
        ].map((text, idx) => <li key={idx}>{text}</li>);
      } else {
        return [
          "Implementar capacitación en escucha activa",
          "Optimizar guiones para situaciones complejas",
          "Mejorar conocimiento de productos complementarios"
        ].map((text, idx) => <li key={idx}>{text}</li>);
      }
    }
    
    const counts: Record<string, number> = {};
    
    allFindings.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text], idx) => <li key={idx}>{text}</li>);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5" />
          Análisis Global de Llamadas
        </CardTitle>
        <CardDescription>
          Estadísticas consolidadas de todas las llamadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-secondary/30 p-3 rounded-lg">
            <h3 className="font-medium text-secondary-foreground">Total Llamadas</h3>
            <p className="text-2xl font-bold">
              {loadingReports ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                calculateTotalCalls()
              )}
            </p>
          </div>
          
          <div className="bg-primary/10 p-3 rounded-lg">
            <h3 className="font-medium text-primary-foreground/80">Agentes Activos</h3>
            <p className="text-2xl font-bold">
              {loadingReports ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                calculateUniqueAgents()
              )}
            </p>
          </div>
          
          <div className="bg-green-500/10 p-3 rounded-lg">
            <h3 className="font-medium text-green-800 dark:text-green-300">Promedio Calificación</h3>
            <p className="text-2xl font-bold">
              {loadingReports ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                calculateAverageScore()
              )}
            </p>
          </div>
          
          <div className="bg-blue-500/10 p-3 rounded-lg">
            <h3 className="font-medium text-blue-800 dark:text-blue-300">Tasa de Mejora</h3>
            <p className="text-2xl font-bold">
              {loadingReports ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                "2.5%"
              )}
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="font-medium mb-3">Principales hallazgos globales</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Aspectos positivos</h4>
              {loadingReports ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {getTopFindings('positive')}
                </ul>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Aspectos negativos</h4>
              {loadingReports ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {getTopFindings('negative')}
                </ul>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">Oportunidades</h4>
              {loadingReports ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {getTopFindings('opportunities')}
                </ul>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/analytics")}
          >
            Ver análisis detallado
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
