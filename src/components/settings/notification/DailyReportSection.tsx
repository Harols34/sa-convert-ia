import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowDown, ArrowUp, MessageSquare, Minus, Calendar, Phone } from "lucide-react";
import { DailyReport } from "@/components/settings/notification/types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyReportSectionProps {
  reports: DailyReport[];
  isLoading: boolean;
  error: string | null;
  onReload?: () => void;
  onViewHistory?: () => void;
}

const formatReportDate = (dateStr: string) => {
  try {
    // Check if the date is already in the format "dd MMMM yyyy"
    if (dateStr.match(/^\d{2} [a-zA-Z]+ \d{4}$/)) {
      return dateStr;
    }
    
    // Otherwise, parse the date and format it
    const date = new Date(dateStr);
    return format(date, 'dd MMMM yyyy', { locale: es });
  } catch (err) {
    console.error("Error formatting date:", err);
    return dateStr;
  }
};

const DailyReportSection: React.FC<DailyReportSectionProps> = ({ 
  reports, 
  isLoading, 
  error, 
  onReload, 
  onViewHistory 
}) => {
  const [expandedReportIndex, setExpandedReportIndex] = useState<number | null>(null);
  
  const toggleReport = (index: number) => {
    setExpandedReportIndex(expandedReportIndex === index ? null : index);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Reportes Diarios</CardTitle>
          <CardDescription>Análisis de los últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Reportes Diarios</CardTitle>
          <CardDescription>Análisis de los últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
            {error}
            {onReload && (
              <Button 
                variant="outline" 
                onClick={onReload}
                className="mt-2"
              >
                Reintentar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Reportes Diarios</CardTitle>
          <CardDescription>Análisis de los últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="font-medium text-lg mb-2">No hay reportes disponibles</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No hay llamadas analizadas en los últimos días.
            </p>
            {onReload && (
              <Button 
                variant="outline" 
                onClick={onReload}
              >
                Actualizar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle>Reportes Diarios</CardTitle>
          <CardDescription>Análisis de los últimos {reports.length} días</CardDescription>
        </div>
        <div className="flex space-x-2">
          {onReload && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onReload}
            >
              Actualizar
            </Button>
          )}
          {onViewHistory && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewHistory}
            >
              Ver Historial
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reports.map((report, index) => (
          <div 
            key={index} 
            className="border rounded-lg overflow-hidden"
          >
            <div 
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleReport(index)}
            >
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <span className="font-medium">{formatReportDate(report.date)}</span>
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    {report.callCount} llamadas
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end">
                  <div className="flex items-center">
                    <div className="ml-2">
                      {report.trend === "up" && <ArrowUp className="text-green-500 h-4 w-4" />}
                      {report.trend === "down" && <ArrowDown className="text-red-500 h-4 w-4" />}
                      {report.trend === "stable" && <Minus className="text-amber-500 h-4 w-4" />}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  {expandedReportIndex === index ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {expandedReportIndex === index && (
              <div className="p-4 border-t bg-muted/20">
                {/* AI-generated insights section */}
                <div className="mb-4 p-3 bg-primary/5 rounded-md">
                  <div className="flex items-start mb-2">
                    <MessageSquare className="h-5 w-5 text-primary mr-2 mt-1" />
                    <div>
                      <h4 className="font-medium text-sm">Análisis Personalizado por IA</h4>
                      <p className="text-sm mt-1">{report.aiInsights?.summary || "No hay análisis disponible para este día."}</p>
                    </div>
                  </div>
                  
                  {report.aiInsights?.recommendations && report.aiInsights.recommendations.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium mb-1">Recomendaciones:</h5>
                      <ul className="space-y-1">
                        {report.aiInsights.recommendations.map((recommendation, i) => (
                          <li key={i} className="text-sm pl-4 relative before:content-['•'] before:absolute before:left-0 before:top-0">
                            {recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Aspectos Positivos</h4>
                    <ul className="space-y-1">
                      {report.topFindings?.positive.map((finding, i) => (
                        <li key={i} className="text-sm text-green-600 pl-4 relative before:content-['✓'] before:absolute before:left-0 before:top-0">
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Aspectos Negativos</h4>
                    <ul className="space-y-1">
                      {report.topFindings?.negative.map((finding, i) => (
                        <li key={i} className="text-sm text-red-600 pl-4 relative before:content-['✗'] before:absolute before:left-0 before:top-0">
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {report.topFindings?.opportunities && report.topFindings.opportunities.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm mb-2">Oportunidades de Mejora</h4>
                    <ul className="space-y-1">
                      {report.topFindings.opportunities.map((opportunity, i) => (
                        <li key={i} className="text-sm text-amber-600 pl-4 relative before:content-['→'] before:absolute before:left-0 before:top-0">
                          {opportunity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DailyReportSection;
