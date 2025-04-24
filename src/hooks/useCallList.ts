
import { useState, useEffect, useCallback } from "react";
import { Call, Feedback, BehaviorAnalysis } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateCallStatus } from "@/components/calls/detail/CallUtils";

export function useCallList() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchCalls = useCallback(async (filters: any = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Set a reasonable page size to prevent timeouts
      const pageSize = 250;
      
      let query = supabase
        .from("calls")
        .select(`
          id, 
          title, 
          filename,
          agent_name,
          agent_id,
          duration,
          date,
          status,
          progress,
          audio_url,
          summary,
          result,
          product,
          reason,
          tipificacion_id,
          status_summary
        `)
        .order("date", { ascending: false })
        .limit(pageSize);

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.result) {
        query = query.eq("result", filters.result);
      }

      if (filters.tipificacionId && filters.tipificacionId !== "all_tipificaciones") {
        query = query.eq("tipificacion_id", filters.tipificacionId);
      }

      if (filters.agentId && filters.agentId !== "all_agents") {
        query = query.eq("agent_id", filters.agentId);
      }

      if (filters.dateRange && filters.dateRange.from) {
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        query = query.gte("date", fromDate.toISOString());
        
        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          query = query.lte("date", toDate.toISOString());
        }
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,agent_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching calls:", error);
        setError(`${error.message}`);
        toast.error("Error al cargar las llamadas");
        return;
      }

      const mappedCalls: Call[] = data.map((call) => {
        let result: "" | "venta" | "no venta" = "";
        
        let product: "" | "fijo" | "móvil" = "";
        if (call.product === "fijo" || call.product === "móvil") {
          product = call.product;
        }
        
        return {
          id: call.id,
          title: call.title,
          filename: call.filename,
          agentName: call.agent_name || "Sin asignar",
          agentId: call.agent_id,
          duration: call.duration || 0,
          date: call.date,
          status: validateCallStatus(call.status),
          progress: call.progress || 0,
          audio_url: call.audio_url,
          audioUrl: call.audio_url,
          transcription: null,
          summary: call.summary || "",
          result: result,
          product: product,
          reason: call.reason || "",
          tipificacionId: call.tipificacion_id,
          feedback: undefined,
          statusSummary: call.status_summary || ""
        };
      });

      // Now fetch feedback data in batches to avoid timeout
      if (mappedCalls.length > 0) {
        const callIds = mappedCalls.map(call => call.id);
        
        // Fetch feedback in smaller batches
        const batchSize = 10;
        for (let i = 0; i < callIds.length; i += batchSize) {
          const batchIds = callIds.slice(i, i + batchSize);
          
          const { data: feedbackData } = await supabase
            .from('feedback')
            .select('*')
            .in('call_id', batchIds);
            
          if (feedbackData) {
            for (const feedback of feedbackData) {
              const callIndex = mappedCalls.findIndex(call => call.id === feedback.call_id);
              
              if (callIndex !== -1) {
                let behaviorsAnalysis: BehaviorAnalysis[] = [];
                
                if (feedback.behaviors_analysis) {
                  try {
                    if (typeof feedback.behaviors_analysis === 'string') {
                      behaviorsAnalysis = JSON.parse(feedback.behaviors_analysis);
                    } else if (Array.isArray(feedback.behaviors_analysis)) {
                      behaviorsAnalysis = feedback.behaviors_analysis.map((item: any) => ({
                        name: item.name || "",
                        evaluation: (item.evaluation === "cumple" || item.evaluation === "no cumple") 
                          ? item.evaluation : "no cumple",
                        comments: item.comments || ""
                      }));
                    }
                  } catch (e) {
                    console.error("Error parsing behaviors_analysis:", e);
                  }
                }
                
                mappedCalls[callIndex].feedback = {
                  id: feedback.id,
                  call_id: feedback.call_id,
                  score: feedback.score || 0,
                  positive: feedback.positive || [],
                  negative: feedback.negative || [],
                  opportunities: feedback.opportunities || [],
                  behaviors_analysis: behaviorsAnalysis,
                  created_at: feedback.created_at,
                  updated_at: feedback.updated_at,
                  sentiment: feedback.sentiment,
                  topics: feedback.topics || [],
                  entities: feedback.entities || []
                };
              }
            }
          }
        }
      }

      setCalls(mappedCalls);
      setError(null);
      setRetryCount(0);
    } catch (error) {
      console.error("Unexpected error fetching calls:", error);
      setError(error instanceof Error ? error.message : "Error inesperado al cargar las llamadas");
      
      // Implement retry logic (max 3 retries)
      if (retryCount < 3) {
        const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
        toast.error(`Error al cargar las llamadas. Reintentando en ${retryDelay/1000} segundos...`);
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchCalls(filters);
        }, retryDelay);
      } else {
        toast.error("Error al cargar las llamadas después de varios intentos");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [retryCount]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRetryCount(0);
    fetchCalls({});
  }, [fetchCalls]);

  useEffect(() => {
    fetchCalls({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteCall = async (callId: string) => {
    try {
      const { error } = await supabase.from("calls").delete().eq("id", callId);

      if (error) {
        console.error("Error deleting call:", error);
        toast.error("Error al eliminar la llamada");
      } else {
        setCalls((prevCalls) => prevCalls.filter((call) => call.id !== callId));
        toast.success("Llamada eliminada correctamente");
      }
    } catch (error) {
      console.error("Unexpected error deleting call:", error);
      toast.error("Error inesperado al eliminar la llamada");
    }
  };

  const deleteMultipleCalls = async () => {
    if (selectedCalls.length === 0) return;

    try {
      toast.loading(`Eliminando ${selectedCalls.length} llamadas...`, { id: "delete-multiple" });

      const { error } = await supabase
        .from("calls")
        .delete()
        .in("id", selectedCalls);

      if (error) {
        console.error("Error deleting calls:", error);
        toast.error("Error al eliminar las llamadas", { id: "delete-multiple" });
      } else {
        setCalls((prevCalls) => prevCalls.filter((call) => !selectedCalls.includes(call.id)));
        toast.success(`${selectedCalls.length} llamadas eliminadas correctamente`, { id: "delete-multiple" });
        setSelectedCalls([]);
        setMultiSelectMode(false);
      }
    } catch (error) {
      console.error("Unexpected error deleting calls:", error);
      toast.error("Error inesperado al eliminar las llamadas", { id: "delete-multiple" });
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

  const toggleAllCalls = (select: boolean) => {
    if (select) {
      setSelectedCalls(calls.map(call => call.id));
    } else {
      setSelectedCalls([]);
    }
  };

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
}
