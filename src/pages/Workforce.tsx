
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Calendar, 
  User, 
  Award, 
  ArrowUpRight,
  ArrowDownRight,
  Phone
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Cell, 
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Default empty data
const emptyAgentData = [
  { name: "Disponibles", value: 0, color: "#03A678" },
  { name: "En llamada", value: 0, color: "#5B5390" },
  { name: "Pausa", value: 0, color: "#1DF2A4" },
  { name: "Otros", value: 0, color: "#F2F2F2" },
];

const emptyPerformanceData = [
  { name: "Lun", agente1: 0, agente2: 0, agente3: 0 },
  { name: "Mar", agente1: 0, agente2: 0, agente3: 0 },
  { name: "Mié", agente1: 0, agente2: 0, agente3: 0 },
  { name: "Jue", agente1: 0, agente2: 0, agente3: 0 },
  { name: "Vie", agente1: 0, agente2: 0, agente3: 0 },
];

const emptyCallVolumeData = [
  { hora: "8AM", llamadas: 0 },
  { hora: "9AM", llamadas: 0 },
  { hora: "10AM", llamadas: 0 },
  { hora: "11AM", llamadas: 0 },
  { hora: "12PM", llamadas: 0 },
  { hora: "1PM", llamadas: 0 },
  { hora: "2PM", llamadas: 0 },
  { hora: "3PM", llamadas: 0 },
  { hora: "4PM", llamadas: 0 },
  { hora: "5PM", llamadas: 0 },
  { hora: "6PM", llamadas: 0 },
];

const emptyKpiCards = [
  {
    title: "Tiempo Promedio de Atención",
    value: "-",
    change: 0,
    icon: <Clock className="h-5 w-5" />,
  },
  {
    title: "Nivel de Servicio",
    value: "-",
    change: 0,
    icon: <Award className="h-5 w-5" />,
  },
  {
    title: "Agentes Activos",
    value: "-",
    change: 0,
    icon: <User className="h-5 w-5" />,
  },
  {
    title: "Llamadas en Cola",
    value: "-",
    change: 0,
    icon: <Phone className="h-5 w-5" />,
  },
];

export default function WorkforcePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [agentChartType, setAgentChartType] = useState("pie");
  const [volumeChartType, setVolumeChartType] = useState("bar");
  const [performanceChartType, setPerformanceChartType] = useState("line");
  
  const [agentData, setAgentData] = useState(emptyAgentData);
  const [performanceData, setPerformanceData] = useState(emptyPerformanceData);
  const [callVolumeData, setCallVolumeData] = useState(emptyCallVolumeData);
  const [kpiCards, setKpiCards] = useState(emptyKpiCards);
  const [hasData, setHasData] = useState(false);
  const [activeAgents, setActiveAgents] = useState(0);

  // Function to generate sample data based on actual calls and agents
  const generateSampleData = async (callCount: number, agents: any[]) => {
    // Agent status data
    if (agents.length > 0) {
      const activeCount = agents.filter(a => a.status === 'active').length;
      const vacationCount = agents.filter(a => a.status === 'vacation').length;
      const trainingCount = agents.filter(a => a.status === 'training').length;
      const inactiveCount = agents.filter(a => a.status === 'inactive').length;
      
      setActiveAgents(activeCount);
      
      setAgentData([
        { name: "Disponibles", value: Math.max(1, activeCount - Math.min(callCount, activeCount)), color: "#03A678" },
        { name: "En llamada", value: Math.min(callCount, activeCount), color: "#5B5390" },
        { name: "Pausa", value: vacationCount, color: "#1DF2A4" },
        { name: "Otros", value: trainingCount + inactiveCount, color: "#F2F2F2" },
      ]);
    }
    
    // Call volume data
    const newVolumeData = [...emptyCallVolumeData];
    if (callCount > 0) {
      // Distribute calls across hours with some randomness
      let remaining = callCount;
      for (let i = 0; i < newVolumeData.length && remaining > 0; i++) {
        // More calls during business hours (10AM-2PM)
        let weight = 1;
        if (i >= 2 && i <= 6) weight = 2; // Higher weight for business hours
        
        const value = Math.min(remaining, Math.ceil(Math.random() * weight));
        newVolumeData[i].llamadas = value;
        remaining -= value;
      }
    }
    setCallVolumeData(newVolumeData);
    
    // Performance data
    if (agents.length > 0) {
      const uniqueAgents = agents.slice(0, 3).map(a => a.name);
      const newPerformanceData = [...emptyPerformanceData];
      
      if (uniqueAgents.length > 0) {
        newPerformanceData.forEach(day => {
          uniqueAgents.forEach((agent, index) => {
            // Base score plus some randomness, weighted by call count
            const baseScore = 50 + Math.floor(Math.random() * 30);
            const callBonus = callCount > 0 ? Math.floor(Math.random() * 20) : 0;
            day[`agente${index + 1}`] = baseScore + callBonus;
          });
        });
        setPerformanceData(newPerformanceData);
      }
    }
    
    // KPI cards data
    if (callCount > 0 || agents.length > 0) {
      const newKpiCards = [...kpiCards];
      newKpiCards[0].value = `${30 + Math.floor(Math.random() * 90)}s`;
      newKpiCards[0].change = Math.floor(Math.random() * 10) * (Math.random() > 0.5 ? 1 : -1);
      
      newKpiCards[1].value = `${60 + Math.floor(Math.random() * 35)}%`;
      newKpiCards[1].change = Math.floor(Math.random() * 8) * (Math.random() > 0.6 ? 1 : -1);
      
      newKpiCards[2].value = `${activeAgents}`;
      newKpiCards[2].change = agents.length > 1 ? Math.floor(Math.random() * 5) : 0;
      
      const queueCalls = Math.floor(Math.random() * 3) * (callCount > 3 ? 1 : 0);
      newKpiCards[3].value = `${queueCalls}`;
      newKpiCards[3].change = queueCalls > 0 ? Math.floor(Math.random() * 15) : 0;
      
      setKpiCards(newKpiCards);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get count of calls from Supabase
        const { count: callCount, error: callError } = await supabase
          .from('calls')
          .select('*', { count: 'exact' });
          
        if (callError) throw callError;
        
        // Get agents from Supabase
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('*');
          
        if (agentsError) throw agentsError;
        
        // Get behaviors for AI analysis
        const { data: behaviorsData, error: behaviorsError } = await supabase
          .from('behaviors')
          .select('*')
          .eq('is_active', true);
          
        if (behaviorsError) throw behaviorsError;
        
        // Get feedback data to correlate with behaviors
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback')
          .select('*');
          
        if (feedbackError) throw feedbackError;
        
        // Set hasData flag if we have either calls or agents
        const hasCallsOrAgents = (callCount && callCount > 0) || (agentsData && agentsData.length > 0);
        setHasData(hasCallsOrAgents);
        
        if (hasCallsOrAgents) {
          // Generate sample data based on actual calls and agents
          await generateSampleData(callCount || 0, agentsData || []);
        } else {
          // Reset to empty data if no calls or agents
          setAgentData(emptyAgentData);
          setCallVolumeData(emptyCallVolumeData);
          setPerformanceData(emptyPerformanceData);
          setKpiCards(emptyKpiCards);
        }
      } catch (error) {
        console.error("Error loading workforce data:", error);
        toast.error("Error al cargar datos de workforce");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const renderAgentChart = () => {
    if (!hasData) {
      return (
        <div className="flex items-center justify-center h-[250px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      );
    }
    
    switch(agentChartType) {
      case "donut":
        return (
          <PieChart>
            <Pie
              data={agentData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => 
                percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
              }
              labelLine={false}
            >
              {agentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );
      case "radial":
        return (
          <RadialBarChart 
            innerRadius="20%" 
            outerRadius="80%" 
            data={agentData} 
            startAngle={180} 
            endAngle={0}
          >
            <RadialBar
              label={{ fill: '#666', position: 'insideStart' }}
              background
              dataKey="value"
            />
            <Legend iconSize={10} width={120} height={140} layout="vertical" verticalAlign="middle" align="right" />
            <Tooltip />
          </RadialBarChart>
        );
      case "bar":
        return (
          <BarChart data={agentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Agentes">
              {agentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        );
      case "pie":
      default:
        return (
          <PieChart>
            <Pie
              data={agentData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => 
                percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
              }
              labelLine={false}
            >
              {agentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );
    }
  };

  const renderVolumeChart = () => {
    if (!hasData) {
      return (
        <div className="flex items-center justify-center h-[250px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      );
    }
    
    switch(volumeChartType) {
      case "line":
        return (
          <LineChart data={callVolumeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hora" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="llamadas" stroke="#03A678" />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={callVolumeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hora" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="llamadas" fill="#03A678" stroke="#03A678" />
          </AreaChart>
        );
      case "bar":
      default:
        return (
          <BarChart data={callVolumeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hora" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="llamadas" fill="#03A678" />
          </BarChart>
        );
    }
  };

  const renderPerformanceChart = () => {
    if (!hasData) {
      return (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      );
    }
    
    switch(performanceChartType) {
      case "bar":
        return (
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="agente1" fill="#03A678" />
            <Bar dataKey="agente2" fill="#5B5390" />
            <Bar dataKey="agente3" fill="#1DF2A4" />
          </BarChart>
        );
      case "area":
        return (
          <AreaChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="agente1" fill="#03A678" stroke="#03A678" />
            <Area type="monotone" dataKey="agente2" fill="#5B5390" stroke="#5B5390" />
            <Area type="monotone" dataKey="agente3" fill="#1DF2A4" stroke="#1DF2A4" />
          </AreaChart>
        );
      case "line":
      default:
        return (
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="agente1" stroke="#03A678" activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="agente2" stroke="#5B5390" />
            <Line type="monotone" dataKey="agente3" stroke="#1DF2A4" />
          </LineChart>
        );
    }
  };

  // Now let's create an edge function to handle AI analysis based on behaviors
  const analyzeCallWithBehaviors = async (callId: string) => {
    try {
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();
        
      if (callError) throw callError;
      
      const { data: behaviors, error: behaviorsError } = await supabase
        .from('behaviors')
        .select('*')
        .eq('is_active', true);
        
      if (behaviorsError) throw behaviorsError;
      
      // Here we would call an edge function to perform AI analysis
      // using the call data and behavior prompts
      
      // For demonstration, we'll simulate that here
      const simulatedFeedback = {
        positive: ["Saludo correcto", "Identificación adecuada", "Escucha activa"],
        negative: ["Tiempos de espera largos"],
        opportunities: ["Ofrecer productos adicionales", "Recomendar promociones actuales"],
        score: 80
      };
      
      const { error: feedbackError } = await supabase
        .from('feedback')
        .upsert([
          {
            call_id: callId,
            positive: simulatedFeedback.positive,
            negative: simulatedFeedback.negative,
            opportunities: simulatedFeedback.opportunities,
            score: simulatedFeedback.score
          }
        ]);
        
      if (feedbackError) throw feedbackError;
      
      return { success: true };
    } catch (error) {
      console.error("Error analyzing call:", error);
      return { success: false, error };
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 md:p-6 ml-0 md:ml-64 transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Workforce Management</h2>
              <p className="text-muted-foreground">
                Analiza y gestiona la plantilla de agentes y rendimiento
              </p>
            </div>
            <Button className="mt-4 md:mt-0" onClick={() => window.location.href = "/agents"}>
              <User className="mr-2 h-4 w-4" /> Gestionar Agentes
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {kpiCards.map((card, i) => (
              <Card key={i} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <h3 className="text-2xl font-bold mt-1">{card.value}</h3>
                    </div>
                    <div className={`p-2 rounded-full ${card.change >= 0 ? 'bg-bright-green/10' : 'bg-destructive/10'}`}>
                      {card.icon}
                    </div>
                  </div>
                  <div className={`flex items-center mt-2 text-sm ${card.change > 0 ? 'text-bright-green' : card.change < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {card.change > 0 ? (
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                    ) : card.change < 0 ? (
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    ) : null}
                    <span>{card.change !== 0 ? `${Math.abs(card.change)}% respecto a ayer` : 'Sin datos'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid grid-cols-3 md:w-[400px] mb-4">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="agents">Agentes</TabsTrigger>
              <TabsTrigger value="forecasting">Pronósticos</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-0">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className={`${i === 2 ? 'md:col-span-3' : i === 1 ? 'md:col-span-2' : 'md:col-span-1'}`}>
                      <CardHeader className="pb-2">
                        <div className="animate-pulse h-6 w-32 bg-secondary rounded"></div>
                      </CardHeader>
                      <CardContent>
                        <div className={`h-${i === 2 ? '300' : '250'}px w-full flex items-center justify-center`}>
                          <div className="animate-pulse h-4 w-40 bg-secondary rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-1">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-xl">Estado de Agentes</CardTitle>
                          <CardDescription>Distribución actual</CardDescription>
                        </div>
                        <Select value={agentChartType} onValueChange={setAgentChartType}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Gráfico" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pie">Pastel</SelectItem>
                            <SelectItem value="donut">Dona</SelectItem>
                            <SelectItem value="bar">Barras</SelectItem>
                            <SelectItem value="radial">Radial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {renderAgentChart()}
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-xl">Volumen de Llamadas</CardTitle>
                          <CardDescription>Hoy por hora</CardDescription>
                        </div>
                        <Select value={volumeChartType} onValueChange={setVolumeChartType}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Gráfico" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bar">Barras</SelectItem>
                            <SelectItem value="line">Líneas</SelectItem>
                            <SelectItem value="area">Área</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {renderVolumeChart()}
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-3">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-xl">Rendimiento de Agentes</CardTitle>
                          <CardDescription>Esta semana - Puntuación de calidad</CardDescription>
                        </div>
                        <Select value={performanceChartType} onValueChange={setPerformanceChartType}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Gráfico" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="line">Líneas</SelectItem>
                            <SelectItem value="bar">Barras</SelectItem>
                            <SelectItem value="area">Área</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {renderPerformanceChart()}
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="agents" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Información de Agentes</CardTitle>
                  <CardDescription>Gestiona tu equipo de agentes</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>La vista detallada de agentes está disponible en la sección "Agentes" del menú principal.</p>
                  <Button className="mt-4" onClick={() => window.location.href = "/agents"}>
                    <User className="mr-2 h-4 w-4" /> Ver Agentes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="forecasting" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Pronósticos y Programación</CardTitle>
                  <CardDescription>Planificación de recursos a futuro</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Los pronósticos de llamadas y herramientas de programación estarán disponibles próximamente.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <div className="ml-0 md:ml-64 transition-all duration-300">
        <Footer />
      </div>
    </div>
  );
}
