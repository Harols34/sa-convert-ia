
import React, { useState, useEffect } from "react";
import { Call } from "@/lib/types";
import FeedbackLoading from "./feedback/FeedbackLoading";
import FeedbackContent from "./feedback/FeedbackContent";
import { useFeedbackAnalysis } from "@/hooks/useFeedbackAnalysis";
import { toast } from "sonner";

interface FeedbackTabProps {
  call: Call;
}

export default function FeedbackTab({ call }: FeedbackTabProps) {
  const feedback = call.feedback;
  const [localFeedback, setLocalFeedback] = useState(feedback);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  
  console.log("FeedbackTab render:", { 
    callId: call.id, 
    hasFeedback: !!feedback, 
    hasLocalFeedback: !!localFeedback,
    showLoadingScreen 
  });

  // Use our hook to manage feedback analysis
  const feedbackAnalysisManager = useFeedbackAnalysis({
    call,
    feedback: localFeedback,
    setLocalFeedback
  });

  const {
    behaviors,
    isLoadingBehaviors,
    isGeneratingFeedback,
    triggerAnalysisFunction,
    analysisError,
    activeTab, 
    setActiveTab,
    feedbackAlreadyExists,
  } = feedbackAnalysisManager;

  // Update local feedback state when call feedback changes
  useEffect(() => {
    console.log("Feedback changed:", feedback);
    if (feedback && feedback.behaviors_analysis && feedback.behaviors_analysis.length > 0) {
      setLocalFeedback(feedback);
      setShowLoadingScreen(false);
    } else {
      // Check if this is a "pending" feedback (default created)
      const isPendingFeedback = feedback && 
        Array.isArray(feedback.positive) && 
        feedback.positive.length === 1 && 
        feedback.positive[0] === "Pendiente por generar";
      
      if (isPendingFeedback) {
        console.log("Detected pending feedback, showing loading screen");
        setShowLoadingScreen(true);
        setLocalFeedback(undefined);
      } else if (feedback) {
        setLocalFeedback(feedback);
        setShowLoadingScreen(false);
      }
    }
  }, [feedback]);

  // Handle the feedback exists logic
  useEffect(() => {
    const hasValidFeedback = localFeedback && 
      localFeedback.behaviors_analysis && 
      localFeedback.behaviors_analysis.length > 0;
    
    const hasValidCallFeedback = feedback && 
      feedback.behaviors_analysis && 
      feedback.behaviors_analysis.length > 0;

    if (hasValidFeedback || hasValidCallFeedback || feedbackAlreadyExists) {
      console.log("Valid feedback exists, hiding loading screen");
      setShowLoadingScreen(false);
    } else {
      console.log("No valid feedback, showing loading screen");
      setShowLoadingScreen(true);
    }
  }, [localFeedback, feedback, feedbackAlreadyExists]);

  // Handle manual generation of feedback with optional behavior selection
  const handleManualGeneration = async (selectedBehaviorIds?: string[]) => {
    // Check if we already have real feedback (not pending)
    const hasRealFeedback = (localFeedback || feedback) && 
      (localFeedback?.behaviors_analysis?.length > 0 || feedback?.behaviors_analysis?.length > 0);
    
    if (hasRealFeedback || feedbackAlreadyExists) {
      toast.info("El feedback de esta llamada ya existe y es permanente");
      return;
    }
    
    try {
      console.log("Starting manual generation with behaviors:", selectedBehaviorIds);
      setShowLoadingScreen(true);
      await triggerAnalysisFunction(selectedBehaviorIds);
    } catch (error) {
      console.error("Error in manual generation:", error);
      setShowLoadingScreen(false);
    }
  };

  // Determine if we should show loading screen
  const shouldShowLoading = showLoadingScreen && 
    !feedbackAlreadyExists && 
    (!localFeedback || !localFeedback.behaviors_analysis || localFeedback.behaviors_analysis.length === 0) &&
    (!feedback || !feedback.behaviors_analysis || feedback.behaviors_analysis.length === 0);

  console.log("Should show loading:", shouldShowLoading);

  // Show proper loading screen when appropriate
  if (shouldShowLoading) {
    return (
      <FeedbackLoading 
        isLoading={isGeneratingFeedback}
        onGenerateClick={handleManualGeneration}
        error={analysisError}
        feedbackExists={feedbackAlreadyExists}
        autoGenerating={false}
      />
    );
  }

  // Determine behaviors to display
  const displayBehaviors = behaviors.length > 0 
    ? behaviors 
    : (localFeedback?.behaviors_analysis || []);

  // Show feedback content when available
  return (
    <FeedbackContent
      call={call}
      localFeedback={localFeedback}
      behaviorsToDisplay={displayBehaviors}
      isLoadingBehaviors={isLoadingBehaviors}
      analysisError={analysisError}
      onRefreshAnalysis={null} // Never allow refresh for existing feedback
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );
}
