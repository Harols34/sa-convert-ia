
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Gets call data from the database
 */
export async function getCallData(callId: string) {
  const { data: call, error: callError } = await supabase
    .from('calls')
    .select('*')
    .eq('id', callId)
    .single();
    
  if (callError) {
    throw new Error(`Error al obtener datos de la llamada: ${callError.message}`);
  }
  
  return call;
}

/**
 * Gets existing feedback for a call
 */
export async function getExistingFeedback(callId: string) {
  const { data: existingFeedback } = await supabase
    .from('feedback')
    .select('*')
    .eq('call_id', callId)
    .maybeSingle();
    
  return existingFeedback;
}

/**
 * Updates call with transcription and mark as processing
 */
export async function updateCallProcessing(callId: string, progress: number) {
  return supabase
    .from('calls')
    .update({ 
      status: 'analyzing',
      progress
    })
    .eq('id', callId);
}

/**
 * Updates call with error status
 */
export async function updateCallError(callId: string) {
  return supabase
    .from('calls')
    .update({ 
      status: 'error',
      progress: 30 
    })
    .eq('id', callId);
}

/**
 * Updates call with transcription data
 */
export async function updateCallWithTranscription(callId: string, transcription: any[], progress: number) {
  return supabase
    .from('calls')
    .update({ 
      transcription: JSON.stringify(transcription),
      progress
    })
    .eq('id', callId);
}

/**
 * Updates call with summary
 */
export async function updateCallWithSummary(callId: string, summary: string, progress: number) {
  return supabase
    .from('calls')
    .update({ 
      summary,
      progress
    })
    .eq('id', callId);
}

/**
 * Saves the complete call with all data
 */
export async function saveCompleteCall(
  callId: string, 
  transcription: any[], 
  summary: string, 
  duration: number,
  result: string,
  product: string,
  reason: string
) {
  return supabase
    .from('calls')
    .update({
      transcription: JSON.stringify(transcription),
      summary,
      duration,
      status: 'complete',
      progress: 100,
      result,
      product,
      reason,
      status_summary: reason
    })
    .eq('id', callId);
}

/**
 * Updates call with result data
 */
export async function updateCallWithResult(
  callId: string,
  result: string,
  product: string,
  reason: string
) {
  return supabase
    .from('calls')
    .update({
      result,
      product,
      reason,
      status_summary: reason
    })
    .eq('id', callId);
}

/**
 * Saves feedback to the database
 */
export async function saveFeedback(feedbackData: any) {
  return supabase
    .from('feedback')
    .insert(feedbackData)
    .select()
    .single();
}
