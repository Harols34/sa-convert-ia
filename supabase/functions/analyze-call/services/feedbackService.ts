
import { corsHeaders } from "../utils/cors.ts";
import { mapScoreToText } from "../utils/scoring.ts";

// Function to check if feedback already exists
export async function handleExistingFeedback(supabaseAdmin: any, callId: string) {
  const { data: existingFeedback, error: feedbackError } = await supabaseAdmin
    .from('feedback')
    .select('*')
    .eq('call_id', callId)
    .maybeSingle();
    
  return { existingFeedback, feedbackError };
}

// Function to create or update feedback
export async function createOrUpdateFeedback(
  supabaseAdmin: any,
  existingFeedback: any,
  callId: string,
  behaviorsCount: number,
  behaviorsAnalysis: any[],
  score: number,
  positives: string[],
  opportunities: string[]
) {
  // If feedback exists but without behaviors_analysis, update it
  if (existingFeedback) {
    console.log("Updating existing feedback with behaviors analysis for call:", callId);
    
    const { data: updatedFeedback, error: updateError } = await supabaseAdmin
      .from('feedback')
      .update({
        behaviors_analysis: behaviorsAnalysis,
        score: score,
        positive: positives,
        opportunities: opportunities
      })
      .eq('id', existingFeedback.id)
      .select()
      .single();
      
    if (updateError) {
      console.error("Error updating feedback:", updateError);
      throw new Error("Error al actualizar feedback");
    }
    
    return {
      success: true,
      message: "Feedback actualizado con análisis de comportamientos",
      feedback: updatedFeedback,
      behaviors_analysis: behaviorsAnalysis,
      score: score,
      scoreText: mapScoreToText(score)
    };
  } else {
    // Create new feedback
    console.log("Creating new feedback with behaviors analysis for call:", callId);
    
    const { data: feedbackData, error: saveFeedbackError } = await supabaseAdmin
      .from('feedback')
      .insert({
        call_id: callId,
        score: score,
        positive: positives,
        negative: [],
        opportunities: opportunities,
        behaviors_analysis: behaviorsAnalysis
      })
      .select()
      .single();

    if (saveFeedbackError) {
      console.error("Error saving feedback:", saveFeedbackError);
      throw new Error("Error al guardar feedback");
    }

    return {
      success: true,
      message: `Se analizaron ${behaviorsCount} comportamientos`,
      score: score,
      scoreText: mapScoreToText(score),
      behaviors_analysis: behaviorsAnalysis,
      feedback: feedbackData
    };
  }
}
