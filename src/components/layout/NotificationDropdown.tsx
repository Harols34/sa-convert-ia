
import React, { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDailyReports } from "@/hooks/useDailyReports";
import DailyReportSection from "@/components/settings/notification/DailyReportSection";
import GlobalAnalysisSection from "@/components/settings/notification/GlobalAnalysisSection";
import FeedbackTrainingSection from "@/components/settings/notification/FeedbackTrainingSection";
import { useNavigate } from "react-router-dom";

export default function NotificationDropdown() {
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const { reports, isLoading: loadingReports, fetchReports } = useDailyReports(selectedDays);
  const navigate = useNavigate();
  
  // Handle date range change
  const handleDateRangeChange = (days: number) => {
    setSelectedDays(days);
    fetchReports(days);
  };

  // Create a grouped list of agents from all reports
  const getGroupedAgents = () => {
    if (!reports || reports.length === 0) return [];
    
    const agentsMap: Record<string, any> = {};
    
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
    return Object.values(agentsMap).sort((a: any, b: any) => b.totalCalls - a.totalCalls);
  };

  const groupedAgents = getGroupedAgents();

  // Handle button actions
  const handleViewHistory = () => {
    navigate("/calls");
  };

  const handleViewDetailedAnalysis = () => {
    navigate("/analytics");
  };

  const handleGenerateReport = () => {
    navigate("/settings?tab=notificaciones");
  };

  const handleViewAllNotifications = () => {
    navigate("/settings?tab=notificaciones");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Bell className="h-5 w-5" />
          {reports && reports.length > 0 && (
            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-600" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[350px] max-h-[80vh] overflow-auto" align="end" forceMount>
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notificaciones</span>
          <Button variant="ghost" size="sm" onClick={handleViewAllNotifications}>
            Ver todo
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[calc(80vh-120px)]">
          <div className="p-2 space-y-4">
            <DailyReportSection 
              reports={reports.slice(0, 3)} 
              loadingReports={loadingReports}
              onViewHistory={handleViewHistory}
              onChangeDateRange={handleDateRangeChange}
              selectedDays={selectedDays}
              isDropdown={true}
            />
            
            <GlobalAnalysisSection 
              reports={reports} 
              loadingReports={loadingReports}
              onViewDetailedAnalysis={handleViewDetailedAnalysis}
              onChangeDateRange={handleDateRangeChange}
              selectedDays={selectedDays}
              isDropdown={true}
            />
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
