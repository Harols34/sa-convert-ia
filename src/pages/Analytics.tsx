import React, { useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Users, Clock, Target, Phone, Award, BarChart3, Calendar, Activity, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import AnalyticsFilters, { AnalyticsFilters as AnalyticsFiltersType } from "@/components/analytics/AnalyticsFilters";
import { useState } from "react";

export default function Analytics() {
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();
  const [filters, setFilters] = useState<AnalyticsFiltersType>({
    search: "",
    status: "all",
    result: "all",
    agentId: "all",
    dateRange: undefined,
    sentiment: "all",
    durationRange: "all"
  });

  const { 
    data: calls, 
    isLoading, 
    error,
    refetch 
  } = useOptimizedQuery({
    queryKey: ['analytics-calls', selectedAccountId, JSON.stringify(filters)],
    queryFn: async () => {
      console.log("Analytics query - selectedAccountId:", selectedAccountId, "user role:", user?.role, "filters:", filters);
      
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
          title,
          feedback (
            score,
            sentiment,
            positive,
            negative,
            opportunities
          )
        `)
        .order('date', { ascending: false });

      // Apply account filter
      if (selectedAccountId && selectedAccountId !== 'all') {
        console.log("Filtering by specific account:", selectedAccountId);
        query = query.eq('account_id', selectedAccountId);
      } else if (selectedAccountId === 'all' && user?.role === 'superAdmin') {
        console.log("SuperAdmin viewing all calls - no account filter applied");
      } else if (!selectedAccountId) {
        console.log("No account selected, returning empty array");
        return [];
      }

      // Apply additional filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.result && filters.result !== 'all') {
        if (filters.result === '') {
          query = query.or('result.is.null,result.eq.');
        } else {
          query = query.eq('result', filters.result);
        }
      }

      if (filters.sentiment && filters.sentiment !== 'all') {
        query = query.eq('sentiment', filters.sentiment);
      }

      if (filters.agentId && filters.agentId !== 'all') {
        query = query.eq('agent_name', filters.agentId);
      }

      if (filters.dateRange?.from) {
        const fromDate = filters.dateRange.from.toISOString();
        query = query.gte('date', fromDate);
        
        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          query = query.lte('date', toDate.toISOString());
        }
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,agent_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Analytics query error:", error);
        throw error;
      }
      
      let filteredData = data || [];

      // Apply duration filter (client-side since it requires calculation)
      if (filters.durationRange && filters.durationRange !== 'all') {
        filteredData = filteredData.filter(call => {
          const durationMinutes = (call.duration || 0) / 60;
          switch (filters.durationRange) {
            case 'short':
              return durationMinutes < 2;
            case 'medium':
              return durationMinutes >= 2 && durationMinutes <= 10;
            case 'long':
              return durationMinutes > 10;
            default:
              return true;
          }
        });
      }
      
      console.log("Analytics data loaded:", filteredData?.length || 0, "calls after filtering");
      return filteredData;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 300000, // 5 minutes
  });

  const handleManualRefresh = () => {
    refetch();
  };

  const handleFilterChange = (newFilters: AnalyticsFiltersType) => {
    setFilters(newFilters);
  };

  // Enhanced calculations with memoization
  const analytics = useMemo(() => {
    if (!calls) return null;

    const totalCalls = calls.length;
    const completedCalls = calls.filter(call => call.status === 'complete').length;
    const pendingCalls = calls.filter(call => call.status === 'pending').length;
    const salesCalls = calls.filter(call => call.result === 'venta').length;
    const noSaleCalls = calls.filter(call => call.result === 'no venta').length;
    const conversionRate = totalCalls > 0 ? (salesCalls / totalCalls) * 100 : 0;
    
    const averageScore = calls.reduce((sum, call) => {
      const score = call.feedback?.[0]?.score || 0;
      return sum + score;
    }, 0) / Math.max(completedCalls, 1) || 0;

    const averageDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0) / Math.max(totalCalls, 1) || 0;

    // Sentiment analysis
    const positiveCalls = calls.filter(call => call.sentiment === 'positive').length;
    const neutralCalls = calls.filter(call => call.sentiment === 'neutral').length;
    const negativeCalls = calls.filter(call => call.sentiment === 'negative').length;
    const sentimentScore = totalCalls > 0 ? ((positiveCalls * 100 + neutralCalls * 50) / totalCalls) : 0;

    // Time-based analysis (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const callsPerDay = last30Days.map(date => {
      const daysCalls = calls.filter(call => call.date?.split('T')[0] === date);
      const salesCount = daysCalls.filter(call => call.result === 'venta').length;
      const avgScore = daysCalls.length > 0 
        ? daysCalls.reduce((sum, call) => sum + (call.feedback?.[0]?.score || 0), 0) / daysCalls.length 
        : 0;
      
      return {
        date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        calls: daysCalls.length,
        sales: salesCount,
        avgScore: Number(avgScore.toFixed(1)),
        conversionRate: daysCalls.length > 0 ? Number(((salesCount / daysCalls.length) * 100).toFixed(1)) : 0
      };
    });

    // Agent performance with enhanced metrics
    const agentPerformance = calls.reduce((acc, call) => {
      if (!call.agent_name) return acc;
      
      if (!acc[call.agent_name]) {
        acc[call.agent_name] = { 
          name: call.agent_name, 
          calls: 0, 
          sales: 0, 
          totalScore: 0, 
          scoreCount: 0,
          totalDuration: 0,
          positiveCount: 0,
          negativeCount: 0
        };
      }
      
      acc[call.agent_name].calls++;
      if (call.result === 'venta') acc[call.agent_name].sales++;
      
      const score = call.feedback?.[0]?.score || 0;
      if (score > 0) {
        acc[call.agent_name].totalScore += score;
        acc[call.agent_name].scoreCount++;
      }
      
      acc[call.agent_name].totalDuration += (call.duration || 0);
      if (call.sentiment === 'positive') acc[call.agent_name].positiveCount++;
      if (call.sentiment === 'negative') acc[call.agent_name].negativeCount++;
      
      return acc;
    }, {} as Record<string, any>);

    const agentData = Object.values(agentPerformance).map((agent: any) => ({
      ...agent,
      conversionRate: agent.calls > 0 ? Number(((agent.sales / agent.calls) * 100).toFixed(1)) : 0,
      avgScore: agent.scoreCount > 0 ? Number((agent.totalScore / agent.scoreCount).toFixed(1)) : 0,
      avgDuration: agent.calls > 0 ? Math.round(agent.totalDuration / agent.calls) : 0,
      sentimentRatio: agent.calls > 0 ? Number(((agent.positiveCount / agent.calls) * 100).toFixed(1)) : 0
    })).slice(0, 10);

    // Enhanced chart data
    const sentimentData = [
      { name: 'Positivo', value: positiveCalls, color: '#22c55e', percentage: totalCalls > 0 ? Number(((positiveCalls / totalCalls) * 100).toFixed(1)) : 0 },
      { name: 'Neutral', value: neutralCalls, color: '#6b7280', percentage: totalCalls > 0 ? Number(((neutralCalls / totalCalls) * 100).toFixed(1)) : 0 },
      { name: 'Negativo', value: negativeCalls, color: '#ef4444', percentage: totalCalls > 0 ? Number(((negativeCalls / totalCalls) * 100).toFixed(1)) : 0 }
    ];

    const resultData = [
      { name: 'Ventas', value: salesCalls, color: '#22c55e' },
      { name: 'No Ventas', value: noSaleCalls, color: '#ef4444' },
      { name: 'Sin Resultado', value: calls.filter(call => !call.result || call.result === '').length, color: '#6b7280' }
    ];

    // Performance radar data
    const performanceRadar = [
      { metric: 'Conversión', value: conversionRate, fullMark: 100 },
      { metric: 'Calidad', value: averageScore * 10, fullMark: 100 },
      { metric: 'Sentimiento', value: sentimentScore, fullMark: 100 },
      { metric: 'Eficiencia', value: completedCalls > 0 ? (completedCalls / totalCalls) * 100 : 0, fullMark: 100 },
      { metric: 'Volumen', value: totalCalls > 0 ? Math.min((totalCalls / 100) * 100, 100) : 0, fullMark: 100 }
    ];

    return {
      totalCalls,
      completedCalls,
      pendingCalls,
      salesCalls,
      noSaleCalls,
      conversionRate,
      averageScore,
      averageDuration,
      positiveCalls,
      neutralCalls,
      negativeCalls,
      sentimentScore,
      callsPerDay,
      agentData,
      sentimentData,
      resultData,
      performanceRadar
    };
  }, [calls]);

  if (!selectedAccountId) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Análisis Avanzado</h1>
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
            <h1 className="text-3xl font-bold tracking-tight">Análisis Avanzado</h1>
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
            <h1 className="text-3xl font-bold tracking-tight">Análisis Avanzado</h1>
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

  if (!analytics) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Análisis Avanzado</h1>
            <p className="text-muted-foreground">
              No hay datos disponibles para mostrar.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const accountName = selectedAccountId === 'all' ? 'Todas las cuentas' : 'Cuenta seleccionada';

  // Custom tooltip for charts with type safety
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => {
            const value = entry.value;
            const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
            return (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {entry.name?.includes('Rate') || entry.name?.includes('Score') 
                  ? numericValue.toFixed(1) 
                  : Math.round(numericValue)}
                {entry.name?.includes('Rate') ? '%' : ''}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Analítico Avanzado</h1>
            <p className="text-muted-foreground">
              Análisis completo de {accountName} - {analytics.totalCalls} llamadas encontradas
            </p>
          </div>
          <Button onClick={handleManualRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Filtros */}
        <AnalyticsFilters onFilterChange={handleFilterChange} />

        {/* Enhanced KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Llamadas</CardTitle>
              <Phone className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{analytics.totalCalls}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {analytics.completedCalls} completadas ({analytics.totalCalls > 0 ? ((analytics.completedCalls/analytics.totalCalls)*100).toFixed(1) : 0}%)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa Conversión</CardTitle>
              <Target className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {analytics.conversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                {analytics.salesCalls} ventas realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Promedio</CardTitle>
              <Award className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {analytics.averageScore.toFixed(1)}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                De {analytics.completedCalls} evaluaciones
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duración Media</CardTitle>
              <Clock className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {Math.round(analytics.averageDuration / 60)}m {Math.round(analytics.averageDuration % 60)}s
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Duración total: {Math.round((calls?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0) / 3600)}h
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 border-indigo-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sentimiento</CardTitle>
              <Activity className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {analytics.sentimentScore.toFixed(0)}%
              </div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">
                {analytics.positiveCalls} positivas de {analytics.totalCalls}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tendencia Mensual (30 días)
              </CardTitle>
              <CardDescription>
                Evolución diaria de llamadas, ventas y calidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={analytics.callsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="calls" stackId="1" stroke="#3b82f6" fill="#93c5fd" name="Llamadas" />
                  <Area yAxisId="left" type="monotone" dataKey="sales" stackId="1" stroke="#10b981" fill="#86efac" name="Ventas" />
                  <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="#f59e0b" strokeWidth={3} name="Score Promedio" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance Global
              </CardTitle>
              <CardDescription>
                Análisis multidimensional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={analytics.performanceRadar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" fontSize={12} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} fontSize={10} />
                  <Radar name="Performance" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance */}
        {analytics.agentData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Rendimiento por Agente
              </CardTitle>
              <CardDescription>
                Análisis comparativo de métricas individuales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.agentData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    fontSize={12}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="calls" fill="#3b82f6" name="Llamadas" />
                  <Bar yAxisId="right" dataKey="conversionRate" fill="#10b981" name="Conversión %" />
                  <Bar yAxisId="right" dataKey="avgScore" fill="#f59e0b" name="Score Promedio" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Sentiment and Results */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Análisis de Sentimientos
              </CardTitle>
              <CardDescription>
                Distribución emocional de las llamadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.sentimentData.map((entry, index) => (
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
              <CardTitle>Distribución de Resultados</CardTitle>
              <CardDescription>
                Outcomes de las llamadas realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.resultData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                    {analytics.resultData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
