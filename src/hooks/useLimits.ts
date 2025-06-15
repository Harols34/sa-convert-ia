
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AccountLimit {
  id: string;
  account_id: string;
  limite_horas: number;
  limite_consultas: number;
  fecha_creacion: string;
  creado_por: string | null;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  account_id: string;
  tipo: "transcripcion" | "chat_llamada" | "chat_general";
  cantidad: number;
  fecha: string;
  origen: string | null;
  costo_usd: number;
}

export interface LimitsDashboardData {
  account_id: string;
  account_name: string;
  limite_horas: number | null;
  limite_consultas: number | null;
  uso_transcripcion_mes: number;
  uso_consultas_mes: number;
  costo_total_mes: number;
  porcentaje_transcripcion: number;
  porcentaje_consultas: number;
}

export function useLimits() {
  const [limits, setLimits] = useState<AccountLimit[]>([]);
  const [dashboardData, setDashboardData] = useState<LimitsDashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: limitsError } = await supabase
        .from('account_limits')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (limitsError) throw limitsError;

      setLimits(data || []);
    } catch (err: any) {
      console.error("Error fetching limits:", err);
      setError(err.message || "Error al cargar los límites");
      toast.error("Error al cargar los límites");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dashboardError } = await supabase
        .from('limits_dashboard')
        .select('*')
        .order('account_name');

      if (dashboardError) throw dashboardError;

      setDashboardData(data || []);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Error al cargar el dashboard");
      toast.error("Error al cargar el dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrUpdateLimit = async (accountId: string, limiteHoras: number, limiteConsultas: number) => {
    try {
      const { data, error } = await supabase
        .from('account_limits')
        .upsert({
          account_id: accountId,
          limite_horas: limiteHoras,
          limite_consultas: limiteConsultas,
          creado_por: (await supabase.auth.getUser()).data.user?.id
        }, {
          onConflict: 'account_id'
        })
        .select();

      if (error) throw error;

      toast.success("Límites actualizados exitosamente");
      fetchLimits();
      fetchDashboardData();
      return data;
    } catch (err: any) {
      console.error("Error updating limits:", err);
      toast.error("Error al actualizar los límites");
      throw err;
    }
  };

  const deleteLimit = async (limitId: string) => {
    try {
      const { error } = await supabase
        .from('account_limits')
        .delete()
        .eq('id', limitId);

      if (error) throw error;

      toast.success("Límite eliminado exitosamente");
      fetchLimits();
      fetchDashboardData();
    } catch (err: any) {
      console.error("Error deleting limit:", err);
      toast.error("Error al eliminar el límite");
      throw err;
    }
  };

  const checkAccountLimit = async (accountId: string, tipo: 'transcripcion' | 'chat_llamada' | 'chat_general') => {
    try {
      const { data, error } = await supabase.rpc('check_account_limits', {
        p_account_id: accountId,
        p_tipo: tipo === 'transcripcion' ? 'transcripcion' : 'consultas'
      });

      if (error) throw error;

      return data?.[0] || null;
    } catch (err: any) {
      console.error("Error checking account limits:", err);
      return null;
    }
  };

  const registerUsage = async (
    accountId: string, 
    tipo: 'transcripcion' | 'chat_llamada' | 'chat_general', 
    cantidad: number, 
    costoUsd: number = 0
  ) => {
    try {
      await supabase.rpc('register_usage', {
        p_account_id: accountId,
        p_tipo: tipo,
        p_cantidad: cantidad,
        p_costo_usd: costoUsd
      });
    } catch (err: any) {
      console.error("Error registering usage:", err);
    }
  };

  useEffect(() => {
    fetchLimits();
    fetchDashboardData();
  }, []);

  return {
    limits,
    dashboardData,
    loading,
    error,
    fetchLimits,
    fetchDashboardData,
    createOrUpdateLimit,
    deleteLimit,
    checkAccountLimit,
    registerUsage
  };
}
