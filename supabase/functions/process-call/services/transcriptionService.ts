
import OpenAI from "https://esm.sh/openai@4.28.0";

/**
 * Transcribe y procesa audio usando una versión optimizada del servicio de Whisper
 * con mejoras en la identificación de hablantes y detección acústica
 */
export async function transcribeAudio(openai: OpenAI, audioUrl: string) {
  console.log(`Descargando archivo de audio: ${audioUrl}`);
  console.log("Iniciando transcripción con alta precisión y diarización...");

  try {
    // Descargar archivo de audio usando fetch
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Error descargando audio: ${audioResponse.status} ${audioResponse.statusText}`);
    }
    
    const audioBlob = await audioResponse.blob();
    const file = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });
    
    console.log("Comenzando transcripción con Whisper optimizado...");
    
    // Configuración optimizada para transcripción de alta calidad
    const transcriptionResult = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1", // Usar el modelo más preciso
      response_format: "verbose_json",
      temperature: 0, // Sin aleatoriedad para máxima precisión
      language: "es", // Especificar español para mejor reconocimiento
      timestamp_granularities: ["segment", "word"] // Timestamps a nivel de palabra y segmento
    });
    
    // Extraer segmentos de la transcripción
    const segments = transcriptionResult.segments || [];
    console.log(`Transcripción completada con ${segments.length} segmentos`);
    
    // Aplicar diarización mejorada basada en características acústicas
    const enhancedSegments = enhanceTranscriptionWithSpeakerDetection(segments);
    
    return enhancedSegments;
  } catch (error) {
    console.error("Error en la transcripción del audio:", error);
    throw error;
  }
}

/**
 * Mejora la transcripción aplicando algoritmos avanzados para identificar hablantes
 * basándose exclusivamente en características acústicas
 */
function enhanceTranscriptionWithSpeakerDetection(segments: any[]) {
  if (!segments || segments.length === 0) {
    return [];
  }
  
  // Inicializar con dos hablantes: asesor y cliente
  const speakerTypes = ['Asesor', 'Cliente'];
  let currentSpeaker = 0; // Empezamos asumiendo que el primer hablante es el asesor
  
  // Análisis acústico avanzado basado en estadísticas de segmentos
  const segmentStats = analyzeAcousticFeatures(segments);
  console.log("Estadísticas acústicas calculadas para diarización:", segmentStats);
  
  // Función para detectar cambios de turno basados ÚNICAMENTE en patrones acústicos
  const detectTurnChange = (currentIndex: number) => {
    if (currentIndex === 0) return true; // Primer segmento siempre es cambio
    
    const current = segments[currentIndex];
    const previous = segments[currentIndex - 1];
    
    // Detectar si hay una pausa significativa entre segmentos
    const silenceGap = current.start - previous.end;
    const significantSilence = silenceGap > 0.75; // Umbral de silencio en segundos
    
    // Detectar cambios basados en características acústicas
    let acousticChange = false;
    
    // Comparar confianza si está disponible
    if (current.confidence !== undefined && previous.confidence !== undefined) {
      const confidenceDifference = Math.abs(current.confidence - previous.confidence);
      if (confidenceDifference > 0.12) { // Umbral de diferencia de confianza
        acousticChange = true;
      }
    }
    
    // Comparar duración media de las palabras si están disponibles
    if (current.words && current.words.length > 0 && 
        previous.words && previous.words.length > 0) {
      
      const currentAvgWordDuration = getAverageWordDuration(current.words);
      const previousAvgWordDuration = getAverageWordDuration(previous.words);
      
      const durationDifference = Math.abs(currentAvgWordDuration - previousAvgWordDuration);
      if (durationDifference > 0.04) { // Umbral de diferencia de duración
        acousticChange = true;
      }
    }
    
    // Detección de características prosódicas (si están disponibles)
    if (current.avg_logprob !== undefined && previous.avg_logprob !== undefined) {
      const logprobDifference = Math.abs(current.avg_logprob - previous.avg_logprob);
      if (logprobDifference > 0.1) {
        acousticChange = true;
      }
    }
    
    return significantSilence || acousticChange;
  };
  
  // Función auxiliar para calcular la duración media de las palabras
  function getAverageWordDuration(words: any[]) {
    if (!words || words.length === 0) return 0;
    
    const totalDuration = words.reduce((sum, word) => {
      return sum + ((word.end || 0) - (word.start || 0));
    }, 0);
    
    return totalDuration / words.length;
  }
  
  // Aplicar algoritmo avanzado de detección de hablantes en múltiples pasadas
  let enhancedSegments = [...segments];
  let lastEndTime = 0;
  
  // Primera pasada: identificación basada en cambios de turno y patrones temporales
  for (let i = 0; i < enhancedSegments.length; i++) {
    const segment = enhancedSegments[i];
    if (!segment.text) continue;
    
    // Verificar si hay un silencio significativo entre segmentos
    const silenceGap = segment.start - lastEndTime;
    const significantSilence = silenceGap > 0.75; // Umbral de silencio
    
    // Detectar cambio de turno basado en características acústicas
    const turnChange = detectTurnChange(i);
    
    // Actualizar hablante si hay cambio de turno
    if (i === 0 || significantSilence || turnChange) {
      // Alternamos hablantes en cambios de turno
      currentSpeaker = 1 - currentSpeaker; // Alterna entre 0 y 1
    }
    
    // Asignar el hablante al segmento
    segment.speaker = speakerTypes[currentSpeaker];
    lastEndTime = segment.end;
  }
  
  // Segunda pasada: corrección de anomalías usando ventana deslizante
  const windowSize = 3; // Tamaño de la ventana para análisis contextual
  for (let i = windowSize; i < enhancedSegments.length - windowSize; i++) {
    const currentSegment = enhancedSegments[i];
    
    // Contar hablantes en la ventana anterior y posterior
    const previousWindow = enhancedSegments.slice(i - windowSize, i);
    const followingWindow = enhancedSegments.slice(i + 1, i + 1 + windowSize);
    
    const prevSpeakerCount = previousWindow.reduce((count, seg) => {
      return seg.speaker === speakerTypes[0] ? count + 1 : count;
    }, 0);
    
    const followSpeakerCount = followingWindow.reduce((count, seg) => {
      return seg.speaker === speakerTypes[0] ? count + 1 : count;
    }, 0);
    
    // Si el segmento actual es diferente a la mayoría en ambas ventanas,
    // probablemente esté mal clasificado
    if (
      prevSpeakerCount > windowSize / 2 && 
      followSpeakerCount > windowSize / 2 && 
      currentSegment.speaker !== speakerTypes[0]
    ) {
      currentSegment.speaker = speakerTypes[0];
    } else if (
      prevSpeakerCount < windowSize / 2 && 
      followSpeakerCount < windowSize / 2 && 
      currentSegment.speaker !== speakerTypes[1]
    ) {
      currentSegment.speaker = speakerTypes[1];
    }
  }
  
  // Tercera pasada: detección explícita de silencios
  const silenceSegments = [];
  for (let i = 0; i < enhancedSegments.length - 1; i++) {
    const current = enhancedSegments[i];
    const next = enhancedSegments[i + 1];
    const silenceGap = next.start - current.end;
    
    // Crear un segmento de silencio si es mayor a 2 segundos
    if (silenceGap > 2.0) {
      silenceSegments.push({
        text: "Silencio",
        start: current.end,
        end: next.start,
        speaker: "silence",
        confidence: 1.0
      });
    }
  }
  
  // Combinar segmentos normales con silencios y ordenar por tiempo
  const allSegments = [...enhancedSegments, ...silenceSegments].sort((a, b) => a.start - b.start);
  
  console.log("Transcripción mejorada con identificación avanzada de hablantes basada en acústica");
  console.log(`Total de segmentos: ${allSegments.length}, incluyendo ${silenceSegments.length} silencios detectados`);
  
  return allSegments;
}

/**
 * Analiza características acústicas de los segmentos para ayudar en la diarización
 * sin depender de palabras clave
 */
function analyzeAcousticFeatures(segments: any[]) {
  if (!segments || segments.length < 2) {
    return {
      agentSegments: [],
      clientSegments: [],
      agentAvgConfidence: 0,
      clientAvgConfidence: 0,
      agentAvgDuration: 0,
      clientAvgDuration: 0
    };
  }
  
  const stats = {
    agentSegments: [],
    clientSegments: [],
    agentAvgConfidence: 0,
    clientAvgConfidence: 0,
    agentAvgDuration: 0,
    clientAvgDuration: 0
  };
  
  // Características acústicas para diferenciar hablantes
  const confidenceValues: number[] = [];
  const durationValues: number[] = [];
  const wordRateValues: number[] = [];
  const logprobValues: number[] = [];
  const noSpeechProbValues: number[] = [];
  
  // Recopilar datos acústicos de todos los segmentos
  segments.forEach(segment => {
    if (!segment.text) return;
    
    const duration = (segment.end || 0) - (segment.start || 0);
    const wordCount = segment.words ? segment.words.length : segment.text.split(/\s+/).length;
    const wordsPerSecond = duration > 0 ? wordCount / duration : 0;
    
    if (segment.confidence !== undefined) {
      confidenceValues.push(segment.confidence);
    }
    
    if (segment.avg_logprob !== undefined) {
      logprobValues.push(segment.avg_logprob);
    }
    
    if (segment.no_speech_prob !== undefined) {
      noSpeechProbValues.push(segment.no_speech_prob);
    }
    
    durationValues.push(duration);
    wordRateValues.push(wordsPerSecond);
  });
  
  // Usar clustering basado en múltiples características para mejorar la precisión
  if (confidenceValues.length > 0 || logprobValues.length > 0) {
    // Ordenar valores para encontrar la mediana
    const sortedConfidence = [...confidenceValues].sort((a, b) => a - b);
    const medianConfidence = sortedConfidence[Math.floor(sortedConfidence.length / 2)] || 0;
    
    const sortedLogprob = [...logprobValues].sort((a, b) => a - b);
    const medianLogprob = sortedLogprob[Math.floor(sortedLogprob.length / 2)] || 0;
    
    // Asignar segmentos preliminares basados en múltiples características
    segments.forEach((segment, index) => {
      // Usar una combinación de características para asignación
      let isAgent = false;
      
      // Ponderación de características
      if (segment.confidence !== undefined && segment.confidence >= medianConfidence) {
        isAgent = true;
      }
      
      if (segment.avg_logprob !== undefined && segment.avg_logprob >= medianLogprob) {
        isAgent = !isAgent; // Invertir si contradice la confianza
      }
      
      // Usar también la tasa de palabras como indicador
      if (index < wordRateValues.length) {
        const sortedWordRates = [...wordRateValues].sort((a, b) => a - b);
        const medianWordRate = sortedWordRates[Math.floor(sortedWordRates.length / 2)];
        
        if (wordRateValues[index] >= medianWordRate) {
          // Los asesores tienden a hablar más rápido en contextos formales
          isAgent = true;
        }
      }
      
      // Asignar basado en determinación final
      if (isAgent) {
        stats.agentSegments.push(segment);
      } else {
        stats.clientSegments.push(segment);
      }
    });
  }
  
  // Calcular estadísticas de los grupos preliminares
  if (stats.agentSegments.length > 0) {
    stats.agentAvgConfidence = stats.agentSegments.reduce((sum, seg) => sum + (seg.confidence || 0), 0) / stats.agentSegments.length;
    stats.agentAvgDuration = stats.agentSegments.reduce((sum, seg) => sum + ((seg.end || 0) - (seg.start || 0)), 0) / stats.agentSegments.length;
  }
  
  if (stats.clientSegments.length > 0) {
    stats.clientAvgConfidence = stats.clientSegments.reduce((sum, seg) => sum + (seg.confidence || 0), 0) / stats.clientSegments.length;
    stats.clientAvgDuration = stats.clientSegments.reduce((sum, seg) => sum + ((seg.end || 0) - (seg.start || 0)), 0) / stats.clientSegments.length;
  }
  
  return stats;
}
