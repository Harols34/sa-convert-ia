import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardCard } from "@/lib/types";
import { 
  Phone, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Clock, 
  Upload,
  Filter,
  Calendar,
  Download
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    activeAgents: 0,
    avgScore: "0/10",
    aiQueries: 0
  });
  
  const [filters, setFilters] = useState({
    agentName: "",
    status: "",
    startDate: null as Date | null,
    endDate: null as Date | null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [language, setLanguage] = useState<'es' | 'en'>(
    localStorage.getItem('language') as 'es' | 'en' || 'es'
  );

  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    try {
      let query = supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters.agentName) {
        query = query.ilike('agent_name', `%${filters.agentName}%`);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.startDate) {
        query = query.gte('date', format(filters.startDate, 'yyyy-MM-dd'));
      }
      
      if (filters.endDate) {
        query = query.lte('date', format(filters.endDate, 'yyyy-MM-dd'));
      }
      
      const { data: callsData, error: callsError } = await query.limit(5);
        
      if (callsError) throw callsError;
      
      const countQuery = supabase
        .from('calls')
        .select('*', { count: 'exact' });
      
      if (filters.agentName) {
        countQuery.ilike('agent_name', `%${filters.agentName}%`);
      }
      
      if (filters.status) {
        countQuery.eq('status', filters.status);
      }
      
      if (filters.startDate) {
        countQuery.gte('date', format(filters.startDate, 'yyyy-MM-dd'));
      }
      
      if (filters.endDate) {
        countQuery.lte('date', format(filters.endDate, 'yyyy-MM-dd'));
      }
      
      const { count: totalCalls, error: statsError } = await countQuery;
      
      if (statsError) throw statsError;
      
      const { count: agentCount, error: agentsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'agent');
        
      if (agentsError) throw agentsError;
      
      let avgScore = "0/10";
      if (totalCalls && totalCalls > 0) {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback')
          .select('score');
          
        if (!feedbackError && feedbackData && feedbackData.length > 0) {
          const totalScore = feedbackData.reduce((sum, item) => sum + (item.score || 0), 0);
          const averageScore = Math.round(totalScore / feedbackData.length) / 10;
          avgScore = `${averageScore.toFixed(1)}/10`;
        }
      }
      
      setRecentCalls(callsData || []);
      setStats({
        totalCalls: totalCalls || 0,
        activeAgents: agentCount || 0,
        avgScore: avgScore,
        aiQueries: 0
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Error al cargar los datos del dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      fetchDashboardData();
      
      localStorage.setItem('language', 'es');
      setLanguage('es');
    } catch (error) {
      console.error("Error in useEffect:", error);
      setIsLoading(false);
    }
  }, []);

  const applyFilters = () => {
    try {
      fetchDashboardData();
      toast.success("Filtros aplicados correctamente");
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Error al aplicar filtros");
    }
  };

  const resetFilters = () => {
    setFilters({
      agentName: "",
      status: "",
      startDate: null,
      endDate: null
    });
  };

  const exportToExcel = async () => {
    try {
      toast.info("Preparando archivo Excel...");
      
      let query = supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters.agentName) {
        query = query.ilike('agent_name', `%${filters.agentName}%`);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.startDate) {
        query = query.gte('date', format(filters.startDate, 'yyyy-MM-dd'));
      }
      
      if (filters.endDate) {
        query = query.lte('date', format(filters.endDate, 'yyyy-MM-dd'));
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return toast.error("No hay datos para exportar");
      }
      
      const formattedData = data.map(call => ({
        'Título': call.title,
        'Agente': call.agent_name,
        'Duración (segundos)': call.duration,
        'Fecha': new Date(call.date).toLocaleDateString(),
        'Estado': call.status === "complete" 
          ? "Completado" 
          : call.status === "pending" 
          ? "Pendiente" 
          : call.status === "transcribing" 
          ? "Transcribiendo" 
          : "Analizando"
      }));
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Llamadas");
      
      XLSX.writeFile(workbook, `llamadas_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success("Archivo Excel generado correctamente");
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      toast.error("Error al generar el archivo Excel");
    }
  };

  const exportToText = async () => {
    try {
      toast.info("Preparando archivo de texto...");
      
      let query = supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters.agentName) {
        query = query.ilike('agent_name', `%${filters.agentName}%`);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.startDate) {
        query = query.gte('date', format(filters.startDate, 'yyyy-MM-dd'));
      }
      
      if (filters.endDate) {
        query = query.lte('date', format(filters.endDate, 'yyyy-MM-dd'));
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return toast.error("No hay datos para exportar");
      }
      
      const headers = ['Título', 'Agente', 'Duración (segundos)', 'Fecha', 'Estado'];
      
      let textContent = headers.join('\t') + '\n';
      
      data.forEach(call => {
        const estado = call.status === "complete" 
          ? "Completado" 
          : call.status === "pending" 
          ? "Pendiente" 
          : call.status === "transcribing" 
          ? "Transcribiendo" 
          : "Analizando";
          
        const row = [
          call.title,
          call.agent_name,
          call.duration,
          new Date(call.date).toLocaleDateString(),
          estado
        ];
        
        textContent += row.join('\t') + '\n';
      });
      
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `llamadas_${new Date().toISOString().split('T')[0]}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Archivo de texto generado correctamente");
    } catch (error) {
      console.error("Error al exportar a texto:", error);
      toast.error("Error al generar el archivo de texto");
    }
  };

  const translations = {
    dashboard: "Panel",
    welcome: "¡Bienvenido de nuevo",
    recentCalls: "Llamadas Recientes",
    callTitle: "Título de Llamada",
    agent: "Agente",
    duration: "Duración",
    date: "Fecha",
    status: "Estado",
    noCallsFound: "No se encontraron llamadas",
    uploadToStart: "Sube algunas llamadas para comenzar con tus análisis",
    uploadCalls: "Subir Llamadas",
    filters: "Filtros",
    agentName: "Nombre del Agente",
    callStatus: "Estado de Llamada",
    startDate: "Fecha Inicio",
    endDate: "Fecha Fin",
    apply: "Aplicar",
    reset: "Reiniciar",
    all: "Todos",
    pending: "Pendiente",
    transcribing: "Transcribiendo",
    analyzing: "Analizando",
    complete: "Completado",
    pickDate: "Seleccionar fecha",
    totalCalls: "Total de Llamadas",
    activeAgents: "Agentes Activos",
    avgScore: "Prom. Puntuación",
    aiQueries: "Consultas IA",
    downloadExcel: "Descargar Excel",
    exportData: "Exportar Datos",
  };

  const dashboardCards: DashboardCard[] = [
    {
      title: translations.totalCalls,
      value: stats.totalCalls,
      icon: <Phone className="h-5 w-5 text-blue-500" />,
    },
    {
      title: translations.activeAgents,
      value: stats.activeAgents,
      icon: <Users className="h-5 w-5 text-green-500" />,
    },
    {
      title: translations.avgScore,
      value: stats.avgScore,
      icon: <BarChart3 className="h-5 w-5 text-purple-500" />,
    },
    {
      title: translations.aiQueries,
      value: stats.aiQueries,
      icon: <MessageSquare className="h-5 w-5 text-orange-500" />,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-pulse h-8 w-32 bg-secondary rounded mb-4 mx-auto"></div>
          <div className="animate-pulse h-4 w-48 bg-secondary rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{translations.dashboard}</h2>
          <p className="text-muted-foreground">
            {translations.welcome}, {user?.name || user?.full_name || "Usuario"}!
          </p>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {translations.filters}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {translations.exportData}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToExcel}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToText}>
                Texto (.txt)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showFilters && (
        <div className="glass-card dark:glass-card-dark p-6 animate-slide-in-bottom bg-white">
          <h3 className="text-lg font-semibold mb-4">{translations.filters}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {translations.agentName}
              </label>
              <Input
                value={filters.agentName}
                onChange={(e) => setFilters({...filters, agentName: e.target.value})}
                placeholder={translations.agentName}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {translations.callStatus}
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({...filters, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={translations.all} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="">{translations.all}</SelectItem>
                  <SelectItem value="pending">{translations.pending}</SelectItem>
                  <SelectItem value="transcribing">{translations.transcribing}</SelectItem>
                  <SelectItem value="analyzing">{translations.analyzing}</SelectItem>
                  <SelectItem value="complete">{translations.complete}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {translations.startDate}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {filters.startDate ? (
                      format(filters.startDate, "PP")
                    ) : (
                      <span>{translations.pickDate}</span>
                    )}
                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => setFilters({...filters, startDate: date})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {translations.endDate}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {filters.endDate ? (
                      format(filters.endDate, "PP")
                    ) : (
                      <span>{translations.pickDate}</span>
                    )}
                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => setFilters({...filters, endDate: date})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={resetFilters}>
              {translations.reset}
            </Button>
            <Button onClick={applyFilters}>
              {translations.apply}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardCards.map((card, index) => (
          <div
            key={index}
            className="glass-card dark:glass-card-dark card-hover p-6 animate-slide-in-bottom bg-white"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <h3 className="text-2xl font-bold mt-2">{card.value}</h3>
              </div>
              <div className="p-2 rounded-full bg-secondary/50">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card dark:glass-card-dark p-6 animate-slide-in-bottom bg-white" style={{ animationDelay: "400ms" }}>
        <h3 className="text-lg font-semibold mb-4">{translations.recentCalls}</h3>
        {recentCalls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{translations.callTitle}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{translations.agent}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{translations.duration}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{translations.date}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{translations.status}</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => (
                  <tr key={call.id} className="border-b hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="py-3 px-4">{call.title}</td>
                    <td className="py-3 px-4">{call.agent_name}</td>
                    <td className="py-3 px-4 flex items-center">
                      <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                      {call.duration} segundos
                    </td>
                    <td className="py-3 px-4">{new Date(call.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        call.status === "complete" 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
                          : call.status === "pending"
                          ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                          : call.status === "transcribing"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                      }`}>
                        {call.status === "complete" 
                          ? "Completado" 
                          : call.status === "pending" 
                          ? "Pendiente" 
                          : call.status === "transcribing" 
                          ? "Transcribiendo" 
                          : "Analizando"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{translations.noCallsFound}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {translations.uploadToStart}
            </p>
            <Button asChild variant="outline">
              <Link to="/calls/upload">{translations.uploadCalls}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
