
import { useState } from "react";
import { Card } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DailyReportSection from "@/components/settings/notification/DailyReportSection";
import GlobalAnalysisSection from "@/components/settings/notification/GlobalAnalysisSection";
import FeedbackTrainingSection from "@/components/settings/notification/FeedbackTrainingSection";
import { useDailyReports } from "@/hooks/useDailyReports";

export default function NotificationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("daily");
  const [selectedDays, setSelectedDays] = useState(7);

  // Use our custom hook to get daily reports
  const { reports, isLoading, error, fetchReports, getGlobalAnalysis } = useDailyReports(selectedDays);
  
  // Get global insights for the selected period
  const globalInsights = getGlobalAnalysis();

  const handleReload = () => {
    toast.promise(
      fetchReports(selectedDays), 
      {
        loading: "Actualizando reportes...",
        success: "Reportes actualizados",
        error: "Error al actualizar reportes"
      }
    );
  };
  
  const handleChangeDateRange = (days: number) => {
    setSelectedDays(days);
    toast.promise(
      fetchReports(days), 
      {
        loading: `Cargando datos de ${days} días...`,
        success: `Datos de ${days} días cargados`,
        error: `Error al cargar datos de ${days} días`
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 md:p-6 ml-0 md:ml-64 transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
              <p className="text-muted-foreground">
                Visualiza y analiza el desempeño de llamadas y agentes
              </p>
            </div>
            <Button 
              onClick={handleReload} 
              className="mt-4 md:mt-0"
            >
              Actualizar datos
            </Button>
          </div>
          
          {/* Main content */}
          <div className="space-y-6">
            <GlobalAnalysisSection
              reports={reports}
              loadingReports={isLoading}
              onViewDetailedAnalysis={() => setSelectedTab("daily")}
              onChangeDateRange={handleChangeDateRange}
              selectedDays={selectedDays}
              isDropdown={false}
              globalInsights={globalInsights}
            />
            
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="daily">Reportes Diarios</TabsTrigger>
                <TabsTrigger value="training">Entrenamiento</TabsTrigger>
                <TabsTrigger value="historic">Histórico</TabsTrigger>
              </TabsList>
              
              <TabsContent value="daily">
                <DailyReportSection 
                  reports={reports} 
                  isLoading={isLoading}
                  error={error}
                  onReload={handleReload}
                  onViewHistory={() => setSelectedTab("historic")}
                />
              </TabsContent>
              
              <TabsContent value="training">
                <FeedbackTrainingSection
                  reports={reports}
                  isLoading={isLoading}
                  onViewHistory={() => setSelectedTab("historic")}
                />
              </TabsContent>
              
              <TabsContent value="historic">
                <Card>
                  <div className="p-6 text-center">
                    <h3 className="text-lg font-medium mb-2">Histórico de Reportes</h3>
                    <p className="mb-4 text-muted-foreground">La vista histórica detallada estará disponible próximamente.</p>
                    
                    {/* Placeholder for historic report filters */}
                    <div className="flex justify-center space-x-2">
                      <Button variant="outline" onClick={() => setSelectedTab("daily")}>
                        Volver a Reportes
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <div className="ml-0 md:ml-64 transition-all duration-300">
        <Footer />
      </div>
    </div>
  );
}
