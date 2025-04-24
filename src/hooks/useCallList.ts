import { useState, useEffect } from "react";
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

  const fetchCalls = async (filters: any) => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("calls")
        .select(`
          *,
          feedback (*)
        `)
        .order("date", { ascending: false });

      if (filters.status !== "all") {
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
        toast.error("Error al cargar las llamadas");
        return;
      }

      const mappedCalls: Call[] = data.map((call) => {
        let feedback: Feedback | undefined = undefined;
          
        if (call.feedback && call.feedback.length > 0) {
          const fbData = call.feedback[0];
          
          let behaviorsAnalysis: BehaviorAnalysis[] = [];
          if (fbData.behaviors_analysis) {
            if (typeof fbData.behaviors_analysis === 'string') {
              try {
                behaviorsAnalysis = JSON.parse(fbData.behaviors_analysis);
              } catch (e) {
                console.error("Error parsing behaviors_analysis:", e);
              }
            } else if (Array.isArray(fbData.behaviors_analysis)) {
              behaviorsAnalysis = fbData.behaviors_analysis.map((item: any) => ({
                name: item.name || "",
                evaluation: (item.evaluation === "cumple" || item.evaluation === "no cumple") 
                  ? item.evaluation : "no cumple",
                comments: item.comments || ""
              }));
            }
          }
          
          feedback = {
            id: fbData.id,
            call_id: fbData.call_id,
            score: fbData.score || 0,
            positive: fbData.positive || [],
            negative: fbData.negative || [],
            opportunities: fbData.opportunities || [],
            behaviors_analysis: behaviorsAnalysis,
            created_at: fbData.created_at,
            updated_at: fbData.updated_at,
            sentiment: fbData.sentiment,
            topics: fbData.topics || [],
            entities: fbData.entities || []
          };
        }
        
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
          feedback: feedback,
          statusSummary: call.status_summary || ""
        };
      });

      setCalls(mappedCalls);
    } catch (error) {
      console.error("Unexpected error fetching calls:", error);
      toast.error("Error inesperado al cargar las llamadas");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCalls({});
  };

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
