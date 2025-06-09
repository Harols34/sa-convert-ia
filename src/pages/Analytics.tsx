
import React from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import ResultsChart from "@/components/analytics/ResultsChart";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Users, Clock, Target } from "lucide-react";

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
          feedback (
            score,
            sentiment
          )
        `)
        .order('date', { ascending: false });

      // Corregir el filtro para manejar "all" correctamente
      if (selectedAccountId && selectedAccountId !== 'all') {
        console.log("Filtering by specific account:", selectedAccountId);
        query = query.eq('account_id', selectedAccountId);
      } else if (selectedAccountId === 'all' && user?.role === 'superAdmin') {
        console.log("SuperAdmin viewing all calls - no account filter applied");
        // No aplicar filtro de account_id para superadmin con "all"
      } else if (!selectedAccountId) {
        // Si no hay cuenta seleccionada, retornar array vacío
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

  const totalCalls = calls?.length || 0;
  const completedCalls = calls?.filter(call => call.status === 'complete')?.length || 0;
  const salesCalls = calls?.filter(call => call.result === 'venta')?.length || 0;
  const conversionRate = totalCalls > 0 ? (salesCalls / totalCalls) * 100 : 0;
  
  const averageScore = calls?.reduce((sum, call) => {
    const score = call.feedback?.[0]?.score || 0;
    return sum + score;
  }, 0) / Math.max(completedCalls, 1) || 0;

  const averageDuration = calls?.reduce((sum, call) => sum + (call.duration || 0), 0) / Math.max(totalCalls, 1) || 0;

  const sentimentData = calls?.reduce((acc, call) => {
    const sentiment = call.sentiment || call.feedback?.[0]?.sentiment || 'neutral';
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const accountName = selectedAccountId === 'all' ? 'Todas las cuentas' : 'Cuenta seleccionada';

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Análisis</h1>
            <p className="text-muted-foreground">
              Análisis de {accountName} - {totalCalls} llamadas
            </p>
          </div>
          <Button onClick={handleManualRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Métricas principales mejoradas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Llamadas</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalCalls}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {completedCalls} completadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {conversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                {salesCalls} ventas de {totalCalls} llamadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Puntuación Promedio</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {averageScore.toFixed(1)}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Basado en {completedCalls} llamadas evaluadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duración Promedio</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {Math.round(averageDuration / 60)}m
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                {Math.round(averageDuration)} segundos promedio
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Sentimientos</CardTitle>
              <CardDescription>
                Distribución de sentimientos en las llamadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(sentimentData).map(([sentiment, count]) => {
                  const percentage = (count / totalCalls) * 100;
                  const colors = {
                    positive: 'bg-green-500',
                    negative: 'bg-red-500',
                    neutral: 'bg-gray-500'
                  };
                  
                  return (
                    <div key={sentiment} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{sentiment}</span>
                        <span>{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[sentiment as keyof typeof colors] || 'bg-gray-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de Resultados</CardTitle>
              <CardDescription>
                Tipos de resultados de las llamadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['venta', 'no venta', ''].map((result) => {
                  const count = calls?.filter(call => call.result === result || (!call.result && result === ''))?.length || 0;
                  const percentage = totalCalls > 0 ? (count / totalCalls) * 100 : 0;
                  const label = result || 'Sin resultado';
                  
                  return (
                    <div key={result || 'empty'} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{label}</span>
                        <span>{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            result === 'venta' ? 'bg-green-500' : 
                            result === 'no venta' ? 'bg-red-500' : 'bg-gray-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
