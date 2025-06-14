
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
    
    console.log('Starting transcription with Whisper...');
    
    // Get clean transcription from Whisper with speaker diarization
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'es'
    });

    // Process segments to create clean transcription with speaker separation
    let formattedTranscription = '';
    
    if (transcription.segments && transcription.segments.length > 0) {
      console.log(`Processing ${transcription.segments.length} segments from Whisper`);
      
      const sortedSegments = transcription.segments.sort((a: any, b: any) => a.start - b.start);
      let currentSpeaker = 'Asesor'; // Start with advisor
      let lastSpeakerChange = 0;
      
      sortedSegments.forEach((segment: any, index: number) => {
        const text = segment.text ? segment.text.trim() : '';
        if (!text || text.length < 3) return; // Skip very short segments
        
        // Simple speaker alternation with keyword detection
        const textLower = text.toLowerCase();
        
        // Keywords that typically indicate the advisor is speaking
        const advisorKeywords = [
          'buenos días', 'buenas tardes', 'hola', 'me comunico', 'empresa', 'servicio',
          'oferta', 'producto', 'plan', 'promoción', 'precio', 'beneficio', 'instalación',
          'técnico', 'soporte', 'llamamos', 'ofrecemos', 'tenemos', 'contrato',
          'le explico', 'le comento', 'permíteme', 'señor', 'señora', 'disponemos',
          'manejamos', 'trabajamos', 'representante', 'asesor', 'compañía'
        ];
        
        // Keywords that typically indicate the client is speaking
        const clientKeywords = [
          'sí', 'no', 'bueno', 'okay', 'claro', 'entiendo', 'quiero', 'necesito',
          'me interesa', 'cuánto', 'gracias', 'pero', 'problema', 'duda', 'pregunta',
          'ya tengo', 'no me interesa', 'pensarlo', 'consultar', 'cómo', 'cuándo',
          'dónde', 'por qué', 'está bien', 'perfecto', 'no entiendo'
        ];
        
        const hasAdvisorKeywords = advisorKeywords.some(keyword => textLower.includes(keyword));
        const hasClientKeywords = clientKeywords.some(keyword => textLower.includes(keyword));
        
        // Determine speaker based on content and context
        if (index === 0) {
          // First segment is usually the advisor
          currentSpeaker = 'Asesor';
        } else if (hasAdvisorKeywords && !hasClientKeywords && text.length > 20) {
          currentSpeaker = 'Asesor';
          lastSpeakerChange = segment.start;
        } else if (hasClientKeywords && !hasAdvisorKeywords) {
          currentSpeaker = 'Cliente';
          lastSpeakerChange = segment.start;
        } else if (segment.start - lastSpeakerChange > 5) {
          // If enough time has passed, likely speaker change
          currentSpeaker = currentSpeaker === 'Asesor' ? 'Cliente' : 'Asesor';
          lastSpeakerChange = segment.start;
        }
        
        // Format timestamp
        const startTime = Math.floor(segment.start);
        const minutes = Math.floor(startTime / 60);
        const seconds = startTime % 60;
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Add the segment to transcription
        formattedTranscription += `[${timestamp}] ${currentSpeaker}: ${text}\n`;
        
        // Check for silence between segments
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
      // Fallback: use the raw text and create basic speaker structure
      console.log('No segments available, using raw text');
      const rawText = transcription.text || '';
      
      if (!rawText || rawText.trim().length < 10) {
        return 'No hay transcripción disponible - no se detectó contenido de audio';
      }
      
      // Split by sentences and alternate speakers
      const sentences = rawText.split(/[.!?]+/).filter(s => s.trim().length > 5);
      let currentSpeaker = 'Asesor';
      
      sentences.forEach((sentence, index) => {
        const cleanSentence = sentence.trim();
        if (cleanSentence) {
          const timestamp = `${Math.floor(index * 10 / 60)}:${(index * 10 % 60).toString().padStart(2, '0')}`;
          formattedTranscription += `[${timestamp}] ${currentSpeaker}: ${cleanSentence}.\n`;
          
          // Alternate speaker every 2-3 sentences
          if (index > 0 && index % 2 === 0) {
            currentSpeaker = currentSpeaker === 'Asesor' ? 'Cliente' : 'Asesor';
          }
        }
      });
    }

    // Validate the transcription quality
    if (!formattedTranscription || formattedTranscription.trim() === '') {
      return 'No hay transcripción disponible - error en el procesamiento del audio';
    }

    // Check if we have actual conversation
    const lines = formattedTranscription.split('\n').filter(line => line.trim());
    const conversationLines = lines.filter(line => 
      line.includes('Asesor:') || line.includes('Cliente:')
    );
    
    if (conversationLines.length < 2) {
      console.log('Insufficient conversation detected, lines:', conversationLines.length);
      return 'No hay transcripción disponible - no se detectó conversación suficiente';
    }

    // Ensure we have both speakers
    const hasAdvisor = conversationLines.some(line => line.includes('Asesor:'));
    const hasClient = conversationLines.some(line => line.includes('Cliente:'));
    
    if (!hasAdvisor || !hasClient) {
      console.log('Missing speaker types in conversation');
      return 'No hay transcripción disponible - no se detectó conversación completa entre asesor y cliente';
    }

    console.log(`Transcription completed successfully:`);
    console.log(`- Total lines: ${lines.length}`);
    console.log(`- Conversation lines: ${conversationLines.length}`);
    console.log(`- Has advisor: ${hasAdvisor}`);
    console.log(`- Has client: ${hasClient}`);
    console.log(`- Final length: ${formattedTranscription.length} characters`);
    
    return formattedTranscription;
    
  } catch (error) {
    console.error('Error in transcription service:', error);
    
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
