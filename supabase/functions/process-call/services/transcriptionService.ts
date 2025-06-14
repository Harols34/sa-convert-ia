
import OpenAI from "https://esm.sh/openai@4.28.0";

export async function transcribeAudio(audioUrl: string): Promise<{
  text: string;
  segments: any[];
  hasValidContent: boolean;
}> {
  const apiKey = Deno.env.get('API_DE_OPENAI');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    console.log('Downloading audio from URL:', audioUrl);
    
    // Download audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([audioBuffer]);
    
    // Create a File object from the blob
    const file = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });
    
    console.log('Starting transcription with OpenAI Whisper...');
    
    // Transcribe using OpenAI Whisper with speaker diarization
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'es' // Force Spanish for better accuracy
    });

    console.log('Transcription completed successfully');
    
    if (!transcription.text || transcription.text.trim().length === 0) {
      return {
        text: "No hay transcripción disponible",
        segments: [],
        hasValidContent: false
      };
    }

    // Check for voicemail or invalid content indicators
    const transcriptionText = transcription.text.toLowerCase();
    const voicemailIndicators = [
      'correo de voz',
      'voicemail',
      'buzón de voz',
      'no puede atender',
      'deje su mensaje',
      'después del tono',
      'gracias por llamar',
      'currently unavailable',
      'leave a message',
      'after the tone'
    ];

    const hasVoicemailContent = voicemailIndicators.some(indicator => 
      transcriptionText.includes(indicator)
    );

    // Check if transcription is too short or contains mostly silence
    const wordCount = transcription.text.trim().split(/\s+/).length;
    const isContentTooShort = wordCount < 10;

    if (hasVoicemailContent || isContentTooShort) {
      return {
        text: "No hay transcripción disponible - contenido no válido para análisis",
        segments: [],
        hasValidContent: false
      };
    }

    // Process segments and improve speaker detection
    let processedSegments = [];
    
    if (transcription.segments && transcription.segments.length > 0) {
      // Enhanced speaker diarization logic
      processedSegments = transcription.segments.map((segment, index) => {
        const segmentText = segment.text?.trim() || "";
        
        // Detect silence segments
        if (segmentText === "" || segmentText.length < 3) {
          return {
            ...segment,
            speaker: "silence",
            text: "Silencio detectado"
          };
        }

        // Basic speaker identification based on content patterns
        let speaker = "unknown";
        
        // Agent indicators (Spanish)
        const agentPatterns = [
          /\b(buenos días|buenas tardes|buenas noches)\b/i,
          /\b(gracias por llamar|le habla|soy)\b/i,
          /\b(empresa|compañía|servicio|producto)\b/i,
          /\b(¿en qué puedo ayudarle|cómo está usted)\b/i,
          /\b(permíteme|déjeme|voy a revisar)\b/i
        ];

        // Client indicators (Spanish)  
        const clientPatterns = [
          /\b(hola|buenos días|buenas tardes)\b/i,
          /\b(necesito|quiero|me interesa)\b/i,
          /\b(tengo una consulta|una pregunta)\b/i,
          /\b(claro|perfecto|entiendo)\b/i
        ];

        // Check patterns to identify speaker
        const hasAgentPatterns = agentPatterns.some(pattern => pattern.test(segmentText));
        const hasClientPatterns = clientPatterns.some(pattern => pattern.test(segmentText));

        if (hasAgentPatterns && !hasClientPatterns) {
          speaker = "agent";
        } else if (hasClientPatterns && !hasAgentPatterns) {
          speaker = "client";
        } else {
          // Use alternating pattern as fallback, starting with agent
          speaker = index % 2 === 0 ? "agent" : "client";
        }

        return {
          ...segment,
          speaker: speaker,
          text: segmentText
        };
      });

      // Post-process to improve speaker consistency
      processedSegments = improveSpeakerConsistency(processedSegments);
    }

    return {
      text: transcription.text,
      segments: processedSegments,
      hasValidContent: true
    };
    
  } catch (error) {
    console.error('Error in transcription:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

// Helper function to improve speaker consistency
function improveSpeakerConsistency(segments: any[]): any[] {
  if (segments.length === 0) return segments;

  // First pass: fix obvious inconsistencies
  for (let i = 1; i < segments.length - 1; i++) {
    const prev = segments[i - 1];
    const current = segments[i];
    const next = segments[i + 1];

    // If a segment is surrounded by the same speaker, it's likely the same speaker
    if (prev.speaker === next.speaker && 
        current.speaker !== prev.speaker && 
        current.speaker !== "silence" &&
        current.text.length < 50) { // Only for short segments
      current.speaker = prev.speaker;
    }
  }

  // Second pass: detect silence periods
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const duration = (segment.end || 0) - (segment.start || 0);
    
    // Mark long pauses as silence
    if (duration > 3 && segment.text.trim().length < 10) {
      segment.speaker = "silence";
      segment.text = `Silencio detectado (${Math.round(duration)} segundos)`;
    }
  }

  return segments;
}
