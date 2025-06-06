
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface Call {
  id: string;
  title: string;
  agent_name: string;
  date: string;
  duration: number;
  status: string;
  sentiment?: string;
  result?: string;
  product?: string;
  reason?: string;
  account_id?: string;
  agent_id?: string;
  audio_url?: string;
  transcription?: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export function useCallList() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  const loadCalls = async () => {
    if (!session || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Loading calls for user:", user.role);
      
      let query = supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false });

      // If not superAdmin, filter by user's accounts
      if (user.role !== 'superAdmin') {
        // Get user's account IDs first
        const { data: userAccounts, error: accountsError } = await supabase
          .from('user_accounts')
          .select('account_id')
          .eq('user_id', user.id);

        if (accountsError) {
          throw accountsError;
        }

        const accountIds = userAccounts?.map(ua => ua.account_id) || [];
        
        if (accountIds.length === 0) {
          // User has no accounts assigned, return empty array
          setCalls([]);
          setLoading(false);
          return;
        }

        query = query.in('account_id', accountIds);
      }

      const { data, error: callsError } = await query;

      if (callsError) {
        throw callsError;
      }

      console.log("Calls loaded successfully:", data?.length || 0);
      setCalls(data || []);
    } catch (err: any) {
      console.error("Error fetching calls:", err);
      setError(err.message || "Error al cargar las llamadas");
      
      // Don't show toast for timeout errors as they're often temporary
      if (!err.message?.includes('timeout')) {
        toast.error("Error al cargar las llamadas");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, [user, session]);

  const refreshCalls = () => {
    loadCalls();
  };

  return {
    calls,
    loading,
    error,
    refreshCalls,
  };
}
