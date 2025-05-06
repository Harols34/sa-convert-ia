
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, MessageSquare } from "lucide-react";
import { DailyReport } from "@/components/settings/notification/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart as RechartAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export interface GlobalAnalysisSectionProps {
  reports: DailyReport[];
  loadingReports: boolean;
  onViewDetailedAnalysis: () => void;
  onChangeDateRange: (days: number) => void;
  selectedDays: number;
  isDropdown: boolean;
  hasCalls?: boolean;
  globalInsights?: {
    summary: string;
    recommendations: string[];
  };
}

const GlobalAnalysisSection: React.FC<GlobalAnalysisSectionProps> = ({
  reports,
  loadingReports,
  onViewDetailedAnalysis,
  onChangeDateRange,
  selectedDays,
  isDropdown,
  hasCalls = true,
  globalInsights
}) => {
  // Calculate global metrics from reports
  const calculateMetrics = () => {
    if (!reports || reports.length === 0) {
      return {
        totalCalls: 0,
        avgScore: 0,
        callsWithIssues: 0,
        issuePercentage: 0
      };
    }

    const totalCalls = reports.reduce((sum, report) => sum + (report.callCount || 0), 0);
    const weightedScoreSum = reports.reduce((sum, report) => 
      sum + ((report.averageScore || 0) * (report.callCount || 0)), 0);
    const avgScore = totalCalls > 0 ? Math.round(weightedScoreSum / totalCalls) : 0;

    // Calculate issues
    const callsWithIssues = reports.reduce((sum, report) => sum + (report.issuesCount || 0), 0);
    const issuePercentage = totalCalls > 0 ? Math.round((callsWithIssues / totalCalls) * 100) : 0;

    return {
      totalCalls,
      avgScore,
      callsWithIssues, 
      issuePercentage
    };
  };

  const metrics = calculateMetrics();
  const hasCallData = metrics.totalCalls > 0;

  // Prepare chart data
  const chartData = reports && reports.length > 0 
    ? [...reports].reverse().map(report => ({
        date: report.date ? new Date(report.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '',
        score: report.averageScore || 0,
        calls: report.callCount || 0
      }))
    : [];

  // Date range options
  const dateRangeOptions = [
    { value: "7", label: "7 días" },
    { value: "15", label: "15 días" },
    { value: "30", label: "30 días" },
    { value: "90", label: "90 días" }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-xl">Análisis Global</CardTitle>
          <CardDescription>Métricas de rendimiento</CardDescription>
        </div>
        <div className="flex space-x-2">
          {!isDropdown && (
            <Select 
              value={selectedDays.toString()} 
              onValueChange={(value) => onChangeDateRange(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="7 días" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={onViewDetailedAnalysis}>
            <AreaChart className="mr-2 h-4 w-4" />
            Análisis Detallado
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingReports ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : hasCallData ? (
          <div className="space-y-6">
            {/* AI Insights Section for Global Analysis */}
            {globalInsights && (
              <div className="p-4 bg-primary/5 rounded-md border mb-4">
                <div className="flex items-start mb-3">
                  <MessageSquare className="h-5 w-5 text-primary mr-2 mt-1" />
                  <div>
                    <h4 className="font-medium">Análisis de IA para el periodo de {selectedDays} días</h4>
                    <p className="text-sm mt-1">{globalInsights.summary}</p>
                  </div>
                </div>
                
                {globalInsights.recommendations && globalInsights.recommendations.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium mb-1">Recomendaciones:</h5>
                    <ul className="space-y-1">
                      {globalInsights.recommendations.map((recommendation, i) => (
                        <li key={i} className="text-sm pl-4 relative before:content-['•'] before:absolute before:left-0 before:top-0">
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-card rounded-lg border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Total Llamadas</p>
                <p className="text-2xl font-bold">{metrics.totalCalls}</p>
              </div>
              <div className="p-4 bg-card rounded-lg border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Score Promedio</p>
                <p className="text-2xl font-bold">{metrics.avgScore}%</p>
              </div>
              <div className="p-4 bg-card rounded-lg border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Llamadas con Problemas</p>
                <p className="text-2xl font-bold">{metrics.callsWithIssues}</p>
              </div>
              <div className="p-4 bg-card rounded-lg border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">% de Problemas</p>
                <p className="text-2xl font-bold">{metrics.issuePercentage}%</p>
              </div>
            </div>

            {chartData.length > 1 && (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartAreaChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" stroke="#03A678" fill="#03A678" fillOpacity={0.2} name="Score" />
                  </RechartAreaChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Positive and negative findings summary */}
            {reports.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="border rounded-md p-4">
                  <h4 className="font-medium mb-2">Principales Aspectos Positivos</h4>
                  <ul className="space-y-1">
                    {Array.from(new Set(reports.flatMap(r => r.topFindings?.positive || [])
                      .filter(item => item !== "No hay datos disponibles")))
                      .slice(0, 5)
                      .map((finding, i) => (
                        <li key={i} className="text-sm text-green-600 pl-4 relative before:content-['✓'] before:absolute before:left-0 before:top-0">
                          {finding}
                        </li>
                      ))}
                    {reports.flatMap(r => r.topFindings?.positive || []).filter(item => item !== "No hay datos disponibles").length === 0 && (
                      <li className="text-sm text-muted-foreground">No hay datos suficientes</li>
                    )}
                  </ul>
                </div>
                
                <div className="border rounded-md p-4">
                  <h4 className="font-medium mb-2">Principales Aspectos a Mejorar</h4>
                  <ul className="space-y-1">
                    {Array.from(new Set(reports.flatMap(r => r.topFindings?.negative || [])
                      .filter(item => item !== "No hay datos disponibles")))
                      .slice(0, 5)
                      .map((finding, i) => (
                        <li key={i} className="text-sm text-red-600 pl-4 relative before:content-['✗'] before:absolute before:left-0 before:top-0">
                          {finding}
                        </li>
                      ))}
                    {reports.flatMap(r => r.topFindings?.negative || []).filter(item => item !== "No hay datos disponibles").length === 0 && (
                      <li className="text-sm text-muted-foreground">No hay datos suficientes</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <p className="text-muted-foreground">No hay datos suficientes para mostrar un análisis global.</p>
            <p className="text-sm">Sube grabaciones de llamadas para comenzar a ver métricas aquí.</p>
            <Button variant="outline" size="sm" onClick={onViewDetailedAnalysis}>
              Ver Panel de Análisis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GlobalAnalysisSection;
