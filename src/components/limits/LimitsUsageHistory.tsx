
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Filter, Download, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccounts } from "@/hooks/useAccounts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UsageRecord {
  id: string;
  account_id: string;
  tipo: string;
  cantidad: number;
  fecha: string;
  origen: string | null;
  costo_usd: number;
  account_name?: string;
}

export default function LimitsUsageHistory() {
  const { accounts } = useAccounts();
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    account: "all",
    tipo: "all",
    fechaInicio: "",
    fechaFin: ""
  });

  const fetchUsageHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('usage_tracking')
        .select(`
          *,
          accounts!usage_tracking_account_id_fkey(name)
        `)
        .order('fecha', { ascending: false })
        .limit(500);

      // Apply filters
      if (filters.account !== "all") {
        query = query.eq('account_id', filters.account);
      }

      if (filters.tipo !== "all") {
        query = query.eq('tipo', filters.tipo);
      }

      if (filters.fechaInicio) {
        query = query.gte('fecha', filters.fechaInicio);
      }

      if (filters.fechaFin) {
        query = query.lte('fecha', filters.fechaFin);
      }

      const { data, error: usageError } = await query;

      if (usageError) throw usageError;

      // Transform data to include account names
      const transformedData = (data || []).map(record => ({
        ...record,
        account_name: record.accounts?.name || "Cuenta desconocida"
      }));

      setUsage(transformedData);
    } catch (err: any) {
      console.error("Error fetching usage history:", err);
      setError(err.message || "Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageHistory();
  }, [filters]);

  const summaryStats = useMemo(() => {
    return usage.reduce((acc, record) => {
      acc.totalRecords += 1;
      acc.totalCost += record.costo_usd;
      
      if (record.tipo === 'transcripcion') {
        acc.totalTranscription += record.cantidad;
      } else {
        acc.totalQueries += record.cantidad;
      }
      
      return acc;
    }, {
      totalRecords: 0,
      totalTranscription: 0,
      totalQueries: 0,
      totalCost: 0
    });
  }, [usage]);

  const getTipoLabel = (tipo: string) => {
    const labels = {
      transcripcion: "Transcripción",
      chat_llamada: "Chat de Llamada",
      chat_general: "Chat General"
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };

  const getTipoBadgeVariant = (tipo: string) => {
    const variants = {
      transcripcion: "default",
      chat_llamada: "secondary",
      chat_general: "outline"
    };
    return variants[tipo as keyof typeof variants] || "outline";
  };

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
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Cuenta</Label>
              <Select 
                value={filters.account} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, account: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las cuentas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuentas</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Uso</Label>
              <Select 
                value={filters.tipo} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="transcripcion">Transcripción</SelectItem>
                  <SelectItem value="chat_llamada">Chat de Llamada</SelectItem>
                  <SelectItem value="chat_general">Chat General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={filters.fechaInicio}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaInicio: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filters.fechaFin}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaFin: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setFilters({ account: "all", tipo: "all", fechaInicio: "", fechaFin: "" })}
            >
              Limpiar Filtros
            </Button>
            <Button
              variant="outline"
              onClick={fetchUsageHistory}
              disabled={loading}
            >
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{summaryStats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">Registros totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{summaryStats.totalTranscription.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Horas transcritas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{summaryStats.totalQueries}</div>
            <p className="text-xs text-muted-foreground">Consultas realizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">${summaryStats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Costo total USD</p>
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Uso</CardTitle>
          <CardDescription>
            Registros detallados de uso de recursos ({usage.length} registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse border rounded p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : usage.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No se encontraron registros para los filtros seleccionados
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {usage.map((record) => (
                <Card key={record.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{record.account_name}</h4>
                          <Badge variant={getTipoBadgeVariant(record.tipo) as any}>
                            {getTipoLabel(record.tipo)}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Cantidad: {record.cantidad}</span>
                          <span>Costo: ${record.costo_usd.toFixed(4)} USD</span>
                          <span>
                            {format(new Date(record.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
