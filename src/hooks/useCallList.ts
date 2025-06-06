
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { toast } from "sonner";

export interface Call {
  id: string;
  title: string;
  agent_name: string;
  date: string;
  duration: number;
  status: "pending" | "transcribing" | "analyzing" | "complete" | "error";
  sentiment?: string;
  result?: "" | "venta" | "no venta";
  product?: "" | "fijo" | "móvil";
  reason?: string;
  account_id?: string;
  agent_id?: string;
  audio_url: string;
  transcription?: string;
  summary?: string;
  created_at: string;
  updated_at: string;
  // Add missing properties expected by CallList
  filename: string;
  agentName: string;
  progress: number;
  audioUrl: string;
}

export function useCallList() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const { user, session } = useAuth();
  const { selectedAccountId } = useAccount();

  const loadCalls = useCallback(async (filters?: any, forceRefresh?: boolean) => {
    if (!session || !user) {
      setLoading(false);
      return;
    }

    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log("Loading calls for user:", user.role, "selected account:", selectedAccountId);
      
      let query = supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit results to improve performance

      // Apply filters based on user role and account selection
      if (user.role === 'superAdmin') {
        // SuperAdmin can see all calls or filter by account
        if (selectedAccountId && selectedAccountId !== 'all') {
          query = query.eq('account_id', selectedAccountId);
        }
      } else if (user.role === 'admin') {
        // Admin can only see calls from their assigned accounts
        if (selectedAccountId && selectedAccountId !== 'all') {
          query = query.eq('account_id', selectedAccountId);
        } else {
          // If no specific account selected, don't load any calls
          setCalls([]);
          setLoading(false);
          setIsRefreshing(false);
          return;
        }
      } else {
        // Agents can only see their own calls
        query = query.eq('agent_id', user.id);
      }

      const { data, error: callsError } = await query;

      if (callsError) {
        throw callsError;
      }

      console.log("Calls loaded successfully:", data?.length || 0);
      
      // Transform data to match expected interface with proper type casting
      const transformedCalls = (data || []).map(call => ({
        ...call,
        filename: call.title || 'Unknown',
        agentName: call.agent_name || 'Unknown',
        progress: call.status === 'complete' ? 100 : 
                 call.status === 'analyzing' ? 75 :
                 call.status === 'transcribing' ? 50 : 25,
        audioUrl: call.audio_url || '',
        audio_url: call.audio_url || '',
        status: call.status as "pending" | "transcribing" | "analyzing" | "complete" | "error",
        result: (call.result === "venta" || call.result === "no venta" || call.result === "") ? 
                call.result as "" | "venta" | "no venta" : 
                undefined,
        product: (call.product === "fijo" || call.product === "móvil" || call.product === "") ? 
                 call.product as "" | "fijo" | "móvil" : 
                 undefined,
      })) as Call[];
      
      setCalls(transformedCalls);
    } catch (err: any) {
      console.error("Error fetching calls:", err);
      setError(err.message || "Error al cargar las llamadas");
      
      // Don't show toast for timeout errors as they're often temporary
      if (!err.message?.includes('timeout')) {
        toast.error("Error al cargar las llamadas");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [session, user, selectedAccountId]);

  const fetchCalls = useCallback((filters?: any, forceRefresh?: boolean) => {
    loadCalls(filters, forceRefresh);
  }, [loadCalls]);

  const handleRefresh = useCallback(() => {
    loadCalls(undefined, true);
  }, [loadCalls]);

  const deleteCall = async (callId: string) => {
    try {
      const { error } = await supabase
        .from('calls')
        .delete()
        .eq('id', callId);

      if (error) throw error;

      toast.success("Llamada eliminada exitosamente");
      loadCalls();
    } catch (err: any) {
      console.error("Error deleting call:", err);
      toast.error("Error al eliminar la llamada");
    }
  };

  const deleteMultipleCalls = async () => {
    try {
      const { error } = await supabase
        .from('calls')
        .delete()
        .in('id', selectedCalls);

      if (error) throw error;

      toast.success(`${selectedCalls.length} llamadas eliminadas exitosamente`);
      setSelectedCalls([]);
      setMultiSelectMode(false);
      loadCalls();
    } catch (err: any) {
      console.error("Error deleting calls:", err);
      toast.error("Error al eliminar las llamadas");
    }
  };

  const toggleCallSelection = (callId: string) => {
    setSelectedCalls(prev => 
      prev.includes(callId) 
        ? prev.filter(id => id !== callId)
        : [...prev, callId]
    );
  };

  const toggleAllCalls = () => {
    if (selectedCalls.length === calls.length) {
      setSelectedCalls([]);
    } else {
      setSelectedCalls(calls.map(call => call.id));
    }
  };

  // Load calls when user, session or selected account changes
  useEffect(() => {
    if (user && session) {
      loadCalls();
    }
  }, [user, session, selectedAccountId, loadCalls]);

  const refreshCalls = useCallback(() => {
    loadCalls();
  }, [loadCalls]);

  return {
    calls,
    loading,
    error,
    selectedCalls,
    isRefreshing,
    multiSelectMode,
    setMultiSelectMode,
    fetchCalls,
    handleRefresh,
    deleteCall,
    deleteMultipleCalls,
    toggleCallSelection,
    toggleAllCalls,
    refreshCalls,
    // Add alias for compatibility
    isLoading: loading,
  };
}
