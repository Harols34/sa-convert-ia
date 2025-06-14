
import { useState, useEffect, useCallback } from "react";
import { Call, BehaviorAnalysis, Feedback } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  validateBehaviorsAnalysis 
} from "@/components/calls/detail/feedback/feedbackUtils";

interface UseFeedbackAnalysisProps {
  call: Call;
  feedback?: Feedback;
  onFeedbackUpdate?: () => void;
  setLocalFeedback?: React.Dispatch<React.SetStateAction<Feedback | undefined>>;
}

export const useFeedbackAnalysis = ({
  call,
  feedback,
  onFeedbackUpdate,
  setLocalFeedback
}: UseFeedbackAnalysisProps) => {
  const [behaviors, setBehaviors] = useState<BehaviorAnalysis[]>([]);
  const [isLoadingBehaviors, setIsLoadingBehaviors] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [feedbackAlreadyExists, setFeedbackAlreadyExists] = useState(false);
  
  // Function to load behaviors analysis - only checks if feedback exists
  const loadBehaviorsAnalysis = useCallback(async () => {
    if (!call.id) return false;
    
    setIsLoadingBehaviors(true);
    setAnalysisError(null);
    
    try {
      console.log("Checking for existing feedback analysis for call:", call.id);
      
      // Check if feedback already exists in the provided feedback prop
      if (feedback && feedback.behaviors_analysis && feedback.behaviors_analysis.length > 0) {
        console.log("Using existing behaviors_analysis from provided feedback:", feedback.behaviors_analysis);
        const validatedAnalysis = validateBehaviorsAnalysis(feedback.behaviors_analysis);
        setBehaviors(validatedAnalysis);
        setFeedbackAlreadyExists(true);
        setIsLoadingBehaviors(false);
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
      }
      
      if (existingFeedback && existingFeedback.behaviors_analysis) {
        console.log("Found behaviors_analysis in database:", existingFeedback.behaviors_analysis);
        
        // Ensure behaviors_analysis is an array and properly validated
        const validatedAnalysis = validateBehaviorsAnalysis(existingFeedback.behaviors_analysis);
        setBehaviors(validatedAnalysis);
        setFeedbackAlreadyExists(true);
        
        // Update local feedback if callback provided
        if (setLocalFeedback) {
          setLocalFeedback(prevFeedback => {
            if (!prevFeedback) {
              // Create a properly typed Feedback object with validated behaviors_analysis
              const typedFeedback: Feedback = {
                id: existingFeedback.id,
                call_id: existingFeedback.call_id,
                score: existingFeedback.score || 0,
                positive: existingFeedback.positive || [],
                negative: existingFeedback.negative || [],
                opportunities: existingFeedback.opportunities || [],
                behaviors_analysis: validatedAnalysis, // Use the validated array here
                created_at: existingFeedback.created_at,
                updated_at: existingFeedback.updated_at,
                sentiment: existingFeedback.sentiment,
                topics: existingFeedback.topics || [],
                entities: existingFeedback.entities || []
              };
              return typedFeedback;
            }
            
            return {
              ...prevFeedback,
              behaviors_analysis: validatedAnalysis
            };
          });
        }
        
        setIsLoadingBehaviors(false);
        return true;
      }
      
      // If no feedback exists, just return false (don't auto-generate)
      setIsLoadingBehaviors(false);
      return false;
    } catch (error) {
      console.error("Error loading behaviors analysis:", error);
      setAnalysisError(error instanceof Error ? error.message : "Error desconocido");
      return false;
    } finally {
      setIsLoadingBehaviors(false);
    }
  }, [call.id, feedback, setLocalFeedback]);
  
  // Initial check on component mount
  useEffect(() => {
    loadBehaviorsAnalysis();
  }, [loadBehaviorsAnalysis]);
  
  // Function to generate feedback for the call - only runs when manually triggered
  const generateFeedback = useCallback(async () => {
    if (!call.id) return [];
    
    // First check if feedback already exists
    const { data: existingFeedback, error: feedbackCheckError } = await supabase
      .from('feedback')
      .select('behaviors_analysis')
      .eq('call_id', call.id)
      .maybeSingle();
      
    if (feedbackCheckError && feedbackCheckError.code !== 'PGRST116') {
      console.error("Error checking existing feedback:", feedbackCheckError);
    }
    
    // If feedback already exists, use it and don't generate new feedback
    if (existingFeedback && existingFeedback.behaviors_analysis && 
        Array.isArray(existingFeedback.behaviors_analysis) && 
        existingFeedback.behaviors_analysis.length > 0) {
      console.log("Feedback already exists, using existing data");
      
      setFeedbackAlreadyExists(true);
      
      const validatedAnalysis = validateBehaviorsAnalysis(existingFeedback.behaviors_analysis);
      setBehaviors(validatedAnalysis);
      
      // Show info toast
      toast.info("El feedback de esta llamada ya existe y es permanente");
      
      // Load full feedback data to update the UI
      const { data: fullFeedback } = await supabase
        .from('feedback')
        .select('*')
        .eq('call_id', call.id)
        .maybeSingle();
        
      if (fullFeedback && setLocalFeedback) {
        // Process and validate the data before setting it
        const validatedBehaviors = validateBehaviorsAnalysis(fullFeedback.behaviors_analysis);
        
        // Create properly typed Feedback object 
        const typedFeedback: Feedback = {
          id: fullFeedback.id,
          call_id: fullFeedback.call_id,
          score: fullFeedback.score || 0,
          positive: fullFeedback.positive || [],
          negative: fullFeedback.negative || [],
          opportunities: fullFeedback.opportunities || [],
          behaviors_analysis: validatedBehaviors, // Use validated behaviors
          created_at: fullFeedback.created_at,
          updated_at: fullFeedback.updated_at,
          sentiment: fullFeedback.sentiment,
          topics: fullFeedback.topics || [],
          entities: fullFeedback.entities || []
        };
        
        setLocalFeedback(typedFeedback);
      }
      
      return validatedAnalysis;
    }
    
    // Only proceed with generation if we don't already have feedback
    setIsGeneratingFeedback(true);
    setAnalysisError(null);
    
    try {
      toast.loading("Analizando llamada...", { id: "generate-feedback" });
      
      console.log("Triggering manual behavior analysis for call:", call.id);
      const { data, error } = await supabase.functions.invoke("analyze-call", {
        body: { callId: call.id }
      });
      
      if (error) {
        console.error("Error invoking analyze-call function:", error);
        throw new Error(error.message || "Error al analizar la llamada");
      }
      
      console.log("Analysis result:", data);
      
      if (data?.behaviors_analysis && Array.isArray(data.behaviors_analysis)) {
        const newBehaviors = validateBehaviorsAnalysis(data.behaviors_analysis);
        setBehaviors(newBehaviors);
        setFeedbackAlreadyExists(true);
        
        // Update local feedback state
        if (setLocalFeedback && data.feedback) {
          const typedFeedback: Feedback = {
            behaviors_analysis: newBehaviors,
            score: data.feedback.score || 0,
            positive: data.feedback.positive || [],
            negative: data.feedback.negative || [],
            opportunities: data.feedback.opportunities || [],
            call_id: call.id,
            id: data.feedback.id,
            created_at: data.feedback.created_at,
            updated_at: data.feedback.updated_at,
            sentiment: data.feedback.sentiment,
            topics: data.feedback.topics || [],
            entities: data.feedback.entities || []
          };
          
          setLocalFeedback(typedFeedback);
        }
        
        // Notify parent component about the update
        if (onFeedbackUpdate) {
          onFeedbackUpdate();
        }
        
        toast.success("Análisis generado", { id: "generate-feedback" });
        setActiveTab("behaviors");
        
        return newBehaviors;
      } else {
        throw new Error("No se generaron resultados de análisis");
      }
    } catch (error) {
      console.error("Error generating feedback:", error);
      setAnalysisError(error instanceof Error ? error.message : "Error desconocido");
      toast.error("Error generando análisis", { 
        id: "generate-feedback", 
        description: error instanceof Error ? error.message : "Error desconocido" 
      });
      return [];
    } finally {
      setIsGeneratingFeedback(false);
    }
  }, [call.id, onFeedbackUpdate, setLocalFeedback]);
  
  return {
    behaviors,
    isLoadingBehaviors,
    isGeneratingFeedback,
    triggerAnalysisFunction: generateFeedback,
    loadBehaviorsAnalysis,
    analysisError,
    activeTab,
    setActiveTab,
    feedbackAlreadyExists
  };
};
