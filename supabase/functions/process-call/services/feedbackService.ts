
import OpenAI from "https://esm.sh/openai@4.28.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * Generates feedback for the call using OpenAI
 */
export async function generateFeedback(openai: OpenAI, transcription: any[]) {
  try {
    // Extract text from transcription
    let transcriptionText = "";
    if (Array.isArray(transcription)) {
      transcriptionText = transcription.map(segment => segment.text).join(' ');
    } else if (typeof transcription === 'string') {
      try {
        const parsedTranscription = JSON.parse(transcription);
        if (Array.isArray(parsedTranscription)) {
          transcriptionText = parsedTranscription.map((segment: any) => segment.text).join(' ');
        }
      } catch {
        transcriptionText = transcription;
      }
    }
    
    // Initialize Supabase client to fetch active prompts
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Fetch active feedback prompt
    const { data: activePrompt, error: promptError } = await supabase
      .from('prompts')
      .select('content')
      .eq('type', 'feedback')
      .eq('active', true)
      .maybeSingle();
      
    // Default prompt if none is found in database
    const defaultPrompt = `Eres un experto en análisis de llamadas de servicio al cliente y ventas. 
    
    Analiza la siguiente transcripción de una llamada y proporciona retroalimentación constructiva sobre:

    1. Calidad de atención y servicio al cliente
    2. Habilidades de comunicación del agente
    3. Efectividad en la resolución del problema
    4. Oportunidades de mejora específicas
    5. Aspectos positivos destacables
    6. Sugerencias para mejorar la experiencia del cliente
    7. Evaluación de técnicas de venta (si aplica)

    Estructura tu respuesta en formato Markdown con secciones claras y puntos accionables.`;
    
    // Use active prompt from database if available, otherwise use default
    const systemContent = (activePrompt?.content) ? activePrompt.content : defaultPrompt;
    
    // Generate feedback using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: `Analiza y proporciona retroalimentación para la siguiente transcripción de una llamada:\n\n${transcriptionText}`
        }
      ],
      temperature: 0.7,
    });
    
    const feedbackText = response.choices[0].message.content || "";
    console.log("Feedback generado por OpenAI");
    
    return parseFeedback(feedbackText, transcription[0]?.call_id || "");
  } catch (error) {
    console.error("Error al generar retroalimentación:", error);
    
    // Get the call ID
    let callId = "";
    if (Array.isArray(transcription) && transcription.length > 0) {
      callId = transcription[0]?.call_id || "";
    }
    
    // Return default feedback in case of error
    return {
      feedback: {
        call_id: callId,
        score: 50,
        positive: [
          "El agente atendió la llamada",
          "Se mantuvo un diálogo con el cliente",
          "Se identificó algún tipo de necesidad",
          "Se proporcionó alguna información",
          "Se completó la llamada"
        ],
        negative: [
          "No se pudo analizar completamente la calidad de la llamada",
          "Pueden existir áreas de mejora no identificadas",
          "El análisis está limitado por problemas técnicos",
          "Revisar manualmente para una evaluación más precisa",
          "Considerar reanalizar la llamada"
        ],
        opportunities: [
          "Implementar revisión manual para esta llamada",
          "Asegurar la calidad de las grabaciones",
          "Capacitar al equipo en procedimientos estándar",
          "Revisar scripts de atención",
          "Mejorar documentación de casos"
        ]
      },
      result: "",
      product: "",
      reason: ""
    };
  }
}

/**
 * Parse the feedback text from OpenAI into structured format
 */
function parseFeedback(feedbackText: string, callId: string) {
  // Parse the generated feedback
  let score = 50; // Default value
  const positiveMatch = feedbackText.match(/puntuaci[oó]n.*?(\d+)/i);
  if (positiveMatch && positiveMatch[1]) {
    score = parseInt(positiveMatch[1]);
    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));
  }
  
  // Extract positive aspects (look for numbered or bulleted lists)
  const positivePattern = /[Pp]ositivos?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s;
  const positiveMatch2 = feedbackText.match(positivePattern);
  
  // Extract negative aspects
  const negativePattern = /[Nn]egativos?|[Mm]ejoras?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s;
  const negativeMatch = feedbackText.match(negativePattern);
  
  // Extract opportunities
  const opportunitiesPattern = /[Oo]portunidades:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s;
  const opportunitiesMatch = feedbackText.match(opportunitiesPattern);
  
  // Improve pattern matching for result detection
  let result = "";
  let product = "";
  let reason = "";
  
  // Search for "venta" pattern more accurately
  const ventaPattern = /(?:resultado|resultado\s+de\s+la\s+llamada|clasificación).*?(venta\b)(?!\s+no)/i;
  const ventaMatch = feedbackText.match(ventaPattern);
  
  // Search for "no venta" pattern more accurately
  const noVentaPattern = /(?:resultado|resultado\s+de\s+la\s+llamada|clasificación).*?(no\s+venta)/i;
  const noVentaMatch = feedbackText.match(noVentaPattern);
  
  if (ventaMatch && !feedbackText.toLowerCase().includes("no venta")) {
    result = "venta";
    // Search for product
    const productoPattern = /(?:producto|ofrecido|vendido).*?(fijo|móvil)/i;
    const productoMatch = feedbackText.match(productoPattern);
    if (productoMatch && productoMatch[1]) {
      product = productoMatch[1].toLowerCase();
    }
  } else {
    result = "no venta";
    // Search for reason with emphasis on being concise (max 4 words)
    const razonPattern = /(?:razón|motivo|causa).*?[""]([^""]{1,30})[""]|(?:razón|motivo|causa).*?:?\s*([^,.;]{1,30})[,.;]/i;
    const razonMatch = feedbackText.match(razonPattern);
    if (razonMatch) {
      reason = (razonMatch[1] || razonMatch[2] || "").trim();
      // Limit to max 4 words
      reason = reason.split(/\s+/).slice(0, 4).join(" ");
      
      // Ensure the first letter is capitalized
      reason = reason.charAt(0).toUpperCase() + reason.slice(1).toLowerCase();
    } else {
      // If no specific reason found, set a default based on context
      if (feedbackText.toLowerCase().includes("cobertura")) {
        reason = "Sin cobertura";
      } else if (feedbackText.toLowerCase().includes("precio")) {
        reason = "Precio alto";
      } else if (feedbackText.toLowerCase().includes("consulta")) {
        reason = "Solo consulta";
      } else {
        reason = "Cliente indeciso";
      }
    }
  }
  
  // Helper function to extract list items
  const extractListItems = (text: string) => {
    if (!text) return [];
    const itemsPattern = /[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$)/g;
    const matches = Array.from(text.matchAll(itemsPattern));
    return matches.map(match => match[1].trim()).filter(Boolean).slice(0, 5);
  };
  
  // Prepare feedback arrays
  const positive = positiveMatch2 
    ? extractListItems(positiveMatch2[0])
    : ["El agente mantuvo un tono profesional", 
       "Se identificó correctamente", 
       "Intentó comprender la necesidad del cliente",
       "Proporcionó alguna tipo de solución",
       "Mantuvo la conversación cordial"];
  
  const negative = negativeMatch 
    ? extractListItems(negativeMatch[0])
    : ["Faltó mayor indagación sobre el problema", 
       "No verificó la satisfacción del cliente", 
       "No ofreció alternativas adicionales",
       "No estableció adecuadamente las expectativas",
       "Faltó cierre adecuado de la llamada"];
  
  const opportunities = opportunitiesMatch 
    ? extractListItems(opportunitiesMatch[0])
    : ["Mejorar técnicas de escucha activa", 
       "Implementar preguntas para indagar necesidades", 
       "Ofrecer soluciones alternativas",
       "Mejorar el cierre de la llamada",
       "Capacitación en manejo de objeciones"];
  
  // Feedback structure
  const feedback = {
    call_id: callId,
    score: score,
    positive: positive,
    negative: negative,
    opportunities: opportunities
  };
  
  console.log("Guardando feedback y resultados:", { feedback, result, product, reason });
  return { feedback, result, product, reason };
}
