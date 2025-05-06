
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyReport } from "@/components/settings/notification/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText } from "lucide-react";

interface FeedbackTrainingSectionProps {
  reports: DailyReport[];
  isLoading: boolean;
  onViewHistory?: () => void;
}

const FeedbackTrainingSection: React.FC<FeedbackTrainingSectionProps> = ({
  reports,
  isLoading,
  onViewHistory
}) => {
  // Get all the recommendations from all reports
  const getAllRecommendations = () => {
    if (!reports || reports.length === 0) return [];
    
    const recommendations = reports
      .flatMap(report => report.aiInsights?.recommendations || [])
      .filter(rec => rec.length > 0);
      
    // Remove duplicates and return only unique recommendations
    return Array.from(new Set(recommendations));
  };
  
  // Get all positive findings from all reports
  const getAllPositiveFindings = () => {
    if (!reports || reports.length === 0) return [];
    
    const findings = reports
      .flatMap(report => report.topFindings?.positive || [])
      .filter(finding => finding !== "No hay datos disponibles" && finding.length > 0);
      
    return Array.from(new Set(findings));
  };
  
  // Get all negative findings from all reports
  const getAllNegativeFindings = () => {
    if (!reports || reports.length === 0) return [];
    
    const findings = reports
      .flatMap(report => report.topFindings?.negative || [])
      .filter(finding => finding !== "No hay datos disponibles" && finding.length > 0);
      
    return Array.from(new Set(findings));
  };
  
  const recommendations = getAllRecommendations();
  const positiveFindings = getAllPositiveFindings();
  const negativeFindings = getAllNegativeFindings();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Entrenamiento con IA</CardTitle>
        <CardDescription>Recomendaciones y hallazgos para mejorar el desempeño</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recommendations.length > 0 || positiveFindings.length > 0 || negativeFindings.length > 0 ? (
          <div className="space-y-6">
            <div className="p-4 bg-primary/5 rounded-md border">
              <div className="flex items-start mb-3">
                <MessageSquare className="h-5 w-5 text-primary mr-2 mt-1" />
                <div>
                  <h4 className="font-medium">Principales Recomendaciones</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Basadas en el análisis de las llamadas realizadas
                  </p>
                </div>
              </div>
              
              <ul className="space-y-2 mt-3">
                {recommendations.slice(0, 5).map((recommendation, i) => (
                  <li key={i} className="text-sm pl-4 relative before:content-['•'] before:absolute before:left-0 before:top-0">
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-2">Buenas Prácticas Identificadas</h4>
                <ul className="space-y-1">
                  {positiveFindings.slice(0, 5).map((finding, i) => (
                    <li key={i} className="text-sm text-green-600 pl-4 relative before:content-['✓'] before:absolute before:left-0 before:top-0">
                      {finding}
                    </li>
                  ))}
                  {positiveFindings.length === 0 && (
                    <li className="text-sm text-muted-foreground">No hay datos suficientes</li>
                  )}
                </ul>
              </div>
              
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-2">Puntos de Mejora</h4>
                <ul className="space-y-1">
                  {negativeFindings.slice(0, 5).map((finding, i) => (
                    <li key={i} className="text-sm text-red-600 pl-4 relative before:content-['✗'] before:absolute before:left-0 before:top-0">
                      {finding}
                    </li>
                  ))}
                  {negativeFindings.length === 0 && (
                    <li className="text-sm text-muted-foreground">No hay datos suficientes</li>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={onViewHistory}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Ver Historial Completo
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="font-medium text-lg mb-2">No hay datos de entrenamiento</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sube grabaciones de llamadas para obtener recomendaciones de IA personalizadas.
            </p>
            {onViewHistory && (
              <Button 
                variant="outline"
                onClick={onViewHistory}
              >
                Ver Historial
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackTrainingSection;
