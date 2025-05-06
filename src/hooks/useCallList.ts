
import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number | null>(null);
  const [fetchInProgress, setFetchInProgress] = useState(false);

  // Cachea los resultados de la consulta para evitar solicitudes duplicadas
  const fetchCalls = useCallback(async (filters: any = {}, forceRefresh = false) => {
    // Evita consultas simultáneas
    if (fetchInProgress) {
      console.log("Fetch already in progress, skipping request");
      return;
    }
    
    // Comprueba si ha pasado suficiente tiempo desde la última actualización (30 segundos)
    const now = Date.now();
    if (!forceRefresh && lastFetchTimestamp && now - lastFetchTimestamp < 30000) {
      console.log("Using cached data, last fetch was", Math.round((now - lastFetchTimestamp)/1000), "seconds ago");
      return;
    }
    
    try {
      setFetchInProgress(true);
      setIsLoading(prevLoading => calls.length === 0 ? true : prevLoading);
      setError(null);
      
      console.time("fetchCalls");
      
      // Set a reasonable page size to prevent timeouts
      const pageSize = 1000;
      
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

      // Aplicar filtros si existen
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

      // Mejorar la búsqueda para que funcione con coincidencias parciales
      if (filters.search && filters.search.trim() !== '') {
        const searchTerm = filters.search.trim().toLowerCase();
        console.log("Buscando por término:", searchTerm);
        
        // Usar ILIKE para búsqueda insensible a mayúsculas/minúsculas con comodines %
        // Colocar % antes y después del término para buscar coincidencias parciales en cualquier parte
        query = query.or(`title.ilike.%${searchTerm}%,filename.ilike.%${searchTerm}%,agent_name.ilike.%${searchTerm}%`);
      }

      console.log("Fetching calls with filters:", filters);
      const { data, error } = await query;

      if (error) {
        console.error("Error fetching calls:", error);
        setError(`${error.message}`);
        toast.error("Error al cargar las llamadas");
        return;
      }

      console.log(`Loaded ${data?.length || 0} calls`);
      
      // Procesar datos de llamadas de forma más eficiente
      const mappedCalls: Call[] = (data || []).map((call) => {
        let result: "" | "venta" | "no venta" = "";
        if (call.result === "venta" || call.result === "no venta") {
          result = call.result;
        }
        
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

      // Ahora buscar los feedbacks en lotes más pequeños y sólo si hay llamadas
      if (mappedCalls.length > 0) {
        const callIds = mappedCalls.map(call => call.id);
        
        // Fetch feedback in smaller batches with a more efficient approach
        const batchSize = 20; // Aumentado para reducir el número de solicitudes
        
        // Crear promesas para todas las consultas de feedback en lotes
        const feedbackPromises = [];
        
        for (let i = 0; i < callIds.length; i += batchSize) {
          const batchIds = callIds.slice(i, i + batchSize);
          
          const feedbackPromise = supabase
            .from('feedback')
            .select('*')
            .in('call_id', batchIds);
            
          feedbackPromises.push(feedbackPromise);
        }
        
        // Ejecutar todas las consultas de feedback en paralelo
        console.time("fetchFeedback");
        const feedbackResults = await Promise.all(feedbackPromises);
        console.timeEnd("fetchFeedback");
        
        // Procesar los resultados
        const feedbackMap = new Map();
        
        // Combinar todos los resultados de feedback
        for (const result of feedbackResults) {
          if (result.data) {
            for (const feedback of result.data) {
              feedbackMap.set(feedback.call_id, feedback);
            }
          }
        }
        
        // Aplicar los feedbacks a las llamadas
        for (let i = 0; i < mappedCalls.length; i++) {
          const call = mappedCalls[i];
          const feedback = feedbackMap.get(call.id);
          
          if (feedback) {
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
            
            mappedCalls[i].feedback = {
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

      setCalls(mappedCalls);
      setLastFetchTimestamp(now);
      setError(null);
      setRetryCount(0);
      
      console.timeEnd("fetchCalls");
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
      setFetchInProgress(false);
    }
  }, [calls.length, fetchInProgress, lastFetchTimestamp, retryCount]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRetryCount(0);
    fetchCalls({}, true);
  }, [fetchCalls]);

  // Efecto para cargar los datos iniciales
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
        // Actualizar el estado local en lugar de recargar todos los datos
        setCalls((prevCalls) => prevCalls.filter((call) => call.id !== callId));
        setSelectedCalls(prev => prev.filter(id => id !== callId));
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
        // Actualizar estado local
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
