
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { toast } from "sonner";
import { Call } from "@/lib/types";

export const useCallList = () => {
  const { user } = useAuth();
  const { selectedAccountId, userAccounts } = useAccount();
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // CORREGIDO: Lógica de filtrado para SuperAdmin
  const fetchCalls = useCallback(async (filters: any = {}, forceRefresh = false) => {
    if (!user) return;

    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      console.log("Fetching calls for user:", user.email, "role:", user.role);

      let query = supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false });

      // CORREGIDO: SuperAdmin ve todas las llamadas sin filtrar
      if (user.role === 'superAdmin') {
        console.log("SuperAdmin - loading all calls");
        // SuperAdmin ve todas las llamadas, opcionalmente filtradas por cuenta seleccionada
        if (selectedAccountId && selectedAccountId !== 'all') {
          query = query.eq('account_id', selectedAccountId);
          console.log("SuperAdmin - filtering by selected account:", selectedAccountId);
        }
      } else {
        // Usuario normal solo ve llamadas de sus cuentas asignadas
        const accountIds = userAccounts.map(account => account.id);
        console.log("Regular user - filtering by assigned accounts:", accountIds);
        
        if (accountIds.length > 0) {
          if (selectedAccountId && selectedAccountId !== 'all') {
            // Filtrar por cuenta específica seleccionada
            query = query.eq('account_id', selectedAccountId);
          } else {
            // Mostrar todas las llamadas de las cuentas asignadas
            query = query.in('account_id', accountIds);
          }
        } else {
          // Usuario sin cuentas asignadas no ve nada
          console.log("User has no assigned accounts");
          setCalls([]);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }

      // Aplicar filtros adicionales (búsqueda, fecha, etc.)
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,agent_name.ilike.%${filters.search}%,filename.ilike.%${filters.search}%`);
      }

      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.agent && filters.agent !== 'all') {
        query = query.eq('agent_name', filters.agent);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map the database fields to the expected Call interface
      const mappedCalls: Call[] = (data || []).map(dbCall => ({
        id: dbCall.id,
        title: dbCall.title,
        filename: dbCall.filename,
        agentName: dbCall.agent_name, // Map agent_name to agentName
        agentId: dbCall.agent_id,
        duration: dbCall.duration,
        date: dbCall.date,
        status: dbCall.status as "pending" | "transcribing" | "analyzing" | "complete" | "error",
        progress: dbCall.progress,
        audio_url: dbCall.audio_url, // Keep both for compatibility
        audioUrl: dbCall.audio_url, // Map audio_url to audioUrl
        transcription: dbCall.transcription,
        summary: dbCall.summary,
        result: dbCall.result as "" | "venta" | "no venta",
        product: dbCall.product as "" | "fijo" | "móvil",
        reason: dbCall.reason,
        tipificacionId: dbCall.tipificacion_id,
        speaker_analysis: dbCall.speaker_analysis,
        statusSummary: dbCall.status_summary,
        account_id: dbCall.account_id,
      }));

      console.log("Calls loaded:", mappedCalls.length);
      setCalls(mappedCalls);
    } catch (error: any) {
      console.error('Error fetching calls:', error);
      setError(error.message);
      toast.error('Error al cargar las llamadas');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, selectedAccountId, userAccounts]);

  const handleRefresh = useCallback(() => {
    fetchCalls({}, true);
  }, [fetchCalls]);

  const deleteCall = async (callId: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('calls')
        .delete()
        .eq('id', callId);

      if (error) throw error;

      setCalls(calls.filter(call => call.id !== callId));
      toast.success('Llamada eliminada correctamente');
    } catch (error: any) {
      console.error('Error deleting call:', error);
      toast.error('Error al eliminar la llamada');
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMultipleCalls = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('calls')
        .delete()
        .in('id', selectedCalls);

      if (error) throw error;

      setCalls(calls.filter(call => !selectedCalls.includes(call.id)));
      setSelectedCalls([]);
      setMultiSelectMode(false);
      toast.success('Llamadas eliminadas correctamente');
    } catch (error: any) {
      console.error('Error deleting calls:', error);
      toast.error('Error al eliminar las llamadas');
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCallSelection = (callId: string) => {
    setSelectedCalls(prev => {
      if (prev.includes(callId)) {
        return prev.filter(id => id !== callId);
      } else {
        return [...prev, callId];
      }
    });
  };

  const toggleAllCalls = () => {
    if (selectedCalls.length === calls.length) {
      setSelectedCalls([]);
    } else {
      setSelectedCalls(calls.map(call => call.id));
    }
  };

  // Load calls when dependencies change
  useEffect(() => {
    if (user) {
      console.log("Dependencies changed - fetching calls");
      fetchCalls();
    }
  }, [fetchCalls]);

  return {
    calls,
    isLoading,
    selectedCalls,
    isRefreshing,
    error,
    multiSelectMode,
    setMultiSelectMode,
    fetchCalls,
    handleRefresh,
    deleteCall,
    deleteMultipleCalls,
    toggleCallSelection,
    toggleAllCalls,
  };
};
