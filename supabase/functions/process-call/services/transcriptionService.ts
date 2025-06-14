
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
    
    // Transcribe using OpenAI Whisper with enhanced speaker separation
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'es' // Spanish for better accuracy
    });

    console.log('Transcription completed successfully');
    
    if (!transcription.text || transcription.text.trim() === '') {
      console.warn('Empty transcription received');
      return 'No hay transcripción disponible - el audio no contiene contenido analizable';
    }

    // Check for voicemail indicators
    const voicemailIndicators = [
      'correo de voz',
      'buzón de voz', 
      'mensaje de voz',
      'leave a message',
      'después del tono',
      'after the tone',
      'voicemail',
      'buzón'
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
    if (transcription.text.trim().length < 10) {
      console.log('Transcription too short or meaningless');
      return 'No hay transcripción disponible - contenido de audio insuficiente para análisis';
    }

    // Process segments for speaker separation if available
    let processedTranscription = transcription.text;
    
    if (transcription.segments && transcription.segments.length > 0) {
      console.log(`Processing ${transcription.segments.length} segments for speaker separation`);
      
      let formattedTranscription = '';
      let currentSpeaker = 'Hablante 1';
      let speakerCount = 1;
      
      transcription.segments.forEach((segment: any, index: number) => {
        if (segment.text && segment.text.trim()) {
          // Simple speaker change detection based on pauses and content changes
          if (index > 0) {
            const prevSegment = transcription.segments[index - 1];
            const timeDiff = segment.start - prevSegment.end;
            
            // If there's a significant pause (>2 seconds), assume speaker change
            if (timeDiff > 2.0) {
              speakerCount = speakerCount === 1 ? 2 : 1;
              currentSpeaker = speakerCount === 1 ? 'Agente' : 'Cliente';
            }
          } else {
            // First segment, assume it's the agent
            currentSpeaker = 'Agente';
          }
          
          const startTime = Math.floor(segment.start);
          const minutes = Math.floor(startTime / 60);
          const seconds = startTime % 60;
          const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          formattedTranscription += `[${timestamp}] ${currentSpeaker}: ${segment.text.trim()}\n`;
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

    return processedTranscription;
    
  } catch (error) {
    console.error('Error in transcription:', error);
    
    // Check for specific error types
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
