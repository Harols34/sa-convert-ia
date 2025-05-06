
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart } from "lucide-react";
import { DailyReport } from "@/lib/types";
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
}

const GlobalAnalysisSection: React.FC<GlobalAnalysisSectionProps> = ({
  reports,
  loadingReports,
  onViewDetailedAnalysis,
  onChangeDateRange,
  selectedDays,
  isDropdown,
  hasCalls = false
}) => {
  // Calculate global metrics from reports
  const calculateMetrics = () => {
    if (!reports || reports.length === 0 || !hasCalls) {
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

  // Prepare chart data
  const chartData = reports && reports.length > 0 
    ? [...reports].reverse().map(report => ({
        date: new Date(report.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
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
        ) : hasCalls && metrics.totalCalls > 0 ? (
          <div className="space-y-6">
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
