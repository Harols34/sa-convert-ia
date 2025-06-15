
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, MessageSquare, DollarSign, AlertTriangle } from "lucide-react";
import { useLimits } from "@/hooks/useLimits";

export default function LimitsDashboard() {
  const { dashboardData, loading, error } = useLimits();
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  const filteredData = useMemo(() => {
    if (selectedAccount === "all") {
      return dashboardData;
    }
    return dashboardData.filter(item => item.account_id === selectedAccount);
  }, [dashboardData, selectedAccount]);

  const summaryStats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalTranscription: 0,
        totalQueries: 0,
        totalCost: 0,
        avgTranscriptionUsage: 0,
        avgQueryUsage: 0
      };
    }

    const totalTranscription = filteredData.reduce((sum, item) => sum + item.uso_transcripcion_mes, 0);
    const totalQueries = filteredData.reduce((sum, item) => sum + item.uso_consultas_mes, 0);
    const totalCost = filteredData.reduce((sum, item) => sum + item.costo_total_mes, 0);
    const avgTranscriptionUsage = filteredData.reduce((sum, item) => sum + item.porcentaje_transcripcion, 0) / filteredData.length;
    const avgQueryUsage = filteredData.reduce((sum, item) => sum + item.porcentaje_consultas, 0) / filteredData.length;

    return {
      totalTranscription,
      totalQueries,
      totalCost,
      avgTranscriptionUsage,
      avgQueryUsage
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro por cuenta */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filtrar por cuenta:</label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Seleccionar cuenta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las cuentas</SelectItem>
            {dashboardData.map((item) => (
              <SelectItem key={item.account_id} value={item.account_id}>
                {item.account_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Transcritas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalTranscription.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Promedio de uso: {summaryStats.avgTranscriptionUsage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas Realizadas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalQueries}</div>
            <p className="text-xs text-muted-foreground">
              Promedio de uso: {summaryStats.avgQueryUsage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryStats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              USD del mes actual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalle por cuenta */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Uso por Cuenta</h3>
        {filteredData.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-center text-muted-foreground">
                No hay datos disponibles para mostrar
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredData.map((account) => (
              <Card key={account.account_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{account.account_name}</CardTitle>
                    <div className="flex gap-2">
                      {account.porcentaje_transcripcion >= 90 && (
                        <Badge variant="destructive">Transcripción crítica</Badge>
                      )}
                      {account.porcentaje_consultas >= 90 && (
                        <Badge variant="destructive">Consultas críticas</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Transcripción</span>
                        <span>{account.uso_transcripcion_mes}h / {account.limite_horas || 100}h</span>
                      </div>
                      <Progress 
                        value={account.porcentaje_transcripcion} 
                        className={account.porcentaje_transcripcion >= 90 ? "bg-red-100" : ""}
                      />
                      <p className="text-xs text-muted-foreground">
                        {account.porcentaje_transcripcion.toFixed(1)}% utilizado
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Consultas</span>
                        <span>{account.uso_consultas_mes} / {account.limite_consultas || 100}</span>
                      </div>
                      <Progress 
                        value={account.porcentaje_consultas}
                        className={account.porcentaje_consultas >= 90 ? "bg-red-100" : ""}
                      />
                      <p className="text-xs text-muted-foreground">
                        {account.porcentaje_consultas.toFixed(1)}% utilizado
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Costo mensual:</span>
                      <span className="font-medium">${account.costo_total_mes.toFixed(2)} USD</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
