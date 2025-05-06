
import OpenAI from "https://esm.sh/openai@4.28.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

/**
 * Analiza el comportamiento del agente en una llamada.
 * Genera análisis personalizados para cada comportamiento configurado.
 */
export async function analyzeBehaviors(call: any, behaviors: any[]) {
  if (!call.transcription) {
    throw new Error("La llamada no tiene transcripción");
  }
  
  // Parsear transcripción
  let transcriptionText = "";
  try {
    if (typeof call.transcription === 'string') {
      const parsedTranscription = JSON.parse(call.transcription);
      transcriptionText = Array.isArray(parsedTranscription) 
        ? parsedTranscription.map(segment => segment.text || "").join(' ')
        : call.transcription;
    } else if (Array.isArray(call.transcription)) {
      transcriptionText = call.transcription.map(segment => segment.text || "").join(' ');
    }
  } catch (e) {
    transcriptionText = typeof call.transcription === 'string' 
      ? call.transcription 
      : "No se pudo procesar la transcripción";
  }
  
  // Incluir el resumen si está disponible para mejorar el análisis contextual
  const contextSummary = call.summary ? `\nResumen de la llamada: ${call.summary}` : "";
  
  // Obtener API key de OpenAI
  const openAIApiKey = Deno.env.get('API_DE_OPENAI') || Deno.env.get('API de OPENAI');
  
  if (!openAIApiKey) {
    throw new Error("API key de OpenAI no encontrada en las variables de entorno");
  }
  
  // Crear cliente de OpenAI
  const openai = new OpenAI({
    apiKey: openAIApiKey
  });
  
  // Crear cliente de Supabase para consultas adicionales
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
  
  // Obtener datos históricos para mejor contextualización
  const { data: recentFeedback } = await supabase
    .from('feedback')
    .select('behaviors_analysis')
    .order('created_at', { ascending: false })
    .limit(5);
  
  // Identificar patrones comunes en análisis recientes
  const recentPatterns = new Set<string>();
  if (recentFeedback) {
    recentFeedback.forEach(feedback => {
      if (feedback.behaviors_analysis && Array.isArray(feedback.behaviors_analysis)) {
        feedback.behaviors_analysis.forEach((behavior: any) => {
          if (behavior.comments) {
            recentPatterns.add(behavior.comments);
          }
        });
      }
    });
  }
  
  // Crear mensaje para evitar repeticiones
  const antiRepetitionContext = Array.from(recentPatterns).length > 0 
    ? `\nEVITA REPETIR ESTOS PATRONES DE COMENTARIOS COMUNES EN ANÁLISIS RECIENTES: ${Array.from(recentPatterns).join('; ')}`
    : "";
  
  // Analizar cada comportamiento en paralelo
  const behaviorsPromises = behaviors.map(async behavior => {
    try {
      // Adaptar el mensaje del sistema para cada comportamiento
      const systemMessage = `Eres un experto en análisis de calidad de llamadas de servicio al cliente y ventas.

Tu tarea es evaluar si el siguiente comportamiento específico se cumple o no en la transcripción de la llamada:
"${behavior.name}"

${behavior.prompt}

MUY IMPORTANTE:
- Evalúa ÚNICAMENTE este comportamiento específico, no otros aspectos de la llamada
- Analiza DETALLADAMENTE cada parte de la transcripción relacionada con este comportamiento
- Sé OBJETIVO y basa tu evaluación en EVIDENCIA concreta encontrada en la transcripción
- Proporciona COMENTARIOS ESPECÍFICOS Y DETALLADOS que sean ACCIONABLES, citando partes exactas de la conversación
- Evita comentarios genéricos o plantillas; cada análisis debe ser 100% personalizado
- NO menciones ni analices otros comportamientos fuera del específicamente solicitado
- Si no hay suficiente información para evaluar este comportamiento, indícalo claramente

${antiRepetitionContext}

Responde en formato JSON:
{
  "evaluation": "cumple" o "no cumple",
  "comments": "Comentarios detallados y específicos sobre este comportamiento"
}`;

      // Call OpenAI API to analyze the behavior
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Usando modelo más económico que mantiene buena calidad
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: `Analiza si el comportamiento "${behavior.name}" se cumple en la siguiente transcripción:\n\n${transcriptionText}${contextSummary}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2 // Baja temperatura para mayor consistencia
      });

      // Parse the response
      const content = response.choices[0].message.content;
      let result;
      
      try {
        result = JSON.parse(content || "{}");
      } catch (e) {
        console.error("Error parsing JSON response:", e);
        result = { 
          evaluation: "no cumple", 
          comments: "Error al analizar comportamiento: no se pudo procesar la respuesta" 
        };
      }

      // Validate evaluation
      if (result.evaluation !== "cumple" && result.evaluation !== "no cumple") {
        result.evaluation = "no cumple";
      }

      return {
        name: behavior.name,
        evaluation: result.evaluation,
        comments: result.comments || "No se proporcionaron comentarios específicos"
      };
    } catch (error) {
      console.error(`Error analyzing behavior "${behavior.name}":`, error);
      return {
        name: behavior.name,
        evaluation: "no cumple",
        comments: `Error al analizar: ${error.message || "Error desconocido"}`
      };
    }
  });

  // Wait for all analyses to complete
  const behaviorsAnalysis = await Promise.all(behaviorsPromises);
  
  // Log result
  console.log(`Análisis completado para ${behaviorsAnalysis.length} comportamientos`);
  
  return behaviorsAnalysis;
}
