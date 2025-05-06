
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3 } from "lucide-react";
import { DailyReport } from "@/hooks/useDailyReports";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DailyReportSectionProps {
  reports: DailyReport[];
  loadingReports: boolean;
  onViewHistory: () => void;
  onChangeDateRange: (days: number) => void;
  selectedDays: number;
}

export default function DailyReportSection({
  reports,
  loadingReports,
  onViewHistory,
  onChangeDateRange,
  selectedDays
}: DailyReportSectionProps) {
  const navigate = useNavigate();
  
  const getMostRecentReport = () => {
    if (!reports || reports.length === 0) return null;
    // The most recent report should be the first in the array
    return reports[0];
  };
  
  const handleViewHistory = () => {
    if (onViewHistory) {
      onViewHistory();
    } else {
      navigate("/calls");
    }
  };
  
  const mostRecentReport = getMostRecentReport();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resumen Diario de Cargas
          </CardTitle>
          <CardDescription>
            Análisis de las llamadas más recientes
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
        ) : !mostRecentReport ? (
          <p className="text-center text-sm text-muted-foreground">
            No hay reportes disponibles
          </p>
        ) : (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h4 className="text-sm font-semibold">
                {mostRecentReport.date} - {mostRecentReport.callCount} llamadas
              </h4>
            </div>
            
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium">Hallazgos principales:</h5>
              </div>
              
              <div>
                <h6 className="text-sm text-muted-foreground mb-1">Aspectos positivos:</h6>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {mostRecentReport.topFindings.positive.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h6 className="text-sm text-muted-foreground mb-1">Aspectos negativos:</h6>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {mostRecentReport.topFindings.negative.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h6 className="text-sm text-muted-foreground mb-1">Oportunidades:</h6>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {mostRecentReport.topFindings.opportunities.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleViewHistory}>
                Ver historial completo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
