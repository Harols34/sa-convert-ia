
import OpenAI from "https://esm.sh/openai@4.28.0";

/**
 * Transcribes audio using OpenAI's Whisper API with enhanced speaker diarization
 */
export async function transcribeAudio(openai: OpenAI, audioUrl: string) {
  console.log(`Descargando archivo de audio: ${audioUrl}`);
  console.log("Iniciando transcripción mejorada...");

  // Descargar archivo de audio usando fetch
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Error descargando audio: ${audioResponse.status} ${audioResponse.statusText}`);
  }
  
  const audioBlob = await audioResponse.blob();
  const file = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });
  
  console.log("Comenzando transcripción con Whisper...");
  // Utilizamos el formato JSON detallado para obtener más información
  const transcriptionResult = await openai.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
    response_format: "verbose_json",
    temperature: 0,
    language: "es"
  });
  
  // Extraer segmentos de la transcripción
  const segments = transcriptionResult.segments;
  console.log(`Transcripción completada con ${segments.length} segmentos`);
  
  // Aplicar post-procesamiento para mejorar la identificación de hablantes
  const enhancedSegments = enhanceTranscription(segments);
  
  return enhancedSegments;
}

/**
 * Mejora la transcripción aplicando heurísticas para identificar hablantes
 */
function enhanceTranscription(segments: any[]) {
  if (!segments || segments.length === 0) {
    return [];
  }
  
  // Inicializar con dos hablantes: asesor y cliente
  const speakerTypes = ['Asesor', 'Cliente'];
  let currentSpeaker = 0; // Empezamos asumiendo que el primer hablante es el asesor
  
  // Palabras clave que probablemente indican un asesor
  const asesorKeywords = [
    'le puedo ayudar', 'mi nombre es', 'le saluda', 'bienvenido', 'en qué puedo ayudarle',
    'gracias por llamar', 'le ofrecemos', 'tenemos', 'nuestra empresa', 'nuestro servicio',
    'permítame', 'con gusto', 'le comento', 'le explico', 'déjeme verificar'
  ];
  
  // Palabras clave que probablemente indican un cliente
  const clienteKeywords = [
    'quiero saber', 'me interesa', 'necesito', 'tengo una duda', 'quisiera preguntar',
    'mi problema es', 'me gustaría', 'estoy llamando por', 'mi nombre es', 'yo soy'
  ];
  
  // Función para detectar el tipo de hablante basado en el texto
  const detectSpeakerType = (text: string) => {
    text = text.toLowerCase();
    
    // Verificar si contiene palabras clave de asesor
    const isAsesor = asesorKeywords.some(keyword => text.includes(keyword.toLowerCase()));
    if (isAsesor) return 0; // Asesor
    
    // Verificar si contiene palabras clave de cliente
    const isCliente = clienteKeywords.some(keyword => text.includes(keyword.toLowerCase()));
    if (isCliente) return 1; // Cliente
    
    // Si no podemos determinar, devolver null
    return null;
  };
  
  // Aplicar heurísticas para identificar cambios de hablante
  // 1. Silencios largos a menudo indican cambio de hablante
  // 2. Palabras clave específicas pueden indicar quién está hablando
  // 3. El tono y la forma de hablar pueden ser diferentes
  
  let enhancedSegments = [...segments];
  let lastEndTime = 0;
  
  // Primera pasada: detectar hablantes basados en palabras clave y silencios
  for (let i = 0; i < enhancedSegments.length; i++) {
    const segment = enhancedSegments[i];
    
    // Verificar si hay un silencio significativo entre segmentos
    const silenceGap = segment.start - lastEndTime;
    const significantSilence = silenceGap > 1.0; // Más de 1 segundo de silencio
    
    // Detectar tipo de hablante basado en el texto
    const detectedSpeaker = detectSpeakerType(segment.text);
    
    // Primer segmento o después de un silencio significativo
    if (i === 0 || significantSilence) {
      // Si podemos detectar quién habla, asignar ese hablante
      if (detectedSpeaker !== null) {
        currentSpeaker = detectedSpeaker;
      } 
      // Si no podemos detectar, alternar hablante después de un silencio
      else if (significantSilence) {
        currentSpeaker = 1 - currentSpeaker;
      }
    } 
    // Si detectamos claramente un tipo de hablante diferente, cambiar
    else if (detectedSpeaker !== null && detectedSpeaker !== currentSpeaker) {
      currentSpeaker = detectedSpeaker;
    }
    
    // Asignar el hablante al segmento
    segment.speaker = speakerTypes[currentSpeaker];
    lastEndTime = segment.end;
  }
  
  // Segunda pasada: corregir anomalías (p.ej., un solo segmento de un hablante entre muchos del otro)
  for (let i = 1; i < enhancedSegments.length - 1; i++) {
    const prev = enhancedSegments[i-1];
    const curr = enhancedSegments[i];
    const next = enhancedSegments[i+1];
    
    // Si el segmento actual tiene un hablante diferente a los segmentos anterior y siguiente,
    // y es un segmento corto, probablemente es del mismo hablante que los adyacentes
    if (prev.speaker === next.speaker && curr.speaker !== prev.speaker && (curr.end - curr.start) < 2.0) {
      curr.speaker = prev.speaker;
    }
  }
  
  console.log("Transcripción mejorada con identificación de hablantes");
  return enhancedSegments;
}
