
import React, { useState, useEffect } from "react";
import { Call } from "@/lib/types";
import FeedbackLoading from "./feedback/FeedbackLoading";
import FeedbackContent from "./feedback/FeedbackContent";
import { useFeedbackAnalysis } from "@/hooks/useFeedbackAnalysis";
import { toast } from "sonner";
import FeedbackErrorDisplay from "./feedback/FeedbackErrorDisplay";

interface FeedbackTabProps {
  call: Call;
}

export default function FeedbackTab({ call }: FeedbackTabProps) {
  const feedback = call.feedback;
  const [localFeedback, setLocalFeedback] = useState(feedback);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  
  // Update local feedback state when call feedback changes
  useEffect(() => {
    if (feedback) {
      setLocalFeedback(feedback);
      setShowLoadingScreen(false);
    }
  }, [feedback]);

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

  useEffect(() => {
    // Check if feedback exists and show content immediately if it does
    if (localFeedback || feedbackAlreadyExists) {
      setShowLoadingScreen(false);
    }
  }, [localFeedback, feedbackAlreadyExists]);

  // Handle manual generation of feedback with optional behavior selection
  const handleManualGeneration = async (selectedBehaviorIds?: string[]) => {
    if (feedbackAlreadyExists || localFeedback) {
      toast.info("El feedback de esta llamada ya existe y es permanente");
      return;
    }
    
    try {
      setShowLoadingScreen(true);
      await triggerAnalysisFunction(selectedBehaviorIds);
    } catch (error) {
      console.error("Error in manual generation:", error);
    }
  };

  // Show proper loading screen when appropriate
  if (showLoadingScreen && (!localFeedback && !feedbackAlreadyExists)) {
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
