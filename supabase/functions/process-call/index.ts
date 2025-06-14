
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
    const { callId, audioUrl, summaryPrompt, feedbackPrompt, selectedBehaviors } = await req.json();
    
    console.log('Request payload:', { 
      callId, 
      audioUrl: audioUrl ? 'provided' : 'missing', 
      summaryPrompt: summaryPrompt ? 'provided' : 'not provided', 
      feedbackPrompt: feedbackPrompt ? 'provided' : 'not provided',
      selectedBehaviors: selectedBehaviors ? `${selectedBehaviors.length} behaviors` : 'all behaviors'
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
      .select('account_id')
      .eq('id', callId)
      .single();

    if (callFetchError) {
      console.error('Error fetching call data:', callFetchError);
      throw new Error('Could not fetch call data');
    }

    console.log(`Processing call ${callId} with audio URL: ${audioUrl} for account: ${callData.account_id}`);
    console.log('Custom prompts provided:', {
      hasSummaryPrompt: !!summaryPrompt,
      hasFeedbackPrompt: !!feedbackPrompt,
      hasSelectedBehaviors: !!selectedBehaviors
    });

    // Update status to transcribing
    await updateCallInDatabase(supabase, callId, {
      status: 'transcribing',
      progress: 10
    });

    // Step 1: Transcribe audio with enhanced speaker detection
    console.log('Starting transcription with enhanced speaker detection...');
    const transcriptionResult = await transcribeAudio(audioUrl);
    
    if (!transcriptionResult.hasValidContent) {
      console.log('No valid content found in transcription');
      await updateCallInDatabase(supabase, callId, {
        transcription: transcriptionResult.text,
        summary: 'No hay contenido válido para analizar en esta grabación',
        status: 'complete',
        progress: 100
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          callId,
          accountId: callData.account_id,
          message: 'Call processed - no valid content found',
          hasValidContent: false
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    console.log('Transcription completed successfully, length:', transcriptionResult.text.length);

    // Store both raw text and structured segments
    const transcriptionToStore = JSON.stringify(transcriptionResult.segments);

    // Update with transcription
    await updateCallInDatabase(supabase, callId, {
      transcription: transcriptionToStore,
      status: 'analyzing',
      progress: 40
    });

    // Step 2: Generate summary based on the structured transcription
    console.log('Generating summary with structured transcription data');
    const summary = await generateSummary(transcriptionResult, summaryPrompt || undefined);
    
    // Update with summary
    await updateCallInDatabase(supabase, callId, {
      summary,
      progress: 70
    });

    // Step 3: Generate feedback with structured data
    console.log('Generating feedback with structured transcription data');
    const feedbackResult = await generateFeedback(
      transcriptionResult.text, 
      summary, 
      feedbackPrompt || undefined
    );
    
    // Step 4: Update call with all results
    await updateCallInDatabase(supabase, callId, {
      status: 'complete',
      progress: 100,
      sentiment: feedbackResult.sentiment,
      entities: feedbackResult.entities,
      topics: feedbackResult.topics
    });

    // Step 5: Store feedback in feedback table with account_id
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

    // Step 6: Trigger behavior analysis if behaviors are selected or available
    if (selectedBehaviors || (!selectedBehaviors)) {
      try {
        console.log('Triggering behavior analysis...');
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-call", {
          body: { 
            callId: callId,
            selectedBehaviors: selectedBehaviors // Pass selected behaviors to analysis function
          }
        });
        
        if (analysisError) {
          console.error('Error in behavior analysis:', analysisError);
        } else {
          console.log('Behavior analysis completed successfully');
        }
      } catch (analysisError) {
        console.error('Error triggering behavior analysis:', analysisError);
        // Don't fail the main process if behavior analysis fails
      }
    }

    console.log(`Successfully processed call ${callId} for account ${callData.account_id}`);
    console.log('Final transcription length:', transcriptionResult.text.length);
    console.log('Used custom prompts:', {
      summary: !!summaryPrompt,
      feedback: !!feedbackPrompt,
      selectedBehaviors: !!selectedBehaviors
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId,
        accountId: callData.account_id,
        message: 'Call processed successfully with enhanced transcription',
        transcriptionLength: transcriptionResult.text.length,
        hasValidContent: transcriptionResult.hasValidContent,
        segmentsCount: transcriptionResult.segments.length,
        usedCustomPrompts: {
          summary: !!summaryPrompt,
          feedback: !!feedbackPrompt,
          selectedBehaviors: !!selectedBehaviors
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error processing call:', error);
    
    // Try to update call status to error if we have callId
    const requestBody = await req.json().catch(() => ({}));
    if (requestBody.callId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await updateCallInDatabase(supabase, requestBody.callId, {
          status: 'error',
          progress: 0
        });
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
