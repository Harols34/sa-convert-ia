
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
  
  // Update local feedback state when call feedback changes
  useEffect(() => {
    if (feedback) {
      setLocalFeedback(feedback);
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
    hasActiveBehaviors
  } = feedbackAnalysisManager;

  // Determine if we should show loading screen
  useEffect(() => {
    // Show loading screen only when:
    // 1. No behaviors analysis exists AND
    // 2. We have feedback (so we know processing is complete) BUT no behaviors analysis OR
    // 3. We're currently generating feedback
    const hasBehaviorsAnalysis = behaviors.length > 0 || (localFeedback?.behaviors_analysis && localFeedback.behaviors_analysis.length > 0);
    
    if (hasBehaviorsAnalysis || isGeneratingFeedback) {
      setShowLoadingScreen(false);
    } else if (localFeedback && !hasBehaviorsAnalysis) {
      // We have feedback but no behaviors analysis - show the generate button
      setShowLoadingScreen(true);
    } else if (!localFeedback) {
      // No feedback at all - show loading screen
      setShowLoadingScreen(true);
    }
  }, [behaviors, localFeedback, isGeneratingFeedback]);

  // Handle manual generation of behavior analysis
  const handleManualGeneration = async () => {
    if (!hasActiveBehaviors) {
      toast.error("No hay comportamientos activos para analizar");
      return;
    }
    
    try {
      console.log("Manual generation triggered");
      setShowLoadingScreen(true);
      await triggerAnalysisFunction();
    } catch (error) {
      console.error("Error in manual generation:", error);
    } finally {
      setShowLoadingScreen(false);
    }
  };

  // Show loading screen when appropriate
  if (showLoadingScreen && behaviors.length === 0) {
    return (
      <FeedbackLoading 
        isLoading={isGeneratingFeedback}
        onGenerateClick={handleManualGeneration}
        error={analysisError}
        feedbackExists={feedbackAlreadyExists}
        autoGenerating={isGeneratingFeedback}
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
      onRefreshAnalysis={feedbackAlreadyExists ? null : handleManualGeneration}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );
}
