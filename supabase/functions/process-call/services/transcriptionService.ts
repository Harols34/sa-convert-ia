
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
    const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased timeout
    
    const response = await fetch(audioUrl, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    
    // Check file size
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
      prompt: 'Esta es una conversación telefónica comercial entre un asesor de ventas y un cliente potencial. Identifica claramente cuando habla cada persona y separa los turnos de conversación.'
    });

    console.log('Transcription completed successfully');
    
    if (!transcription.text || transcription.text.trim() === '') {
      console.warn('Empty transcription received');
      return 'No hay transcripción disponible - el audio no contiene contenido analizable';
    }

    // Enhanced voicemail detection
    const voicemailIndicators = [
      'correo de voz', 'buzón de voz', 'mensaje de voz', 'leave a message',
      'después del tono', 'after the tone', 'voicemail', 'buzón',
      'deje su mensaje', 'no está disponible', 'not available', 'mailbox',
      'beep', 'please record', 'mensaje automático', 'automatic message',
      'presione', 'press', 'para español', 'for english', 'operadora',
      'operator', 'transferir', 'transfer', 'hold music', 'música de espera'
    ];

    const transcriptionLower = transcription.text.toLowerCase();
    const isVoicemail = voicemailIndicators.some(indicator => 
      transcriptionLower.includes(indicator)
    );

    if (isVoicemail) {
      console.log('Voicemail detected in transcription');
      return 'No hay transcripción disponible - se detectó mensaje de correo de voz o sistema automático';
    }

    // Check if transcription is too short or meaningless
    if (transcription.text.trim().length < 30) {
      console.log('Transcription too short or meaningless');
      return 'No hay transcripción disponible - contenido de audio insuficiente para análisis';
    }

    // Enhanced speaker diarization processing
    let processedTranscription = '';
    
    if (transcription.segments && transcription.segments.length > 0) {
      console.log(`Processing ${transcription.segments.length} segments for enhanced speaker separation`);
      
      let currentSpeaker = 'Asesor'; // Start with advisor
      let speakerChangeThreshold = 1.0; // Reduced threshold for better detection
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
            const timeGap = segment.start - prevSegment.end;
            
            // Context-based speaker detection - improved keywords
            const advisorKeywords = [
              'hola', 'buenos días', 'buenas tardes', 'en qué puedo ayudarle', 
              'perfecto', 'exacto', 'correcto', 'empresa', 'servicio', 'oferta',
              'producto', 'plan', 'promoción', 'descuento', 'precio', 'costo',
              'beneficio', 'ventaja', 'instalación', 'técnico', 'soporte',
              'llamamos', 'ofrecemos', 'tenemos', 'contrato', 'facturación'
            ];
            
            const clientKeywords = [
              'sí', 'no', 'quiero', 'necesito', 'me interesa', 'cuánto', 
              'precio', 'gracias', 'pero', 'problema', 'duda', 'pregunta',
              'entiendo', 'claro', 'okay', 'vale', 'bueno', 'entonces',
              'ya tengo', 'no me interesa', 'pensarlo', 'consultar'
            ];
            
            const hasAdvisorKeywords = advisorKeywords.some(keyword => 
              text.toLowerCase().includes(keyword)
            );
            const hasClientKeywords = clientKeywords.some(keyword => 
              text.toLowerCase().includes(keyword)
            );
            
            // Decision logic for speaker change
            if (timeGap > speakerChangeThreshold || 
                (currentSpeaker === 'Asesor' && hasClientKeywords && !hasAdvisorKeywords) ||
                (currentSpeaker === 'Cliente' && hasAdvisorKeywords && !hasClientKeywords) ||
                consecutiveSegmentsBySpeaker > 4) {
              shouldChangeSpeaker = true;
            }
          }
          
          if (shouldChangeSpeaker) {
            currentSpeaker = currentSpeaker === 'Asesor' ? 'Cliente' : 'Asesor';
            consecutiveSegmentsBySpeaker = 0;
          } else {
            consecutiveSegmentsBySpeaker++;
          }
          
          const startTime = Math.floor(segment.start);
          const minutes = Math.floor(startTime / 60);
          const seconds = startTime % 60;
          const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          processedTranscription += `[${timestamp}] ${currentSpeaker}: ${text}\n`;
          
          // Detect silence periods (gaps > 2 seconds)
          if (segment.pauseAfter > 2) {
            const silenceDuration = Math.round(segment.pauseAfter);
            processedTranscription += `[${timestamp}] Silencio: ${silenceDuration} segundos de pausa\n`;
          }
        }
      });
    } else {
      // Fallback: try to detect speakers in plain text
      const lines = transcription.text.split(/[.!?]+/).filter(line => line.trim());
      let currentSpeaker = 'Asesor';
      
      lines.forEach((line, index) => {
        if (line.trim()) {
          if (index > 0 && index % 2 === 0) {
            currentSpeaker = currentSpeaker === 'Asesor' ? 'Cliente' : 'Asesor';
          }
          processedTranscription += `[${Math.floor(index * 5 / 60)}:${(index * 5 % 60).toString().padStart(2, '0')}] ${currentSpeaker}: ${line.trim()}\n`;
        }
      });
    }

    // Final validation
    if (!processedTranscription || processedTranscription.trim() === '') {
      return 'No hay transcripción disponible - error en el procesamiento del audio';
    }

    // Check for actual conversation content
    const lines = processedTranscription.split('\n').filter(line => line.trim());
    const conversationLines = lines.filter(line => 
      line.includes('Asesor:') || line.includes('Cliente:')
    );
    
    if (conversationLines.length < 2) {
      return 'No hay transcripción disponible - no se detectó conversación entre asesor y cliente';
    }

    // Ensure we have both speakers
    const hasAdvisor = conversationLines.some(line => line.includes('Asesor:'));
    const hasClient = conversationLines.some(line => line.includes('Cliente:'));
    
    if (!hasAdvisor || !hasClient) {
      return 'No hay transcripción disponible - no se detectó conversación completa entre asesor y cliente';
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
