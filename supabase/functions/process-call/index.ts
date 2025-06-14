
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { corsHeaders } from "./utils/cors.ts";
import { transcribeAudio } from "./services/transcriptionService.ts";
import { generateSummary } from "./services/summaryService.ts";
import { generateFeedback } from "./services/feedbackService.ts";
import { updateCallInDatabase } from "./services/databaseService.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { callId, audioUrl, summaryPrompt, feedbackPrompt, selectedBehaviorIds } = await req.json();
    
    console.log('Processing call request:', { 
      callId, 
      audioUrl: audioUrl ? 'provided' : 'missing', 
      summaryPrompt: summaryPrompt ? 'provided' : 'not provided', 
      feedbackPrompt: feedbackPrompt ? 'provided' : 'not provided',
      behaviorIds: selectedBehaviorIds ? selectedBehaviorIds.length : 0
    });
    
    if (!callId) {
      throw new Error('Missing required parameter: callId');
    }

    if (!audioUrl || audioUrl === 'undefined' || audioUrl.trim() === '') {
      throw new Error('Missing or invalid audioUrl parameter');
    }

    // Get call data to ensure we have the account_id
    const { data: callData, error: callFetchError } = await supabase
      .from('calls')
      .select('account_id, title')
      .eq('id', callId)
      .single();

    if (callFetchError) {
      console.error('Error fetching call data:', callFetchError);
      throw new Error('Could not fetch call data');
    }

    console.log(`Starting processing for call ${callId} (${callData.title}) in account: ${callData.account_id}`);

    // PASO 1: TRANSCRIPCIÓN COMPLETA - GARANTIZADA AL 100%
    console.log('=== STEP 1: STARTING COMPLETE TRANSCRIPTION ===');
    await updateCallInDatabase(supabase, callId, {
      status: 'transcribing',
      progress: 10
    });

    const transcription = await transcribeAudio(audioUrl);
    console.log('Transcription completed successfully');
    console.log('Transcription length:', transcription.length);
    console.log('Transcription preview (first 300 chars):', transcription.substring(0, 300) + '...');
    
    // Verificar si la transcripción es válida para análisis
    const isValidTranscription = transcription && 
      !transcription.includes('No hay transcripción disponible') &&
      transcription.trim().length > 50;

    // Actualizar con transcripción (válida o no válida)
    await updateCallInDatabase(supabase, callId, {
      transcription,
      status: isValidTranscription ? 'analyzing' : 'complete',
      progress: isValidTranscription ? 40 : 100
    });

    if (!isValidTranscription) {
      console.log('Invalid or insufficient transcription, marking call as complete with no analysis');
      
      // Store minimal feedback for non-analyzable content
      await supabase
        .from('feedback')
        .insert({
          call_id: callId,
          account_id: callData.account_id,
          score: 0,
          positive: [],
          negative: ['No hay contenido analizable en la grabación'],
          opportunities: ['Verificar calidad del audio y contenido de la llamada'],
          sentiment: 'neutral',
          entities: [],
          topics: [],
          behaviors_analysis: []
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          callId,
          accountId: callData.account_id,
          message: 'Call processed - no analyzable content found',
          transcriptionAvailable: false,
          transcriptionLength: transcription.length
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    console.log('=== STEP 2: STARTING SUMMARY ANALYSIS ===');
    // PASO 2: ANÁLISIS DE RESUMEN (usando transcripción completa garantizada)
    const summary = await generateSummary(transcription, summaryPrompt || undefined);
    console.log('Summary generated successfully, length:', summary.length);
    
    // Actualizar con resumen
    await updateCallInDatabase(supabase, callId, {
      summary,
      progress: 70
    });

    console.log('=== STEP 3: STARTING FEEDBACK ANALYSIS ===');
    // PASO 3: ANÁLISIS DE FEEDBACK (usando transcripción completa y resumen)
    const feedbackResult = await generateFeedback(
      transcription, // Transcripción completa garantizada
      summary, 
      feedbackPrompt || undefined,
      selectedBehaviorIds || []
    );
    console.log('Feedback generated successfully with score:', feedbackResult.score);

    // PASO 4: FINALIZACIÓN
    console.log('=== STEP 4: FINALIZING CALL ===');
    await updateCallInDatabase(supabase, callId, {
      status: 'complete',
      progress: 100,
      sentiment: feedbackResult.sentiment,
      entities: feedbackResult.entities,
      topics: feedbackResult.topics
    });

    // Guardar feedback completo
    const { error: feedbackError } = await supabase
      .from('feedback')
      .insert({
        call_id: callId,
        account_id: callData.account_id,
        score: feedbackResult.score,
        positive: feedbackResult.positive,
        negative: feedbackResult.negative,
        opportunities: feedbackResult.opportunities,
        sentiment: feedbackResult.sentiment,
        entities: feedbackResult.entities,
        topics: feedbackResult.topics,
        behaviors_analysis: feedbackResult.behaviors_analysis || []
      });

    if (feedbackError) {
      console.error('Error inserting feedback:', feedbackError);
    }

    console.log(`✅ Successfully processed call ${callId} for account ${callData.account_id}`);
    console.log(`Final stats: transcription=${transcription.length} chars, summary=${summary.length} chars, score=${feedbackResult.score}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId,
        accountId: callData.account_id,
        message: 'Call processed successfully with complete transcription and analysis',
        transcriptionLength: transcription.length,
        summaryLength: summary.length,
        feedbackScore: feedbackResult.score,
        usedCustomPrompts: {
          summary: !!summaryPrompt,
          feedback: !!feedbackPrompt
        },
        analyzedBehaviors: selectedBehaviorIds?.length || 0,
        transcriptionAvailable: true
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error processing call:', error);
    
    // Try to update call status to error if we have callId
    const requestBody = await req.json().catch(() => ({}));
    if (requestBody.callId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await updateCallInDatabase(supabase, requestBody.callId, {
          status: 'error',
          progress: 0
        });
        console.log(`Updated call ${requestBody.callId} status to error`);
      } catch (updateError) {
        console.error('Error updating call status to error:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
