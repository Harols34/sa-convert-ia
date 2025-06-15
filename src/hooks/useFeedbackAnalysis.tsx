
import { useState, useEffect, useCallback } from "react";
import { Call, BehaviorAnalysis, Feedback } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseFeedbackAnalysisProps {
  call: Call;
  feedback?: Feedback;
  setLocalFeedback?: React.Dispatch<React.SetStateAction<Feedback | undefined>>;
}

export const useFeedbackAnalysis = ({
  call,
  feedback,
  setLocalFeedback
}: UseFeedbackAnalysisProps) => {
  const [behaviors, setBehaviors] = useState<BehaviorAnalysis[]>([]);
  const [isLoadingBehaviors, setIsLoadingBehaviors] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [behaviorAnalysisExists, setBehaviorAnalysisExists] = useState(false);
  const [hasActiveBehaviors, setHasActiveBehaviors] = useState(false);
  
  // Función para validar y convertir behaviors_analysis
  const validateBehaviorsAnalysis = useCallback((data: any): BehaviorAnalysis[] => {
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
  }, []);
  
  // Check if there are active behaviors on mount
  useEffect(() => {
    const checkActiveBehaviors = async () => {
      try {
        let query = supabase
          .from('behaviors')
          .select('id')
          .eq('is_active', true);

        // If call has account_id, filter behaviors by account or global
        if (call.account_id) {
          query = query.or(`account_id.eq.${call.account_id},account_id.is.null`);
        }

        const { data, error } = await query.limit(1);
        
        if (error) {
          console.error("Error checking active behaviors:", error);
          throw error;
        }
        
        const hasBehaviors = data && data.length > 0;
        setHasActiveBehaviors(hasBehaviors);
        console.log("Active behaviors check result:", hasBehaviors);
        
        if (!hasBehaviors) {
          setAnalysisError("No hay comportamientos activos para analizar. Agregue al menos un comportamiento activo.");
        }
      } catch (error) {
        console.error("Error checking active behaviors:", error);
        setHasActiveBehaviors(false);
        setAnalysisError("Error al verificar comportamientos activos.");
      }
    };
    
    checkActiveBehaviors();
  }, [call.account_id]);
  
  // Load existing feedback analysis
  const loadBehaviorsAnalysis = useCallback(async () => {
    if (!call.id) return false;
    
    setIsLoadingBehaviors(true);
    setAnalysisError(null);
    
    try {
      console.log("Loading existing behaviors analysis for call:", call.id);
      
      // Check if feedback already exists in the provided feedback prop
      if (feedback && feedback.behaviors_analysis && Array.isArray(feedback.behaviors_analysis) && feedback.behaviors_analysis.length > 0) {
        console.log("Using existing behaviors_analysis from provided feedback");
        const validatedBehaviors = validateBehaviorsAnalysis(feedback.behaviors_analysis);
        setBehaviors(validatedBehaviors);
        setBehaviorAnalysisExists(true);
        return true;
      }
      
      // Check if feedback exists in database
      const { data: existingFeedback, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('call_id', call.id)
        .maybeSingle();
        
      if (feedbackError && feedbackError.code !== 'PGRST116') {
        console.error("Error checking existing feedback:", feedbackError);
        throw feedbackError;
      }
      
      if (existingFeedback && existingFeedback.behaviors_analysis && Array.isArray(existingFeedback.behaviors_analysis) && existingFeedback.behaviors_analysis.length > 0) {
        console.log("Found behaviors_analysis in database");
        const validatedBehaviors = validateBehaviorsAnalysis(existingFeedback.behaviors_analysis);
        setBehaviors(validatedBehaviors);
        setBehaviorAnalysisExists(true);
        
        if (setLocalFeedback) {
          const typedFeedback: Feedback = {
            id: existingFeedback.id,
            call_id: existingFeedback.call_id,
            score: existingFeedback.score || 0,
            positive: existingFeedback.positive || [],
            negative: existingFeedback.negative || [],
            opportunities: existingFeedback.opportunities || [],
            behaviors_analysis: validatedBehaviors,
            created_at: existingFeedback.created_at,
            updated_at: existingFeedback.updated_at,
            sentiment: existingFeedback.sentiment,
            topics: existingFeedback.topics || [],
            entities: existingFeedback.entities || []
          };
          setLocalFeedback(typedFeedback);
        }
        
        return true;
      }
      
      console.log("No existing behaviors analysis found");
      setBehaviorAnalysisExists(false);
      return false;
    } catch (error) {
      console.error("Error loading behaviors analysis:", error);
      setAnalysisError(error instanceof Error ? error.message : "Error desconocido");
      return false;
    } finally {
      setIsLoadingBehaviors(false);
    }
  }, [call.id, feedback, setLocalFeedback, validateBehaviorsAnalysis]);
  
  // Initial check on component mount
  useEffect(() => {
    loadBehaviorsAnalysis();
  }, [loadBehaviorsAnalysis]);
  
  // Function to generate feedback for the call
  const triggerAnalysisFunction = useCallback(async () => {
    if (!call.id) {
      console.error("No call ID provided");
      return [];
    }
    
    if (!hasActiveBehaviors) {
      const errorMsg = "No hay comportamientos activos para analizar";
      console.error(errorMsg);
      toast.error(errorMsg);
      setAnalysisError("No hay comportamientos activos definidos en el sistema. Agregue al menos un comportamiento activo para poder realizar el análisis.");
      return [];
    }
    
    setIsGeneratingFeedback(true);
    setAnalysisError(null);
    
    try {
      console.log("Starting behavior analysis generation for call:", call.id);
      toast.loading("Analizando comportamientos...", { id: "generate-feedback" });
      
      const { data, error } = await supabase.functions.invoke("analyze-call", {
        body: { callId: call.id }
      });
      
      if (error) {
        console.error("Error invoking analyze-call function:", error);
        throw new Error(error.message || "Error al analizar la llamada");
      }
      
      console.log("Analysis function result:", data);
      
      if (data?.behaviors_analysis && Array.isArray(data.behaviors_analysis) && data.behaviors_analysis.length > 0) {
        console.log("Successfully received behaviors analysis");
        const validatedBehaviors = validateBehaviorsAnalysis(data.behaviors_analysis);
        setBehaviors(validatedBehaviors);
        setBehaviorAnalysisExists(true);
        
        // Update local feedback if setter is provided
        if (setLocalFeedback) {
          const typedFeedback: Feedback = {
            behaviors_analysis: validatedBehaviors,
            score: data.score || 0,
            positive: data.positive || [],
            negative: data.negative || [],
            opportunities: data.opportunities || [],
            call_id: call.id,
            id: data.feedback?.id || '',
            created_at: data.feedback?.created_at || new Date().toISOString(),
            updated_at: data.feedback?.updated_at || new Date().toISOString(),
            sentiment: data.feedback?.sentiment || null,
            topics: data.feedback?.topics || [],
            entities: data.feedback?.entities || []
          };
          
          setLocalFeedback(typedFeedback);
        }
        
        toast.success("Análisis de comportamientos generado correctamente", { id: "generate-feedback" });
        setActiveTab("behaviors");
        
        return validatedBehaviors;
      } else {
        console.error("No behaviors_analysis in response or empty array");
        throw new Error("No se generaron resultados de análisis de comportamientos");
      }
    } catch (error) {
      console.error("Error generating behavior analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setAnalysisError(errorMessage);
      toast.error("Error generando análisis de comportamientos", { 
        id: "generate-feedback", 
        description: errorMessage
      });
      return [];
    } finally {
      setIsGeneratingFeedback(false);
    }
  }, [call.id, setLocalFeedback, hasActiveBehaviors, validateBehaviorsAnalysis]);
  
  return {
    behaviors,
    isLoadingBehaviors,
    isGeneratingFeedback,
    triggerAnalysisFunction,
    loadBehaviorsAnalysis,
    analysisError,
    activeTab,
    setActiveTab,
    feedbackAlreadyExists: behaviorAnalysisExists,
    hasActiveBehaviors
  };
};
