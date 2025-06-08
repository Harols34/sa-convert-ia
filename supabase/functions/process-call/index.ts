
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
    const { callId, audioUrl, summaryPrompt, feedbackPrompt } = await req.json();
    
    console.log('Request payload:', { callId, audioUrl: audioUrl ? 'provided' : 'missing', summaryPrompt: !!summaryPrompt, feedbackPrompt: !!feedbackPrompt });
    
    if (!callId) {
      throw new Error('Missing required parameter: callId');
    }

    if (!audioUrl || audioUrl === 'undefined' || audioUrl.trim() === '') {
      throw new Error('Missing or invalid audioUrl parameter');
    }

    console.log(`Processing call ${callId} with audio URL: ${audioUrl} and custom prompts:`, {
      hasSummaryPrompt: !!summaryPrompt,
      hasFeedbackPrompt: !!feedbackPrompt
    });

    // Update status to transcribing
    await updateCallInDatabase(supabase, callId, {
      status: 'transcribing',
      progress: 10
    });

    // Step 1: Transcribe audio
    console.log('Starting transcription with audio URL:', audioUrl);
    const transcription = await transcribeAudio(audioUrl);
    
    if (!transcription) {
      throw new Error('Failed to transcribe audio - no transcription returned');
    }

    // Update with transcription
    await updateCallInDatabase(supabase, callId, {
      transcription,
      status: 'analyzing',
      progress: 40
    });

    // Step 2: Generate summary with custom prompt if provided
    const summary = await generateSummary(transcription, summaryPrompt);
    
    // Update with summary
    await updateCallInDatabase(supabase, callId, {
      summary,
      progress: 70
    });

    // Step 3: Generate feedback with custom prompt if provided
    const feedbackResult = await generateFeedback(transcription, summary, feedbackPrompt);
    
    // Step 4: Update call with all results - use 'complete' instead of 'completed'
    await updateCallInDatabase(supabase, callId, {
      status: 'complete',
      progress: 100,
      sentiment: feedbackResult.sentiment,
      entities: feedbackResult.entities,
      topics: feedbackResult.topics
    });

    // Step 5: Store feedback in feedback table
    const { error: feedbackError } = await supabase
      .from('feedback')
      .insert({
        call_id: callId,
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

    console.log(`Successfully processed call ${callId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId,
        message: 'Call processed successfully',
        usedCustomPrompts: {
          summary: !!summaryPrompt,
          feedback: !!feedbackPrompt
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
