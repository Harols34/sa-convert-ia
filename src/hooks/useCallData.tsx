
import { useState, useEffect, useRef } from "react";
import { Call, Feedback, BehaviorAnalysis } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateCallStatus } from "@/components/calls/detail/CallUtils";

// Cache para almacenar las llamadas ya cargadas
const callCache = new Map<string, {
  data: Call,
  timestamp: number,
  transcriptSegments: any[]
}>();

// TTL en milisegundos (5 minutos)
const CACHE_TTL = 5 * 60 * 1000;

export function useCallData(id: string | undefined) {
  const [call, setCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Referencia para cancelar operaciones si el componente se desmonta
  const isMounted = useRef(true);

  // Verificar cache
  useEffect(() => {
    if (!id) return;
    
    const now = Date.now();
    const cachedData = callCache.get(id);
    
    if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
      console.log("Using cached call data for ID:", id);
      setCall(cachedData.data);
      setTranscriptSegments(cachedData.transcriptSegments);
      setIsLoading(false);
      setLoadError(null);
      return;
    }
    
    const loadCallData = async () => {
      if (!id || !isMounted.current) return;
      
      setIsLoading(true);
      setLoadError(null);
      
      try {
        console.log("Loading call data for ID:", id);
        
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .select('*')
          .eq('id', id)
          .single();
          
        if (callError) {
          console.error("Error loading call:", callError);
          if (isMounted.current) {
            setLoadError(`Error loading call: ${callError.message}`);
          }
          throw callError;
        }
        
        if (!callData) {
          console.error("No call found with ID:", id);
          if (isMounted.current) {
            setLoadError("Call not found");
          }
          return;
        }
        
        console.log("Call data loaded:", callData);
        
        const callObject: Call = {
          id: callData.id,
          title: callData.title,
          filename: callData.filename,
          agentName: callData.agent_name || "Sin asignar",
          agentId: callData.agent_id,
          duration: callData.duration || 0,
          date: callData.date,
          status: validateCallStatus(callData.status),
          progress: callData.progress,
          audio_url: callData.audio_url,
          audioUrl: callData.audio_url,
          transcription: callData.transcription,
          summary: callData.summary,
          result: (callData.result as "venta" | "no venta" | "") || "",
          product: (callData.product as "fijo" | "móvil" | "") || "",
          reason: callData.reason || "",
          tipificacionId: callData.tipificacion_id,
          speaker_analysis: callData.speaker_analysis || null,
          statusSummary: callData.status_summary || ""
        };
        
        let segments: any[] = [];
        
        if (callData.transcription) {
          try {
            if (typeof callData.transcription === 'string') {
              try {
                const parsedTranscription = JSON.parse(callData.transcription);
                segments = parsedTranscription;
                if (isMounted.current) {
                  setTranscriptSegments(parsedTranscription);
                }
              } catch (parseError) {
                console.error("Error parsing transcription JSON:", parseError);
                if (isMounted.current) {
                  setTranscriptSegments([]);
                }
              }
            } else if (Array.isArray(callData.transcription)) {
              segments = callData.transcription;
              if (isMounted.current) {
                setTranscriptSegments(callData.transcription);
              }
            } else {
              console.error("Transcription is not a string or array:", callData.transcription);
              if (isMounted.current) {
                setTranscriptSegments([]);
              }
            }
          } catch (e) {
            console.error("Error handling transcription:", e);
            if (isMounted.current) {
              setTranscriptSegments([]);
            }
          }
        }
        
        if (callData.id) {
          console.log("Loading feedback data for call:", callData.id);
          
          const { data: feedbackData, error: feedbackError } = await supabase
            .from('feedback')
            .select('*')
            .eq('call_id', callData.id)
            .maybeSingle();
            
          if (feedbackError && feedbackError.code !== 'PGRST116') {
            console.error("Error loading feedback:", feedbackError);
          }
          
          if (feedbackData) {
            console.log("Feedback loaded:", feedbackData);
            
            let behaviorsAnalysis: BehaviorAnalysis[] = [];
            
            if (feedbackData.behaviors_analysis) {
              try {
                if (typeof feedbackData.behaviors_analysis === 'string') {
                  console.log("Converting behaviors_analysis from string");
                  const parsed = JSON.parse(feedbackData.behaviors_analysis);
                  behaviorsAnalysis = validateBehaviorsAnalysis(parsed);
                } else if (Array.isArray(feedbackData.behaviors_analysis)) {
                  console.log("Validating behaviors_analysis array");
                  behaviorsAnalysis = validateBehaviorsAnalysis(feedbackData.behaviors_analysis);
                } else {
                  console.error("behaviors_analysis is not in expected format:", feedbackData.behaviors_analysis);
                  behaviorsAnalysis = [];
                }
                
                console.log("Validated behaviors analysis:", behaviorsAnalysis);
              } catch (e) {
                console.error("Error parsing behaviors_analysis:", e);
                behaviorsAnalysis = [];
              }
            }
            
            const typedFeedback: Feedback = {
              positive: feedbackData.positive || [],
              negative: feedbackData.negative || [],
              opportunities: feedbackData.opportunities || [],
              score: feedbackData.score || 0,
              behaviors_analysis: behaviorsAnalysis,
              call_id: feedbackData.call_id,
              id: feedbackData.id,
              created_at: feedbackData.created_at,
              updated_at: feedbackData.updated_at,
              sentiment: feedbackData.sentiment,
              topics: feedbackData.topics,
              entities: feedbackData.entities
            };
            
            callObject.feedback = typedFeedback;
          }
        }
        
        // Guardar en caché
        callCache.set(id, {
          data: callObject,
          timestamp: Date.now(),
          transcriptSegments: segments
        });
        
        if (isMounted.current) {
          setCall(callObject);
          setIsLoading(false);
          setLoadError(null);
        }
        
      } catch (error) {
        console.error("Error loading data:", error);
        if (isMounted.current) {
          setLoadError(error instanceof Error ? error.message : "Unknown error");
          toast.error("Error al cargar la llamada", {
            description: "No se pudieron obtener los datos de la llamada"
          });
          setIsLoading(false);
        }
      }
    };

    loadCallData();
    
    // Cleanup función para prevenir problemas de actualización si el componente es desmontado
    return () => {
      isMounted.current = false;
    };
  }, [id]);

  function validateBehaviorsAnalysis(data: any[]): BehaviorAnalysis[] {
    if (!Array.isArray(data)) {
      console.error("Expected an array for behaviors_analysis, got:", typeof data);
      return [];
    }
    
    return data.filter(item => {
      const isValid = item && 
        typeof item === 'object' && 
        typeof item.name === 'string' && 
        (item.evaluation === 'cumple' || item.evaluation === 'no cumple') &&
        typeof item.comments === 'string';
        
      if (!isValid) {
        console.error("Invalid behavior item:", item);
      }
      
      return isValid;
    }).map(item => ({
      name: item.name,
      evaluation: item.evaluation as "cumple" | "no cumple",
      comments: item.comments
    }));
  }

  return {
    call,
    setCall,
    isLoading,
    transcriptSegments,
    error: loadError
  };
}
