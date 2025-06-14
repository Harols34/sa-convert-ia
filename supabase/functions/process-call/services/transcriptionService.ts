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
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
    
    const response = await fetch(audioUrl, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    console.log(`Audio downloaded successfully, size: ${audioBuffer.byteLength} bytes`);
    
    // Check file size
    if (audioBuffer.byteLength > 25 * 1024 * 1024) {
      console.warn('Audio file is large, this may take longer to process');
    }
    
    if (audioBuffer.byteLength < 1000) {
      console.warn('Audio file is very small, may not contain meaningful content');
      return 'No hay transcripción disponible - archivo de audio muy pequeño o vacío';
    }
    
    const audioBlob = new Blob([audioBuffer]);
    const file = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });
    
    console.log('Starting transcription with speaker diarization...');
    
    // Transcription Stage: never mix summary/feedback here!
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'es',
      prompt: 'Esta es una conversación telefónica comercial entre un asesor de ventas y un cliente potencial. El asesor normalmente se presenta primero, saluda profesionalmente y ofrece productos o servicios. El cliente hace preguntas, expresa dudas o responde. Es importante identificar claramente cuando habla cada persona y marcar los cambios de hablante.'
    });

    // Only return the full formatted plain text with speaker separation and silences, never with analysis
    let formattedTranscription = '';
    if (transcription.segments && transcription.segments.length > 0) {
      const sortedSegments = transcription.segments.sort((a: any, b: any) => a.start - b.start);

      let currentSpeaker = 'Asesor';
      let lastSpeakerChange = 0;
      sortedSegments.forEach((segment: any, index: number) => {
        const text = segment.text ? segment.text.trim() : '';
        if (!text) return;

        // --- Speaker detection logic (as before) ---
        const advisorKeywords = [
          'buenos días', 'buenas tardes', 'buenas noches', 'hola', 'saludo',
          'en qué puedo ayudarle', 'cómo está', 'perfecto', 'exacto', 'correcto',
          'empresa', 'servicio', 'oferta', 'producto', 'plan', 'promoción',
          'descuento', 'precio', 'costo', 'beneficio', 'ventaja', 'instalación',
          'técnico', 'soporte', 'llamamos', 'ofrecemos', 'tenemos', 'contrato',
          'facturación', 'asesor', 'representante', 'empresa', 'compañía',
          'le explico', 'le comento', 'permíteme', 'disculpe', 'señor', 'señora',
          'disponemos', 'manejamos', 'trabajamos', 'me comunico', 'contacto'
        ];
        
        const clientKeywords = [
          'sí', 'no', 'bueno', 'okay', 'vale', 'claro', 'entiendo',
          'quiero', 'necesito', 'me interesa', 'cuánto', 'precio',
          'gracias', 'pero', 'problema', 'duda', 'pregunta', 'entonces',
          'ya tengo', 'no me interesa', 'pensarlo', 'consultar',
          'mmm', 'ah', 'oh', 'ajá', 'uh huh', 'cómo', 'cuándo',
          'dónde', 'por qué', 'qué tal', 'está bien', 'perfecto',
          'disculpe', 'perdón', 'no entiendo'
        ];

        const textLower = text.toLowerCase();
        const hasAdvisorKeywords = advisorKeywords.some(keyword => textLower.includes(keyword));
        const hasClientKeywords = clientKeywords.some(keyword => textLower.includes(keyword));
        let speakerForSegment = currentSpeaker;

        if (index === 0) {
          speakerForSegment = 'Asesor';
        }
        else if (hasAdvisorKeywords && !hasClientKeywords && text.length > 50) {
          speakerForSegment = 'Asesor';
        }
        else if (hasClientKeywords && !hasAdvisorKeywords) {
          speakerForSegment = 'Cliente';
        }
        else if (segment.start - lastSpeakerChange > 3) {
          speakerForSegment = currentSpeaker === 'Asesor' ? 'Cliente' : 'Asesor';
        }

        if (speakerForSegment !== currentSpeaker) {
          currentSpeaker = speakerForSegment;
          lastSpeakerChange = segment.start;
        }

        // Timestamp formatting (mm:ss)
        const startTime = Math.floor(segment.start);
        const minutes = Math.floor(startTime / 60);
        const seconds = startTime % 60;
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        formattedTranscription += `[${timestamp}] ${currentSpeaker}: ${text}\n`;

        // Detect silence
        const nextSegment = sortedSegments[index + 1];
        if (nextSegment) {
          const silenceDuration = nextSegment.start - segment.end;
          if (silenceDuration > 2) {
            const silenceStart = Math.floor(segment.end);
            const silenceMinutes = Math.floor(silenceStart / 60);
            const silenceSeconds = silenceStart % 60;
            const silenceTimestamp = `${silenceMinutes}:${silenceSeconds.toString().padStart(2, '0')}`;
            formattedTranscription += `[${silenceTimestamp}] Silencio: ${Math.round(silenceDuration)} segundos de pausa\n`;
          }
        }
      });
    } else {
      // Fallback as before (plain speaker alternation)
      const sentences = transcription.text.split(/[.!?]+/).filter(s => s.trim());
      let currentSpeaker = 'Asesor';
      
      sentences.forEach((sentence, index) => {
        if (sentence.trim()) {
          const timestamp = `${Math.floor(index * 15 / 60)}:${(index * 15 % 60).toString().padStart(2, '0')}`;
          formattedTranscription += `[${timestamp}] ${currentSpeaker}: ${sentence.trim()}\n`;
          
          // Alternate speaker every 2-3 sentences
          if (index > 0 && index % 2 === 0) {
            currentSpeaker = currentSpeaker === 'Asesor' ? 'Cliente' : 'Asesor';
          }
        }
      });
    }

    // FINAL: Return only this transcription string, never add summary or feedback here
    if (!formattedTranscription || formattedTranscription.trim() === '') {
      return 'No hay transcripción disponible - error en el procesamiento del audio';
    }

    // Verify we have actual conversation
    const lines = formattedTranscription.split('\n').filter(line => line.trim());
    const conversationLines = lines.filter(line => 
      line.includes('Asesor:') || line.includes('Cliente:')
    );
    
    if (conversationLines.length < 2) {
      console.log('Insufficient conversation detected');
      return 'No hay transcripción disponible - no se detectó conversación suficiente entre asesor y cliente';
    }

    // Ensure we have both speakers
    const hasAdvisor = conversationLines.some(line => line.includes('Asesor:'));
    const hasClient = conversationLines.some(line => line.includes('Cliente:'));
    
    if (!hasAdvisor || !hasClient) {
      console.log('Missing speaker types in conversation');
      return 'No hay transcripción disponible - no se detectó conversación completa entre asesor y cliente';
    }

    console.log(`Transcription processed successfully with ${conversationLines.length} conversation segments`);
    console.log('Final transcription length:', formattedTranscription.length);
    
    return formattedTranscription;
    
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
