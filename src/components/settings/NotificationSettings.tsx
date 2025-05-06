
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { useDailyReports } from "@/hooks/useDailyReports";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Componentes más pequeños para mejor organización
import DailyReportSection from "@/components/settings/notification/DailyReportSection";
import GlobalAnalysisSection from "@/components/settings/notification/GlobalAnalysisSection";
import FeedbackTrainingSection from "@/components/settings/notification/FeedbackTrainingSection";

// Define types for the grouped agent
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
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const { settings, isLoading, updateSetting, saveSettings } = useAudioSettings();
  const { reports, isLoading: loadingReports, fetchReports } = useDailyReports(selectedDays);
  const navigate = useNavigate();

  // Handle date range change
  const handleDateRangeChange = (days: number) => {
    setSelectedDays(days);
    fetchReports(days);
  };

  // Function to group agents from all reports
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
          
          // Calculate weighted average score
          const totalScore = agentsMap[agent.id].averageScore * 
                            (agentsMap[agent.id].totalCalls - agent.callCount);
          const newTotalScore = totalScore + (agent.averageScore * agent.callCount);
          agentsMap[agent.id].averageScore = Math.round(
            newTotalScore / agentsMap[agent.id].totalCalls
          );
          
          agentsMap[agent.id].datePoints.push({
            date: report.date,
            score: agent.averageScore,
            callCount: agent.callCount
          });
        }
      });
    });
    
    // Convert to array and sort by total calls
    return Object.values(agentsMap).sort((a, b) => b.totalCalls - a.totalCalls);
  };

  const groupedAgents = getGroupedAgents();

  // Handlers for button actions
  const handleViewHistory = () => {
    navigate("/calls");
  };

  const handleViewDetailedAnalysis = () => {
    navigate("/analytics");
  };

  const handleGenerateReport = () => {
    toast.success("Generando reporte completo", {
      description: "El reporte será enviado a tu correo electrónico"
    });
  };

  const handleSaveNotificationSettings = async () => {
    try {
      await saveSettings(settings);
      toast.success("Preferencias de notificaciones actualizadas");
    } catch (error) {
      console.error("Error al guardar preferencias:", error);
      toast.error("Error al actualizar preferencias");
    }
  };

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
            <Switch 
              id="auto_feedback"
              checked={settings?.auto_feedback}
              onCheckedChange={(checked) => {
                updateSetting("auto_feedback", checked);
                handleSaveNotificationSettings();
              }} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium leading-none" htmlFor="daily_summary">
              Recibir resumen diario de actividad
            </Label>
            <Switch 
              id="daily_summary" 
              defaultChecked={true} 
              onCheckedChange={() => handleSaveNotificationSettings()}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium leading-none" htmlFor="agent_notifications">
              Notificaciones de rendimiento de agentes
            </Label>
            <Switch 
              id="agent_notifications" 
              defaultChecked={true}
              onCheckedChange={() => handleSaveNotificationSettings()}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Daily upload summary with date range selector */}
      <DailyReportSection 
        reports={reports} 
        loadingReports={loadingReports}
        onViewHistory={handleViewHistory}
        onChangeDateRange={handleDateRangeChange}
        selectedDays={selectedDays}
      />

      {/* Global Analysis */}
      <GlobalAnalysisSection 
        reports={reports} 
        loadingReports={loadingReports}
        onViewDetailedAnalysis={handleViewDetailedAnalysis}
        onChangeDateRange={handleDateRangeChange}
        selectedDays={selectedDays} 
      />
      
      {/* Feedback for Training */}
      <FeedbackTrainingSection 
        groupedAgents={groupedAgents}
        loadingReports={loadingReports}
        onGenerateReport={handleGenerateReport}
        onChangeDateRange={handleDateRangeChange}
        selectedDays={selectedDays}
      />
    </div>
  );
}
