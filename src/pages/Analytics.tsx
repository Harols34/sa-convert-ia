
import React from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Users, Clock, Target, Phone, Award, BarChart3, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

export default function Analytics() {
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();

  const { 
    data: calls, 
    isLoading, 
    error,
    refetch 
  } = useOptimizedQuery({
    queryKey: ['analytics-calls', selectedAccountId],
    queryFn: async () => {
      console.log("Analytics query - selectedAccountId:", selectedAccountId, "user role:", user?.role);
      
      let query = supabase
        .from('calls')
        .select(`
          id,
          date,
          result,
          sentiment,
          status,
          agent_name,
          duration,
          account_id,
          created_at,
          feedback (
            score,
            sentiment,
            positive,
            negative,
            opportunities
          )
        `)
        .order('date', { ascending: false });

      if (selectedAccountId && selectedAccountId !== 'all') {
        console.log("Filtering by specific account:", selectedAccountId);
        query = query.eq('account_id', selectedAccountId);
      } else if (selectedAccountId === 'all' && user?.role === 'superAdmin') {
        console.log("SuperAdmin viewing all calls - no account filter applied");
      } else if (!selectedAccountId) {
        console.log("No account selected, returning empty array");
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error("Analytics query error:", error);
        throw error;
      }
      
      console.log("Analytics data loaded:", data?.length || 0, "calls");
      return data || [];
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: Infinity,
  });

  const handleManualRefresh = () => {
    refetch();
  };

  if (!selectedAccountId) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Análisis</h1>
            <p className="text-muted-foreground">
              Selecciona una cuenta para ver el análisis.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Análisis</h1>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Análisis</h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                Error al cargar los datos: {error.message}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Calculations
  const totalCalls = calls?.length || 0;
  const completedCalls = calls?.filter(call => call.status === 'complete')?.length || 0;
  const salesCalls = calls?.filter(call => call.result === 'venta')?.length || 0;
  const conversionRate = totalCalls > 0 ? (salesCalls / totalCalls) * 100 : 0;
  
  const averageScore = calls?.reduce((sum, call) => {
    const score = call.feedback?.[0]?.score || 0;
    return sum + score;
  }, 0) / Math.max(completedCalls, 1) || 0;

  const averageDuration = calls?.reduce((sum, call) => sum + (call.duration || 0), 0) / Math.max(totalCalls, 1) || 0;

  // Prepare data for charts
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const callsPerDay = last7Days.map(date => {
    const callsCount = calls?.filter(call => call.date?.split('T')[0] === date).length || 0;
    return {
      date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      calls: callsCount,
      sales: calls?.filter(call => call.date?.split('T')[0] === date && call.result === 'venta').length || 0
    };
  });

  const agentPerformance = calls?.reduce((acc, call) => {
    if (!call.agent_name) return acc;
    
    if (!acc[call.agent_name]) {
      acc[call.agent_name] = { name: call.agent_name, calls: 0, sales: 0, totalScore: 0, scoreCount: 0 };
    }
    
    acc[call.agent_name].calls++;
    if (call.result === 'venta') acc[call.agent_name].sales++;
    
    const score = call.feedback?.[0]?.score || 0;
    if (score > 0) {
      acc[call.agent_name].totalScore += score;
      acc[call.agent_name].scoreCount++;
    }
    
    return acc;
  }, {} as Record<string, any>) || {};

  const agentData = Object.values(agentPerformance).map((agent: any) => ({
    ...agent,
    conversionRate: agent.calls > 0 ? (agent.sales / agent.calls) * 100 : 0,
    avgScore: agent.scoreCount > 0 ? agent.totalScore / agent.scoreCount : 0
  })).slice(0, 10);

  const sentimentData = [
    { name: 'Positivo', value: calls?.filter(call => call.sentiment === 'positive').length || 0, color: '#22c55e' },
    { name: 'Neutral', value: calls?.filter(call => call.sentiment === 'neutral').length || 0, color: '#6b7280' },
    { name: 'Negativo', value: calls?.filter(call => call.sentiment === 'negative').length || 0, color: '#ef4444' }
  ];

  const resultData = [
    { name: 'Ventas', value: salesCalls, color: '#22c55e' },
    { name: 'No Ventas', value: calls?.filter(call => call.result === 'no venta').length || 0, color: '#ef4444' },
    { name: 'Sin Resultado', value: calls?.filter(call => !call.result || call.result === '').length || 0, color: '#6b7280' }
  ];

  const accountName = selectedAccountId === 'all' ? 'Todas las cuentas' : 'Cuenta seleccionada';

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Analítico</h1>
            <p className="text-muted-foreground">
              Análisis completo de {accountName} - {totalCalls} llamadas procesadas
            </p>
          </div>
          <Button onClick={handleManualRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* KPIs principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Llamadas</CardTitle>
              <Phone className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalCalls}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {completedCalls} completadas ({((completedCalls/totalCalls)*100).toFixed(1)}%)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa Conversión</CardTitle>
              <Target className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                {conversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                {salesCalls} ventas realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Promedio</CardTitle>
              <Award className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                {averageScore.toFixed(1)}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                De {completedCalls} evaluaciones
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duración Media</CardTitle>
              <Clock className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                {Math.round(averageDuration / 60)}m
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                {Math.round(averageDuration)} segundos exactos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos principales */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tendencia de Llamadas (7 días)
              </CardTitle>
              <CardDescription>
                Evolución diaria de llamadas y ventas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={callsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="calls" stackId="1" stroke="#3b82f6" fill="#93c5fd" name="Total Llamadas" />
                  <Area type="monotone" dataKey="sales" stackId="1" stroke="#10b981" fill="#86efac" name="Ventas" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Distribución de Sentimientos
              </CardTitle>
              <CardDescription>
                Análisis emocional de las llamadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Performance por agente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rendimiento por Agente
            </CardTitle>
            <CardDescription>
              Análisis comparativo de performance individual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={agentData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'calls' ? `${value} llamadas` :
                    name === 'conversionRate' ? `${value.toFixed(1)}%` :
                    name === 'avgScore' ? `${value.toFixed(1)} pts` : value,
                    name === 'calls' ? 'Total Llamadas' :
                    name === 'conversionRate' ? 'Tasa Conversión' :
                    name === 'avgScore' ? 'Score Promedio' : name
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="calls" fill="#3b82f6" name="Llamadas" />
                <Bar yAxisId="right" dataKey="conversionRate" fill="#10b981" name="Conversión %" />
                <Bar yAxisId="right" dataKey="avgScore" fill="#f59e0b" name="Score Promedio" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Análisis de resultados */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Resultados</CardTitle>
              <CardDescription>
                Categorización de outcomes de llamadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={resultData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {resultData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métricas Adicionales</CardTitle>
              <CardDescription>
                Indicadores complementarios de rendimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium">Llamadas Pendientes</span>
                  <span className="text-lg font-bold text-blue-600">
                    {calls?.filter(call => call.status === 'pending').length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Procesamiento Exitoso</span>
                  <span className="text-lg font-bold text-green-600">
                    {((completedCalls / totalCalls) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium">Agentes Únicos</span>
                  <span className="text-lg font-bold text-purple-600">
                    {Object.keys(agentPerformance).length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="font-medium">Tiempo Total</span>
                  <span className="text-lg font-bold text-orange-600">
                    {Math.round((calls?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0) / 3600)}h
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
