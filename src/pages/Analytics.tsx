
import React from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/context/AccountContext";
import ResultsChart from "@/components/analytics/ResultsChart";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function Analytics() {
  const { selectedAccountId } = useAccount();

  // Remove auto-refresh - only manual refresh
  const { 
    data: calls, 
    isLoading, 
    error,
    refetch 
  } = useOptimizedQuery({
    queryKey: ['analytics-calls', selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return [];
      
      const { data, error } = await supabase
        .from('calls')
        .select(`
          id,
          date,
          result,
          sentiment,
          status,
          agent_name,
          duration,
          feedback (
            score,
            sentiment
          )
        `)
        .eq('account_id', selectedAccountId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedAccountId,
    // Remove automatic refetch options
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false, // No auto-refresh
    staleTime: Infinity, // Data never becomes stale automatically
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
  const averageScore = calls?.reduce((sum, call) => {
    const score = call.feedback?.[0]?.score || 0;
    return sum + score;
  }, 0) / Math.max(completedCalls, 1) || 0;

  const sentimentData = calls?.reduce((acc, call) => {
    const sentiment = call.sentiment || call.feedback?.[0]?.sentiment || 'neutral';
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Análisis</h1>
            <p className="text-muted-foreground">
              Resumen de métricas y análisis de llamadas.
            </p>
          </div>
          <Button onClick={handleManualRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Llamadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCalls}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Llamadas Completadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCalls}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Puntuación Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Finalización</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : 0}%
              </div>
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
              <div className="space-y-2">
                {Object.entries(sentimentData).map(([sentiment, count]) => (
                  <div key={sentiment} className="flex justify-between">
                    <span className="capitalize">{sentiment}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultados por Tiempo</CardTitle>
              <CardDescription>
                Tendencia de resultados a lo largo del tiempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <p className="text-sm text-muted-foreground">Gráfico de tendencias disponible próximamente</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
