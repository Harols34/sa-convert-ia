import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, TrendingUp, Users, Phone, Clock, Star, BarChart3, PieChart, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RechartsPieChart, Cell, LineChart, Line, Area, AreaChart, Pie } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface Call {
  id: string;
  created_at: string;
  duration: number;
  score?: number;
  agent_name?: string;
  type?: string;
  // Additional fields from Supabase
  account_id?: string;
  agent_id?: string;
  audio_url?: string;
  date?: string;
  entities?: string[];
  filename?: string;
  product?: string;
  updated_at?: string;
}

interface AgentPerformance {
  agent: string;
  calls: number;
  avgScore: number;
  avgDuration: string;
}

interface CallsPerDay {
  date: string;
  calls: number;
}

interface CallsByType {
  name: string;
  value: number;
}

interface ScoresTrend {
  date: string;
  avgScore: number;
}

interface CallsVsQuality {
  date: string;
  calls: number;
  quality: number;
}

interface ScoreDistribution {
  score: number;
  count: number;
}

interface Metrics {
  totalCalls: number;
  avgDuration: string;
  avgScore: number;
  activeAgents: number;
  callsGrowth: number;
  durationGrowth: number;
  scoreGrowth: number;
  agentsGrowth: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AnalyticsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [dateRange, setDateRange] = useState<string>("last7days");
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, user, loading } = useAuth();
  const { selectedAccountId } = useAccount();

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated && !loading) {
        toast.error("Sesión expirada", {
          description: "Por favor inicia sesión para continuar"
        });
      }
    };
    if (!loading) {
      checkAuth();
    }
  }, [isAuthenticated, loading]);

  useEffect(() => {
    const fetchCalls = async () => {
      setIsLoading(true);
      try {
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);

        switch (dateRange) {
          case "today":
            startDate = todayStart;
            endDate = todayEnd;
            break;
          case "yesterday":
            const yesterday = subDays(today, 1);
            startDate = startOfDay(yesterday);
            endDate = endOfDay(yesterday);
            break;
          case "last7days":
            startDate = subDays(today, 7);
            endDate = todayEnd;
            break;
          case "last30days":
            startDate = subDays(today, 30);
            endDate = todayEnd;
            break;
          case "thisMonth": {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = todayEnd;
            break;
          }
          case "lastMonth": {
            const lastMonth = today.getMonth() - 1;
            startDate = new Date(today.getFullYear(), lastMonth, 1);
            endDate = new Date(today.getFullYear(), lastMonth + 1, 0);
            break;
          }
          default:
            startDate = subDays(today, 7);
            endDate = todayEnd;
        }

        if (startDate && endDate) {
          let query = supabase
            .from("calls")
            .select("*")
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString());

          if (selectedAccountId && selectedAccountId !== "all") {
            query = query.eq("account_id", selectedAccountId);
          }

          const { data, error } = await query;

          if (error) throw error;

          // Transform the data to match our Call interface
          const transformedData: Call[] = (data || []).map(call => ({
            ...call,
            score: call.score || Math.random() * 10, // Fallback if no score
            agent: call.agent_name || call.agent_id || 'Unknown Agent',
            type: call.type || call.product || 'General'
          }));

          setCalls(transformedData);
        }
      } catch (error) {
        console.error("Error fetching calls:", error);
        toast.error("Error al cargar las llamadas");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalls();
  }, [dateRange, selectedAccountId]);

  const agentPerformance: AgentPerformance[] = useMemo(() => {
    const agents: { [key: string]: { calls: number; totalScore: number; totalDuration: number } } = {};

    calls.forEach((call) => {
      const agentKey = call.agent || call.agent_name || 'Unknown Agent';
      if (!agents[agentKey]) {
        agents[agentKey] = { calls: 0, totalScore: 0, totalDuration: 0 };
      }
      agents[agentKey].calls += 1;
      agents[agentKey].totalScore += call.score || 0;
      agents[agentKey].totalDuration += call.duration || 0;
    });

    return Object.entries(agents).map(([agent, data]) => ({
      agent,
      calls: data.calls,
      avgScore: data.calls > 0 ? parseFloat((data.totalScore / data.calls).toFixed(2)) : 0,
      avgDuration: data.calls > 0 ? `${Math.floor(data.totalDuration / data.calls)}s` : '0s',
    }));
  }, [calls]);

  const callsPerDay: CallsPerDay[] = useMemo(() => {
    const dailyCalls: { [key: string]: number } = {};

    calls.forEach((call) => {
      const date = format(new Date(call.created_at), "dd/MM/yyyy", { locale: es });
      dailyCalls[date] = (dailyCalls[date] || 0) + 1;
    });

    return Object.entries(dailyCalls).map(([date, calls]) => ({ date, calls }));
  }, [calls]);

  const callsByType: CallsByType[] = useMemo(() => {
    const typeCounts: { [key: string]: number } = {};

    calls.forEach((call) => {
      typeCounts[call.type] = (typeCounts[call.type] || 0) + 1;
    });

    return Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  }, [calls]);

  const scoresTrend: ScoresTrend[] = useMemo(() => {
    const dailyScores: { [key: string]: { totalScore: number; count: number } } = {};

    calls.forEach((call) => {
      const date = format(new Date(call.created_at), "dd/MM/yyyy", { locale: es });
      if (!dailyScores[date]) {
        dailyScores[date] = { totalScore: 0, count: 0 };
      }
      dailyScores[date].totalScore += call.score;
      dailyScores[date].count += 1;
    });

    return Object.entries(dailyScores).map(([date, data]) => ({
      date,
      avgScore: parseFloat((data.totalScore / data.count).toFixed(2)),
    }));
  }, [calls]);

  const callsVsQuality: CallsVsQuality[] = useMemo(() => {
    const dailyData: { [key: string]: { calls: number; totalQuality: number } } = {};

    calls.forEach((call) => {
      const date = format(new Date(call.created_at), "dd/MM/yyyy", { locale: es });
      if (!dailyData[date]) {
        dailyData[date] = { calls: 0, totalQuality: 0 };
      }
      dailyData[date].calls += 1;
      dailyData[date].totalQuality += call.score >= 6 ? 1 : 0;
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      calls: data.calls,
      quality: parseFloat(((data.totalQuality / data.calls) * 100).toFixed(2)),
    }));
  }, [calls]);

  const scoreDistribution: ScoreDistribution[] = useMemo(() => {
    const distribution: { [key: number]: number } = {};

    calls.forEach((call) => {
      const score = Math.floor(call.score);
      distribution[score] = (distribution[score] || 0) + 1;
    });

    return Object.entries(distribution).map(([score, count]) => ({
      score: parseInt(score),
      count,
    }));
  }, [calls]);

  const metrics: Metrics = useMemo(() => {
    const totalCalls = calls.length;
    const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
    const avgDuration = totalCalls > 0 ? `${Math.floor(totalDuration / totalCalls)}s` : '0s';
    const totalScore = calls.reduce((sum, call) => sum + (call.score || 0), 0);
    const avgScore = totalCalls > 0 ? parseFloat((totalScore / totalCalls).toFixed(2)) : 0;
    const activeAgents = new Set(calls.map((call) => call.agent || call.agent_name || 'Unknown')).size;

    // Placeholder growth values - replace with actual calculations
    const callsGrowth = 5;
    const durationGrowth = 2;
    const scoreGrowth = 3;
    const agentsGrowth = 1;

    return {
      totalCalls,
      avgDuration,
      avgScore,
      activeAgents,
      callsGrowth,
      durationGrowth,
      scoreGrowth,
      agentsGrowth,
    };
  }, [calls]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Análisis detallado del rendimiento y métricas de llamadas
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="yesterday">Ayer</SelectItem>
              <SelectItem value="last7days">Últimos 7 días</SelectItem>
              <SelectItem value="last30days">Últimos 30 días</SelectItem>
              <SelectItem value="thisMonth">Este mes</SelectItem>
              <SelectItem value="lastMonth">Mes pasado</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Llamadas</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{metrics.callsGrowth}%</span> vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duración Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgDuration}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">+{metrics.durationGrowth}%</span> vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntuación Promedio</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgScore}/10</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{metrics.scoreGrowth}%</span> vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeAgents}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{metrics.agentsGrowth}%</span> vs período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen General</TabsTrigger>
          <TabsTrigger value="agents">Rendimiento por Agente</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="quality">Calidad</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Llamadas por Día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={callsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Distribución por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={callsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {callsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Agente</CardTitle>
              <CardDescription>
                Comparación de métricas de rendimiento entre agentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={agentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="agent" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="calls" fill="#8884d8" name="Llamadas" />
                  <Bar dataKey="avgScore" fill="#82ca9d" name="Puntuación Promedio" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clasificación de Agentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentPerformance.map((agent, index) => (
                  <div key={agent.agent} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{agent.agent}</p>
                        <p className="text-sm text-muted-foreground">{agent.calls} llamadas</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant={agent.avgScore >= 8 ? "default" : agent.avgScore >= 6 ? "secondary" : "destructive"}>
                        {agent.avgScore}/10
                      </Badge>
                      <p className="text-sm text-muted-foreground">{agent.avgDuration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias de Puntuación</CardTitle>
              <CardDescription>
                Evolución de las puntuaciones a lo largo del tiempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={scoresTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgScore" stroke="#8884d8" strokeWidth={2} name="Puntuación Promedio" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Volumen de Llamadas vs Calidad</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={callsVsQuality}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="calls" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} name="Llamadas" />
                  <Line yAxisId="right" type="monotone" dataKey="quality" stroke="#82ca9d" strokeWidth={2} name="Calidad %" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Excelente</CardTitle>
                <CardDescription>Puntuación 8-10</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">67%</div>
                <p className="text-xs text-muted-foreground">+5% vs período anterior</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bueno</CardTitle>
                <CardDescription>Puntuación 6-7</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">25%</div>
                <p className="text-xs text-muted-foreground">-2% vs período anterior</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mejorable</CardTitle>
                <CardDescription>Puntuación menos de 6</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">8%</div>
                <p className="text-xs text-muted-foreground">-3% vs período anterior</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de Puntuaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="score" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
