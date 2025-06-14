
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
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased timeout for complete download
    
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
    
    console.log('Starting enhanced transcription with speaker diarization...');
    
    // Enhanced transcription with detailed speaker separation prompt
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'es',
      prompt: 'Esta es una conversación telefónica comercial entre un asesor de ventas (agente) y un cliente potencial. Es muy importante identificar claramente cuando habla cada persona. El asesor normalmente se presenta primero, saluda profesionalmente y ofrece productos o servicios. El cliente hace preguntas, expresa dudas o responde. Marca claramente los cambios de hablante y separa los turnos de conversación. Identifica también los silencios prolongados.'
    });

    console.log('Raw transcription completed');
    
    if (!transcription.text || transcription.text.trim() === '') {
      console.warn('Empty transcription received from OpenAI');
      return 'No hay transcripción disponible - el audio no contiene contenido analizable';
    }

    // Enhanced voicemail and automated message detection
    const nonAnalyzableIndicators = [
      'correo de voz', 'buzón de voz', 'mensaje de voz', 'leave a message',
      'después del tono', 'after the tone', 'voicemail', 'buzón',
      'deje su mensaje', 'no está disponible', 'not available', 'mailbox',
      'beep', 'please record', 'mensaje automático', 'automatic message',
      'presione', 'press', 'para español', 'for english', 'operadora',
      'operator', 'transferir', 'transfer', 'hold music', 'música de espera',
      'menu principal', 'main menu', 'opción', 'option', 'marque',
      'dial', 'sistema automático', 'automated system'
    ];

    const transcriptionLower = transcription.text.toLowerCase();
    const isNonAnalyzable = nonAnalyzableIndicators.some(indicator => 
      transcriptionLower.includes(indicator)
    );

    if (isNonAnalyzable) {
      console.log('Non-analyzable content detected (voicemail/automated system)');
      return 'No hay transcripción disponible - se detectó mensaje de correo de voz o sistema automático';
    }

    // Check if transcription is too short or meaningless
    if (transcription.text.trim().length < 50) {
      console.log('Transcription too short for meaningful analysis');
      return 'No hay transcripción disponible - contenido de audio insuficiente para análisis';
    }

    // Enhanced speaker diarization with improved logic
    let processedTranscription = '';
    let detectedSpeakers = new Set();
    
    if (transcription.segments && transcription.segments.length > 0) {
      console.log(`Processing ${transcription.segments.length} segments for enhanced speaker separation`);
      
      // Analyze segments for speaker patterns
      const processedSegments = transcription.segments.map((segment: any, index: number) => {
        const text = segment.text ? segment.text.trim() : '';
        if (!text) return null;

        // Enhanced speaker detection based on content and position
        let speakerType = 'Asesor'; // Default to advisor
        
        // Advisor indicators (professional language, offerings, greetings)
        const advisorKeywords = [
          'buenos días', 'buenas tardes', 'buenas noches', 'hola',
          'en qué puedo ayudarle', 'cómo está', 'perfecto', 'exacto', 'correcto',
          'empresa', 'servicio', 'oferta', 'producto', 'plan', 'promoción',
          'descuento', 'precio', 'costo', 'beneficio', 'ventaja', 'instalación',
          'técnico', 'soporte', 'llamamos', 'ofrecemos', 'tenemos', 'contrato',
          'facturación', 'asesor', 'representante', 'empresa', 'compañía',
          'le explico', 'le comento', 'permíteme', 'disculpe', 'señor', 'señora',
          'disponemos', 'manejamos', 'trabajamos'
        ];
        
        // Client indicators (questions, responses, concerns)
        const clientKeywords = [
          'sí', 'no', 'bueno', 'okay', 'vale', 'claro', 'entiendo',
          'quiero', 'necesito', 'me interesa', 'cuánto', 'precio',
          'gracias', 'pero', 'problema', 'duda', 'pregunta', 'entonces',
          'ya tengo', 'no me interesa', 'pensarlo', 'consultar',
          'mmm', 'ah', 'oh', 'ajá', 'uh huh', 'cómo', 'cuándo',
          'dónde', 'por qué', 'qué tal', 'está bien', 'perfecto'
        ];

        const textLower = text.toLowerCase();
        const hasAdvisorKeywords = advisorKeywords.some(keyword => textLower.includes(keyword));
        const hasClientKeywords = clientKeywords.some(keyword => textLower.includes(keyword));
        
        // Length-based heuristics (advisors tend to speak longer)
        const isLongSegment = text.length > 100;
        const isShortResponse = text.length < 30;
        
        // Position-based heuristics
        const isFirstSegment = index === 0;
        const isEarlySegment = index < 3;
        
        // Speaker assignment logic
        if (isFirstSegment || (isEarlySegment && isLongSegment && hasAdvisorKeywords)) {
          speakerType = 'Asesor';
        } else if (hasClientKeywords && !hasAdvisorKeywords) {
          speakerType = 'Cliente';
        } else if (isShortResponse && hasClientKeywords) {
          speakerType = 'Cliente';
        } else if (hasAdvisorKeywords && isLongSegment) {
          speakerType = 'Asesor';
        } else {
          // Alternate based on previous speaker pattern if unclear
          const prevSegments = transcription.segments.slice(Math.max(0, index - 2), index);
          const prevAdvisorCount = prevSegments.filter((s: any) => s.speakerAssigned === 'Asesor').length;
          const prevClientCount = prevSegments.filter((s: any) => s.speakerAssigned === 'Cliente').length;
          
          if (prevAdvisorCount > prevClientCount) {
            speakerType = 'Cliente';
          } else {
            speakerType = 'Asesor';
          }
        }

        detectedSpeakers.add(speakerType);
        
        return {
          ...segment,
          text,
          speakerAssigned: speakerType,
          start: segment.start || 0,
          end: segment.end || 0
        };
      }).filter(segment => segment !== null);

      // Sort by timestamp
      processedSegments.sort((a, b) => a.start - b.start);

      // Apply speaker alternation logic for better accuracy
      let currentSpeaker = 'Asesor';
      let lastSpeakerChangeTime = 0;
      
      processedSegments.forEach((segment, index) => {
        const timeSinceLastChange = segment.start - lastSpeakerChangeTime;
        const nextSegment = processedSegments[index + 1];
        const pauseAfter = nextSegment ? nextSegment.start - segment.end : 0;
        
        // Determine if speaker should change based on multiple factors
        let shouldChangeSpeaker = false;
        
        if (index > 0) {
          // Significant pause suggests speaker change
          if (pauseAfter > 1.5) shouldChangeSpeaker = true;
          
          // Content-based change detection
          if (segment.speakerAssigned !== currentSpeaker && timeSinceLastChange > 3) {
            shouldChangeSpeaker = true;
          }
          
          // Prevent too frequent changes
          if (timeSinceLastChange < 2 && segment.text.length < 50) {
            shouldChangeSpeaker = false;
          }
        }
        
        if (shouldChangeSpeaker && index > 0) {
          currentSpeaker = currentSpeaker === 'Asesor' ? 'Cliente' : 'Asesor';
          lastSpeakerChangeTime = segment.start;
        }
        
        segment.finalSpeaker = currentSpeaker;
      });

      // Generate formatted transcription
      processedSegments.forEach((segment, index) => {
        const startTime = Math.floor(segment.start);
        const minutes = Math.floor(startTime / 60);
        const seconds = startTime % 60;
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        processedTranscription += `[${timestamp}] ${segment.finalSpeaker}: ${segment.text}\n`;
        
        // Detect and add silence periods
        const nextSegment = processedSegments[index + 1];
        if (nextSegment) {
          const silenceDuration = nextSegment.start - segment.end;
          if (silenceDuration > 2) {
            const silenceStart = Math.floor(segment.end);
            const silenceMinutes = Math.floor(silenceStart / 60);
            const silenceSeconds = silenceStart % 60;
            const silenceTimestamp = `${silenceMinutes}:${silenceSeconds.toString().padStart(2, '0')}`;
            processedTranscription += `[${silenceTimestamp}] Silencio: ${Math.round(silenceDuration)} segundos de pausa\n`;
          }
        }
      });
    } else {
      console.log('No segments available, using basic speaker alternation');
      // Fallback: Basic speaker alternation
      const sentences = transcription.text.split(/[.!?]+/).filter(s => s.trim());
      let currentSpeaker = 'Asesor';
      
      sentences.forEach((sentence, index) => {
        if (sentence.trim()) {
          const timestamp = `${Math.floor(index * 10 / 60)}:${(index * 10 % 60).toString().padStart(2, '0')}`;
          processedTranscription += `[${timestamp}] ${currentSpeaker}: ${sentence.trim()}\n`;
          
          // Alternate speaker every few sentences
          if (index > 0 && index % 2 === 0) {
            currentSpeaker = currentSpeaker === 'Asesor' ? 'Cliente' : 'Asesor';
          }
        }
      });
    }

    // Final validation
    if (!processedTranscription || processedTranscription.trim() === '') {
      console.warn('Processed transcription is empty');
      return 'No hay transcripción disponible - error en el procesamiento del audio';
    }

    // Verify we have actual conversation
    const lines = processedTranscription.split('\n').filter(line => line.trim());
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
    console.log(`Detected speakers: ${Array.from(detectedSpeakers).join(', ')}`);
    
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
