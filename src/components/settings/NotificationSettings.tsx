
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { Loader2, FileText, BarChart2, Users } from "lucide-react";
import { useDailyReports } from "@/hooks/useDailyReports";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// Define tipos para el agente agrupado
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

export default function NotificationSettings() {
  const { settings, isLoading, updateSetting } = useAudioSettings();
  const { reports, isLoading: loadingReports } = useDailyReports(7);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando configuraciones...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Función para agrupar agentes de todos los reportes
  const getGroupedAgents = (): AgentGrouped[] => {
    if (!reports || reports.length === 0) return [];
    
    const agentsMap: Record<string, AgentGrouped> = {};
    
    reports.forEach(report => {
      report.agents.forEach(agent => {
        if (!agentsMap[agent.id]) {
          agentsMap[agent.id] = {
            id: agent.id,
            name: agent.name,
            totalCalls: agent.callCount,
            averageScore: agent.averageScore,
            datePoints: [{
              date: report.date,
              score: agent.averageScore,
              callCount: agent.callCount
            }]
          };
        } else {
          agentsMap[agent.id].totalCalls += agent.callCount;
          agentsMap[agent.id].datePoints.push({
            date: report.date,
            score: agent.averageScore,
            callCount: agent.callCount
          });
        }
      });
    });
    
    // Convertir a array y ordenar por total de llamadas
    return Object.values(agentsMap).sort((a, b) => b.totalCalls - a.totalCalls);
  };

  const groupedAgents = getGroupedAgents();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Preferencias de Notificaciones</CardTitle>
          <CardDescription>
            Configura cómo y cuándo recibir notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium leading-none" htmlFor="auto_feedback">
              Recibir feedback automático
            </Label>
            <Switch id="auto_feedback"
              checked={settings?.auto_feedback}
              onCheckedChange={(checked) => updateSetting("auto_feedback", checked)} />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium leading-none" htmlFor="daily_summary">
              Recibir resumen diario de actividad
            </Label>
            <Switch id="daily_summary" defaultChecked={true} />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium leading-none" htmlFor="agent_notifications">
              Notificaciones de rendimiento de agentes
            </Label>
            <Switch id="agent_notifications" defaultChecked={true} />
          </div>
        </CardContent>
      </Card>
      
      {/* Resumen diario de cargas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resumen Diario de Cargas
          </CardTitle>
          <CardDescription>
            Actividad de los últimos 7 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No hay datos disponibles para mostrar
            </p>
          ) : (
            <ScrollArea className="h-72">
              <div className="space-y-6">
                {reports.map((report, idx) => (
                  <div key={idx} className="border-b pb-4 last:border-0">
                    <h4 className="font-medium mb-2">{report.date} - {report.callCount} llamadas</h4>
                    
                    {report.callCount > 0 ? (
                      <>
                        <h5 className="text-sm font-medium text-muted-foreground mt-3 mb-1">
                          Hallazgos principales:
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="font-medium text-green-600 dark:text-green-400">Aspectos positivos:</p>
                            <ul className="list-disc pl-5">
                              {report.topFindings.positive.length > 0 ? 
                                report.topFindings.positive.map((item, i) => (
                                  <li key={i}>{item}</li>
                                )) : 
                                <li className="text-muted-foreground">Sin datos</li>
                              }
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium text-red-600 dark:text-red-400">Aspectos negativos:</p>
                            <ul className="list-disc pl-5">
                              {report.topFindings.negative.length > 0 ? 
                                report.topFindings.negative.map((item, i) => (
                                  <li key={i}>{item}</li>
                                )) : 
                                <li className="text-muted-foreground">Sin datos</li>
                              }
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium text-amber-600 dark:text-amber-400">Oportunidades:</p>
                            <ul className="list-disc pl-5">
                              {report.topFindings.opportunities.length > 0 ? 
                                report.topFindings.opportunities.map((item, i) => (
                                  <li key={i}>{item}</li>
                                )) : 
                                <li className="text-muted-foreground">Sin datos</li>
                              }
                            </ul>
                          </div>
                        </div>
                        
                        {report.agents.length > 0 && (
                          <>
                            <h5 className="text-sm font-medium text-muted-foreground mt-3 mb-1">
                              Actividad por agente:
                            </h5>
                            <div className="space-y-2">
                              {report.agents.map((agent) => (
                                <div key={agent.id} className="flex items-center justify-between text-sm">
                                  <span>{agent.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground">{agent.callCount} llamadas</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      agent.averageScore >= 80 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                                        : agent.averageScore >= 60
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
                                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                                    }`}>
                                      {agent.averageScore}/100
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No se registraron llamadas este día
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm">
              Ver historial completo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Análisis Global */}
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
                  reports.reduce((sum, report) => sum + report.callCount, 0)
                )}
              </p>
            </div>
            
            <div className="bg-primary/10 p-3 rounded-lg">
              <h3 className="font-medium text-primary-foreground/80">Agentes Activos</h3>
              <p className="text-2xl font-bold">
                {loadingReports ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  new Set(reports.flatMap(report => report.agents.map(a => a.id))).size
                )}
              </p>
            </div>
            
            <div className="bg-green-500/10 p-3 rounded-lg">
              <h3 className="font-medium text-green-800 dark:text-green-300">Promedio Calificación</h3>
              <p className="text-2xl font-bold">
                {loadingReports ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  (() => {
                    const agents = reports.flatMap(r => r.agents);
                    if (agents.length === 0) return "N/A";
                    const totalScore = agents.reduce((sum, agent) => sum + (agent.averageScore * agent.callCount), 0);
                    const totalCalls = agents.reduce((sum, agent) => sum + agent.callCount, 0);
                    return totalCalls > 0 ? `${Math.round(totalScore / totalCalls)}/100` : "N/A";
                  })()
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
                    {(() => {
                      // Combinar todos los aspectos positivos de todos los reportes
                      const allPositives = reports.flatMap(r => r.topFindings.positive);
                      // Contar ocurrencias
                      const counts: Record<string, number> = {};
                      allPositives.forEach(item => {
                        counts[item] = (counts[item] || 0) + 1;
                      });
                      // Ordenar y tomar los 5 más frecuentes
                      return Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([text], idx) => <li key={idx}>{text}</li>);
                    })()}
                  </ul>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Aspectos negativos</h4>
                {loadingReports ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {(() => {
                      const allNegatives = reports.flatMap(r => r.topFindings.negative);
                      const counts: Record<string, number> = {};
                      allNegatives.forEach(item => {
                        counts[item] = (counts[item] || 0) + 1;
                      });
                      return Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([text], idx) => <li key={idx}>{text}</li>);
                    })()}
                  </ul>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">Oportunidades</h4>
                {loadingReports ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {(() => {
                      const allOpportunities = reports.flatMap(r => r.topFindings.opportunities);
                      const counts: Record<string, number> = {};
                      allOpportunities.forEach(item => {
                        counts[item] = (counts[item] || 0) + 1;
                      });
                      return Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([text], idx) => <li key={idx}>{text}</li>);
                    })()}
                  </ul>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm">
              Ver análisis detallado
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Feedback para Formación */}
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
          ) : reports.length === 0 ? (
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
                        {agent.averageScore < 70 ? (
                          <>
                            <li>Capacitación en protocolos de atención al cliente</li>
                            <li>Refuerzo en técnicas de comunicación efectiva</li>
                            <li>Seguimiento del guion de llamada</li>
                          </>
                        ) : agent.averageScore < 85 ? (
                          <>
                            <li>Mejora en técnicas de negociación</li>
                            <li>Refuerzo en conocimiento de productos</li>
                          </>
                        ) : (
                          <>
                            <li>Desarrollo de habilidades de liderazgo</li>
                            <li>Capacitación para ser mentor de otros agentes</li>
                          </>
                        )}
                      </ul>
                    </div>
                    
                    <div className="flex justify-end mt-2">
                      <Button variant="outline" size="sm">Ver plan de formación</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm">
              Generar reporte completo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
