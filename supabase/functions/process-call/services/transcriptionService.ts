
import OpenAI from "https://esm.sh/openai@4.28.0";

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const apiKey = Deno.env.get('API_DE_OPENAI');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    console.log('Downloading audio from URL:', audioUrl);
    
    // Download audio file with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(audioUrl, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    
    // Check file size (limit to 25MB for faster processing)
    if (audioBuffer.byteLength > 25 * 1024 * 1024) {
      console.warn('Audio file is large, this may take longer to process');
    }
    
    const audioBlob = new Blob([audioBuffer]);
    const file = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });
    
    console.log('Starting enhanced transcription with speaker diarization...');
    
    // Enhanced transcription with better speaker separation
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'es',
      prompt: 'Transcribe esta conversación telefónica entre un agente comercial y un cliente. Identifica claramente cuando habla cada persona.' // Improved prompt for better context
    });

    console.log('Transcription completed successfully');
    
    if (!transcription.text || transcription.text.trim() === '') {
      console.warn('Empty transcription received');
      return 'No hay transcripción disponible - el audio no contiene contenido analizable';
    }

    // Enhanced voicemail detection with more indicators
    const voicemailIndicators = [
      'correo de voz',
      'buzón de voz', 
      'mensaje de voz',
      'leave a message',
      'después del tono',
      'after the tone',
      'voicemail',
      'buzón',
      'deje su mensaje',
      'no está disponible',
      'not available',
      'mailbox',
      'beep',
      'please record'
    ];

    const transcriptionLower = transcription.text.toLowerCase();
    const isVoicemail = voicemailIndicators.some(indicator => 
      transcriptionLower.includes(indicator)
    );

    if (isVoicemail) {
      console.log('Voicemail detected in transcription');
      return 'No hay transcripción disponible - se detectó mensaje de correo de voz';
    }

    // Check if transcription is too short or meaningless
    if (transcription.text.trim().length < 20) {
      console.log('Transcription too short or meaningless');
      return 'No hay transcripción disponible - contenido de audio insuficiente para análisis';
    }

    // Enhanced speaker diarization processing
    let processedTranscription = transcription.text;
    
    if (transcription.segments && transcription.segments.length > 0) {
      console.log(`Processing ${transcription.segments.length} segments for enhanced speaker separation`);
      
      let formattedTranscription = '';
      let currentSpeaker = 'Agente';
      let speakerChangeThreshold = 1.5; // Reduced threshold for better detection
      let consecutiveSegmentsBySpeaker = 0;
      
      // Analyze speaking patterns for better speaker assignment
      const segmentAnalysis = transcription.segments.map((segment: any, index: number) => {
        const nextSegment = transcription.segments[index + 1];
        const pauseDuration = nextSegment ? nextSegment.start - segment.end : 0;
        
        return {
          ...segment,
          pauseAfter: pauseDuration,
          length: segment.end - segment.start,
          wordsPerSecond: segment.text ? segment.text.split(' ').length / (segment.end - segment.start) : 0
        };
      });

      segmentAnalysis.forEach((segment: any, index: number) => {
        if (segment.text && segment.text.trim()) {
          const text = segment.text.trim();
          
          // Enhanced speaker change detection
          let shouldChangeSpeaker = false;
          
          if (index > 0) {
            const prevSegment = segmentAnalysis[index - 1];
            
            // Multiple criteria for speaker change
            const significantPause = segment.pauseAfter > speakerChangeThreshold;
            const lengthDifference = Math.abs(segment.length - prevSegment.length) > 3;
            const speedDifference = Math.abs(segment.wordsPerSecond - prevSegment.wordsPerSecond) > 1;
            const timeGap = segment.start - prevSegment.end;
            
            // Context-based speaker detection
            const agentKeywords = ['hola', 'buenos días', 'buenas tardes', 'en qué puedo ayudarle', 'perfecto', 'exacto', 'correcto', 'empresa', 'servicio', 'oferta'];
            const clientKeywords = ['sí', 'no', 'quiero', 'necesito', 'me interesa', 'cuánto', 'precio', 'gracias'];
            
            const hasAgentKeywords = agentKeywords.some(keyword => text.toLowerCase().includes(keyword));
            const hasClientKeywords = clientKeywords.some(keyword => text.toLowerCase().includes(keyword));
            
            // Decision logic for speaker change
            if (timeGap > speakerChangeThreshold || 
                (significantPause && (lengthDifference || speedDifference)) ||
                (currentSpeaker === 'Agente' && hasClientKeywords && !hasAgentKeywords) ||
                (currentSpeaker === 'Cliente' && hasAgentKeywords && !hasClientKeywords) ||
                consecutiveSegmentsBySpeaker > 3) {
              shouldChangeSpeaker = true;
            }
          }
          
          if (shouldChangeSpeaker) {
            currentSpeaker = currentSpeaker === 'Agente' ? 'Cliente' : 'Agente';
            consecutiveSegmentsBySpeaker = 0;
          } else {
            consecutiveSegmentsBySpeaker++;
          }
          
          const startTime = Math.floor(segment.start);
          const minutes = Math.floor(startTime / 60);
          const seconds = startTime % 60;
          const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          formattedTranscription += `[${timestamp}] ${currentSpeaker}: ${text}\n`;
          
          // Detect silence periods (gaps > 3 seconds)
          if (segment.pauseAfter > 3) {
            const silenceDuration = Math.round(segment.pauseAfter);
            formattedTranscription += `[${timestamp}] Silencio: ${silenceDuration} segundos de pausa\n`;
          }
        }
      });
      
      if (formattedTranscription.trim()) {
        processedTranscription = formattedTranscription;
      }
    }

    // Final validation
    if (!processedTranscription || processedTranscription.trim() === '') {
      return 'No hay transcripción disponible - error en el procesamiento del audio';
    }

    // Check for actual conversation content
    const lines = processedTranscription.split('\n').filter(line => line.trim());
    const conversationLines = lines.filter(line => 
      line.includes('Agente:') || line.includes('Cliente:')
    );
    
    if (conversationLines.length < 2) {
      return 'No hay transcripción disponible - no se detectó conversación entre agente y cliente';
    }

    console.log(`Transcription processed successfully with ${conversationLines.length} conversation segments`);
    return processedTranscription;
    
  } catch (error) {
    console.error('Error in transcription:', error);
    
    // Enhanced error handling
    if (error.name === 'AbortError') {
      return 'No hay transcripción disponible - tiempo de descarga agotado';
    }
    
    if (error.message.includes('Invalid file format')) {
      return 'No hay transcripción disponible - formato de archivo no compatible';
    }
    
    if (error.message.includes('File too large')) {
      return 'No hay transcripción disponible - archivo de audio demasiado grande';
    }
    
    if (error.message.includes('No speech found')) {
      return 'No hay transcripción disponible - no se detectó habla en el audio';
    }
    
    throw new Error(`Transcription failed: ${error.message}`);
  }
}
