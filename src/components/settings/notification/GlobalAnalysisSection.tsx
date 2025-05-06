
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChartHorizontal } from "lucide-react";
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
  
  // Function to consolidate findings from all reports
  const getGlobalFindings = () => {
    if (!reports || reports.length === 0) {
      return {
        positive: ["No hay datos disponibles"],
        negative: ["No hay datos disponibles"],
        opportunities: ["No hay datos disponibles"]
      };
    }
    
    // Collect all findings from each report
    const allPositive: string[] = [];
    const allNegative: string[] = [];
    const allOpportunities: string[] = [];
    
    reports.forEach(report => {
      if (report.topFindings?.positive && report.topFindings.positive.length > 0) {
        allPositive.push(...report.topFindings.positive);
      }
      
      if (report.topFindings?.negative && report.topFindings.negative.length > 0) {
        allNegative.push(...report.topFindings.negative);
      }
      
      if (report.topFindings?.opportunities && report.topFindings.opportunities.length > 0) {
        allOpportunities.push(...report.topFindings.opportunities);
      }
    });
    
    // Count occurrences of each finding
    const countFindings = (findings: string[]) => {
      const counts: Record<string, number> = {};
      findings.forEach(finding => {
        if (finding !== "No hay datos disponibles" && finding !== "Sin datos") {
          counts[finding] = (counts[finding] || 0) + 1;
        }
      });
      return counts;
    };
    
    // Get top findings sorted by frequency
    const getTopFindings = (findings: Record<string, number>, limit = 5) => {
      const sortedFindings = Object.entries(findings)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([finding]) => finding);
        
      return sortedFindings.length > 0 ? sortedFindings : ["No hay datos disponibles"];
    };
    
    const positiveCounts = countFindings(allPositive);
    const negativeCounts = countFindings(allNegative);
    const opportunityCounts = countFindings(allOpportunities);
    
    return {
      positive: getTopFindings(positiveCounts),
      negative: getTopFindings(negativeCounts),
      opportunities: getTopFindings(opportunityCounts)
    };
  };
  
  // Calculate total calls across all reports
  const getTotalCalls = () => {
    if (!reports || reports.length === 0) return 0;
    return reports.reduce((sum, report) => sum + report.callCount, 0);
  };
  
  // Calculate average score across all agents and reports
  const getAverageScore = () => {
    if (!reports || reports.length === 0) return 0;
    
    let totalScore = 0;
    let totalAgents = 0;
    
    reports.forEach(report => {
      report.agents.forEach(agent => {
        totalScore += agent.averageScore * agent.callCount;
        totalAgents += agent.callCount;
      });
    });
    
    return totalAgents > 0 ? Math.round(totalScore / totalAgents) : 0;
  };
  
  // Handle the button click to navigate to analytics
  const handleViewAnalysis = () => {
    if (onViewDetailedAnalysis) {
      onViewDetailedAnalysis();
    } else {
      navigate("/analytics");
    }
  };
  
  // Get global findings
  const globalFindings = getGlobalFindings();
  const totalCalls = getTotalCalls();
  const averageScore = getAverageScore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChartHorizontal className="h-5 w-5" />
          Análisis Global de Llamadas
        </CardTitle>
        <CardDescription>
          Resumen de tendencias y hallazgos de las últimas {reports.length} días
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingReports ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <span className="text-sm font-medium text-muted-foreground">Total Llamadas</span>
                <h3 className="text-2xl font-bold mt-1">{totalCalls}</h3>
              </div>
              
              <div className="border rounded-lg p-4">
                <span className="text-sm font-medium text-muted-foreground">Calificación Promedio</span>
                <h3 className="text-2xl font-bold mt-1">{averageScore}/100</h3>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-3">Principales hallazgos globales</h4>
              
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm text-muted-foreground mb-2">Aspectos positivos</h5>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {globalFindings.positive.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="text-sm text-muted-foreground mb-2">Aspectos negativos</h5>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {globalFindings.negative.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="text-sm text-muted-foreground mb-2">Oportunidades</h5>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {globalFindings.opportunities.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleViewAnalysis}>
                Ver análisis detallado
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
