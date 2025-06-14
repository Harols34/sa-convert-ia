
import { useState, useEffect, useRef } from "react";
import { Call, Feedback, BehaviorAnalysis } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateCallStatus } from "@/components/calls/detail/CallUtils";

// Cache con TTL más largo para reducir consultas
const callCache = new Map<string, {
  data: Call,
  timestamp: number,
  transcriptSegments: any[]
}>();

// TTL en milisegundos (10 minutos)
const CACHE_TTL = 10 * 60 * 1000;

export function useCallData(id: string | undefined) {
  const [call, setCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const isMounted = useRef(true);

  useEffect(() => {
    if (!id || id === '*' || id === 'undefined' || id === 'null') {
      setIsLoading(false);
      setLoadError("ID de llamada inválido");
      return;
    }
    
    const now = Date.now();
    const cachedData = callCache.get(id);
    
    // Usar cache si está disponible y no ha expirado
    if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
      console.log("Using cached call data for ID:", id);
      setCall(cachedData.data);
      setTranscriptSegments(cachedData.transcriptSegments);
      setIsLoading(false);
      setLoadError(null);
      return;
    }
    
    const loadCallData = async () => {
      if (!isMounted.current) return;
      
      setIsLoading(true);
      setLoadError(null);
      
      try {
        console.log("Loading call data for ID:", id);
        
        // Timeout para evitar consultas largas
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Call fetch timeout')), 5000)
        );
        
        const queryPromise = supabase
          .from('calls')
          .select('*')
          .eq('id', id)
          .single();
          
        const { data: callData, error: callError } = await Promise.race([queryPromise, timeoutPromise]) as any;
          
        if (callError) {
          console.error("Error loading call:", callError);
          if (isMounted.current) {
            setLoadError(`Error loading call: ${callError.message}`);
          }
          return;
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

        // Parse transcription with improved timestamp handling
        if (callData.transcription && typeof callData.transcription === "string") {
          const transcriptionText = callData.transcription.trim();
          
          // Only try to parse if it looks like timestamped transcription
          if (transcriptionText.includes('[') && transcriptionText.includes(']:')) {
            console.log("Parsing timestamped transcription format");
            segments = parseTimestampedTranscription(transcriptionText);
          } else {
            console.log("Transcription does not appear to be in timestamped format");
            // Create basic segments from text
            const lines = transcriptionText.split('\n').filter(line => line.trim());
            segments = lines.map((line, index) => ({
              text: line.trim(),
              speaker: index % 2 === 0 ? 'agent' : 'client',
              start: index * 5,
              end: (index + 1) * 5
            }));
          }
        } else if (Array.isArray(callData.transcription)) {
          segments = callData.transcription.filter(item => item && typeof item === 'object' && item.text);
        } else {
          segments = [];
        }
        
        // Load feedback data
        if (callData.id && isMounted.current) {
          try {
            const feedbackTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Feedback fetch timeout')), 3000)
            );
            
            const feedbackQueryPromise = supabase
              .from('feedback')
              .select('*')
              .eq('call_id', callData.id)
              .maybeSingle();
              
            const { data: feedbackData, error: feedbackError } = await Promise.race([feedbackQueryPromise, feedbackTimeoutPromise]) as any;
            
            if (feedbackError && feedbackError.code !== 'PGRST116') {
              console.error("Error loading feedback:", feedbackError);
            }
            
            if (feedbackData && isMounted.current) {
              console.log("Feedback loaded:", feedbackData);
              
              let behaviorsAnalysis: BehaviorAnalysis[] = [];
              
              if (feedbackData.behaviors_analysis) {
                try {
                  if (typeof feedbackData.behaviors_analysis === 'string') {
                    const parsed = JSON.parse(feedbackData.behaviors_analysis);
                    behaviorsAnalysis = validateBehaviorsAnalysis(parsed);
                  } else if (Array.isArray(feedbackData.behaviors_analysis)) {
                    behaviorsAnalysis = validateBehaviorsAnalysis(feedbackData.behaviors_analysis);
                  } else {
                    console.error("behaviors_analysis is not in expected format:", feedbackData.behaviors_analysis);
                    behaviorsAnalysis = [];
                  }
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
          } catch (error) {
            console.error("Error loading feedback:", error);
            // Continue without feedback data
          }
        }
        
        // Guardar en caché solo si el montaje está activo
        if (isMounted.current) {
          callCache.set(id, {
            data: callObject,
            timestamp: Date.now(),
            transcriptSegments: segments
          });
          
          setCall(callObject);
          setTranscriptSegments(segments);
          setIsLoading(false);
          setLoadError(null);
        }
        
      } catch (error) {
        console.error("Error loading data:", error);
        if (isMounted.current) {
          setLoadError(error instanceof Error ? error.message : "Unknown error");
          setIsLoading(false);
        }
      }
    };

    loadCallData();
    
    return () => {
      isMounted.current = false;
    };
  }, [id]);

  // Improved helper function to parse timestamped text format
  function parseTimestampedTranscription(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim());
    const segments: any[] = [];
    
    console.log(`Parsing ${lines.length} lines from transcription`);
    
    lines.forEach((line, index) => {
      // Match format [mm:ss] Speaker: text or [m:ss] Speaker: text
      const timestampMatch = line.match(/^\[(\d+):(\d+)\]\s*(.+?):\s*(.+)$/);
      if (timestampMatch) {
        const [, minutes, seconds, speaker, text] = timestampMatch;
        
        // Determine speaker type more accurately
        let speakerType = 'agent';
        const speakerLower = speaker.toLowerCase();
        
        if (speakerLower.includes('cliente') || speakerLower.includes('client')) {
          speakerType = 'client';
        } else if (speakerLower.includes('asesor') || speakerLower.includes('agente') || speakerLower.includes('agent')) {
          speakerType = 'agent';
        }
        
        const startTime = parseInt(minutes) * 60 + parseInt(seconds);
        
        segments.push({
          text: text.trim(),
          speaker: speakerType,
          start: startTime,
          end: startTime + 5 // Estimate 5 seconds per segment
        });
      }
      // Handle silence periods
      else if (line.includes('Silencio:')) {
        const silenceMatch = line.match(/^\[(\d+):(\d+)\]\s*Silencio:\s*(\d+)/);
        if (silenceMatch) {
          const [, minutes, seconds, duration] = silenceMatch;
          const startTime = parseInt(minutes) * 60 + parseInt(seconds);
          
          segments.push({
            text: `Silencio: ${duration} segundos`,
            speaker: 'silence',
            start: startTime,
            end: startTime + parseInt(duration)
          });
        }
      }
      // Fallback for any other content lines
      else if (line.trim() && !line.includes('No hay transcripción disponible')) {
        // Try to extract speaker from line content
        let speakerType = 'agent';
        if (line.toLowerCase().includes('cliente:')) {
          speakerType = 'client';
        }
        
        segments.push({
          text: line.trim(),
          speaker: speakerType,
          start: index * 5,
          end: (index + 1) * 5
        });
      }
    });
    
    console.log("Parsed", segments.length, "segments from timestamped transcription");
    return segments;
  }

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
