
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DailyReport } from "@/hooks/useDailyReports";
import { useNavigate } from "react-router-dom";

interface DailyReportSectionProps {
  reports: DailyReport[];
  loadingReports: boolean;
  onViewHistory: () => void;
}

export default function DailyReportSection({ reports, loadingReports, onViewHistory }: DailyReportSectionProps) {
  const navigate = useNavigate();
  
  // Helper function to generate default findings if none are present
  const getDefaultFindings = (type: 'positive' | 'negative' | 'opportunities') => {
    if (type === 'positive') {
      return ["Atención al cliente adecuada", "Seguimiento de protocolos", "Comunicación clara"];
    } else if (type === 'negative') {
      return ["Tiempo de espera mejorable", "Falta de seguimiento", "Información incompleta"];
    } else {
      return ["Mejorar indagación de necesidades", "Capacitación en productos", "Optimizar cierres"];
    }
  };

  return (
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
                              getDefaultFindings('positive').map((item, i) => (
                                <li key={i}>{item}</li>
                              ))
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
                              getDefaultFindings('negative').map((item, i) => (
                                <li key={i}>{item}</li>
                              ))
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
                              getDefaultFindings('opportunities').map((item, i) => (
                                <li key={i}>{item}</li>
                              ))
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/calls")}
          >
            Ver historial completo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
