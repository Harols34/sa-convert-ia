// Edge function for AI chat with calls

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import OpenAI from 'https://esm.sh/openai@4.28.0';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Setting up Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Initializes and returns an OpenAI client with the API key from environment variables
 */
function initializeOpenAI() {
  // Try multiple possible environment variable names
  const openaiKey = Deno.env.get("API_DE_OPENAI") || 
                  Deno.env.get("API de OPENAI") || 
                  Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    console.error("Missing OpenAI API key. Make sure the API key is set in the Edge Function Secrets.");
    throw new Error("OpenAI API key is not configured. Please check Edge Function secrets.");
  }
  
  return new OpenAI({ apiKey: openaiKey });
}

/**
 * Main handler for the AI chat function
 */
async function handleAiChat(req) {
  // Parse request body
  const { message, history, context } = await req.json();
  
  if (!message) {
    throw new Error("Message is required");
  }
  
  console.log(`Processing general chat query`);
  
  // Initialize OpenAI client
  const openai = initializeOpenAI();
  
  // If we have a call_id, handle as a specific call chat
  if (context?.callId) {
    return handleCallSpecificChat(message, history, context, openai);
  }
  
  // Otherwise, handle as a general chat about all calls
  return handleGeneralChat(message, history, openai);
}

/**
 * Handles chat for a specific call
 */
async function handleCallSpecificChat(message, history, context, openai) {
  // Check if feedback exists and generate it if it doesn't
  if (context?.callId) {
    await ensureFeedbackExists(context.callId, context.transcription, openai);
  }
  
  // Format context for the AI prompt
  const contextText = formatContextForPrompt(context);
  
  // Create system prompt
  const systemPrompt = `
Eres un asistente de análisis de llamadas telefónicas que ayuda a analizar y entender mejor las conversaciones entre asesores y clientes.

Contexto de la llamada:
${contextText}

Responde a las preguntas sobre la llamada basándote en el contexto y la transcripción proporcionada. 
Mantén un tono profesional y objetivo.
Si no puedes responder algo con la información disponible, indícalo claramente y sugiere qué información adicional sería útil.
`;
  
  // Prepare message history for the API
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message }
  ];
  
  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages.map(msg => ({
      role: msg.role === "assistant" || msg.role === "user" ? msg.role : "user",
      content: msg.content
    })),
    temperature: 0.7,
    max_tokens: 1000,
  });
  
  // Get the response
  const response = completion.choices[0]?.message?.content || "No pude generar una respuesta.";
  
  return new Response(
    JSON.stringify({ success: true, response }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Handles general chat about all calls
 */
async function handleGeneralChat(message, history, openai) {
  // Fetch general call data for context
  const callStats = await fetchCallStats();
  
  // Create system prompt for general chat
  const systemPrompt = `
Eres un asistente especializado en el análisis de llamadas telefónicas para un servicio de atención al cliente o ventas.

Contexto general:
${callStats}

Tu trabajo es ayudar a entender tendencias, identificar oportunidades de mejora y proporcionar análisis sobre las llamadas.
Responde de manera profesional, objetiva y precisa basándote en los datos disponibles.
Si no tienes información suficiente para responder una pregunta, indícalo claramente y sugiere qué datos serían útiles.
Mantén un tono profesional y orientado a datos en todas tus respuestas.
`;
  
  // Prepare message history for the API
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message }
  ];
  
  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages.map(msg => ({
      role: msg.role === "assistant" || msg.role === "user" ? msg.role : "user",
      content: msg.content
    })),
    temperature: 0.7,
    max_tokens: 1000,
  });
  
  // Get the response
  const response = completion.choices[0]?.message?.content || "No pude generar una respuesta.";
  
  return new Response(
    JSON.stringify({ success: true, response }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Fetches call statistics for context
 */
async function fetchCallStats() {
  try {
    // Fetch total number of calls
    const { count: totalCalls, error: countError } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error("Error fetching call count:", countError);
      return "No hay datos disponibles sobre las llamadas.";
    }
    
    // Fetch recent calls (last 10)
    const { data: recentCalls, error: recentError } = await supabase
      .from('calls')
      .select('id, title, agentName, duration, date, result, product, summary')
      .order('date', { ascending: false })
      .limit(10);
      
    if (recentError) {
      console.error("Error fetching recent calls:", recentError);
      return `Total de llamadas: ${totalCalls || 0}. No hay datos detallados disponibles.`;
    }
    
    // Fetch agent performance
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('name, status')
      .limit(20);
      
    if (agentsError) {
      console.error("Error fetching agents:", agentsError);
    }
    
    // Count call results
    const { data: results, error: resultsError } = await supabase
      .from('calls')
      .select('result, count')
      .not('result', 'is', null)
      .group('result');
      
    if (resultsError) {
      console.error("Error fetching call results:", resultsError);
    }
    
    // Format the statistics as text
    let statsText = `Total de llamadas en el sistema: ${totalCalls || 0}\n\n`;
    
    if (results && results.length > 0) {
      statsText += "Resultados de llamadas:\n";
      results.forEach(r => {
        statsText += `- ${r.result || 'Sin resultado'}: ${r.count}\n`;
      });
      statsText += "\n";
    }
    
    if (agents && agents.length > 0) {
      statsText += `Total de agentes: ${agents.length}\n`;
      statsText += "Agentes activos:\n";
      agents.filter(a => a.status === 'active').forEach(a => {
        statsText += `- ${a.name}\n`;
      });
      statsText += "\n";
    }
    
    if (recentCalls && recentCalls.length > 0) {
      statsText += "Llamadas recientes:\n";
      recentCalls.forEach(call => {
        statsText += `- ID: ${call.id}, Agente: ${call.agentName}, Fecha: ${new Date(call.date).toLocaleDateString()}, `;
        statsText += `Resultado: ${call.result || 'Desconocido'}, Producto: ${call.product || 'No especificado'}\n`;
        if (call.summary) {
          statsText += `  Resumen: ${call.summary.substring(0, 150)}...\n`;
        }
      });
    }
    
    return statsText;
  } catch (error) {
    console.error("Error fetching call stats:", error);
    return "Error al obtener estadísticas de llamadas.";
  }
}

/**
 * Formats the context for the AI prompt
 */
function formatContextForPrompt(context) {
  if (!context) return "No hay contexto disponible para esta llamada.";
  
  let formatted = `Fecha de la llamada: ${context.callDate || "No disponible"}\n`;
  formatted += `Asesor: ${context.agentName || "No disponible"}\n`;
  formatted += `Resultado: ${context.result || "No disponible"}\n\n`;
  
  if (context.summary) {
    formatted += `Resumen de la llamada:\n${context.summary}\n\n`;
  }
  
  if (context.transcription) {
    formatted += `Extracto de la transcripción:\n${context.transcription.substring(0, 2000)}${context.transcription.length > 2000 ? "..." : ""}`;
  } else {
    formatted += "No hay transcripción disponible para esta llamada.";
  }
  
  return formatted;
}

/**
 * Ensures feedback exists for the call, generates it if it doesn't
 */
async function ensureFeedbackExists(callId, transcription, openai) {
  try {
    // Check if feedback already exists
    const { data: existingFeedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('*')
      .eq('call_id', callId)
      .maybeSingle();
      
    if (feedbackError && feedbackError.code !== 'PGRST116') {
      console.error("Error checking feedback:", feedbackError);
    }
    
    // If feedback doesn't exist or is missing key elements, generate it
    if (!existingFeedback || 
        !existingFeedback.positive || existingFeedback.positive.length === 0 ||
        !existingFeedback.negative || existingFeedback.negative.length === 0 ||
        !existingFeedback.opportunities || existingFeedback.opportunities.length === 0 ||
        !existingFeedback.score) {
      
      console.log("Generating feedback for call:", callId);
      if (!transcription) {
        console.warn("Missing transcription for feedback generation");
        return;
      }
      
      // Generate feedback using OpenAI
      const feedbackData = await generateFeedback(callId, transcription, openai);
      
      if (existingFeedback) {
        // Update existing feedback
        const { error: updateError } = await supabase
          .from('feedback')
          .update({
            positive: feedbackData.positive,
            negative: feedbackData.negative,
            opportunities: feedbackData.opportunities,
            score: feedbackData.score,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingFeedback.id);
          
        if (updateError) {
          console.error("Error updating feedback:", updateError);
        } else {
          console.log("Updated feedback for call:", callId);
        }
      } else {
        // Create new feedback
        const { error: insertError } = await supabase
          .from('feedback')
          .insert({
            call_id: callId,
            positive: feedbackData.positive,
            negative: feedbackData.negative,
            opportunities: feedbackData.opportunities,
            score: feedbackData.score
          });
          
        if (insertError) {
          console.error("Error creating feedback:", insertError);
        } else {
          console.log("Created feedback for call:", callId);
        }
      }
      
      // Update the call with result if missing
      if (feedbackData.result) {
        const { error: updateCallError } = await supabase
          .from('calls')
          .update({
            result: feedbackData.result,
            product: feedbackData.product,
            reason: feedbackData.reason
          })
          .eq('id', callId);
          
        if (updateCallError) {
          console.error("Error updating call with result:", updateCallError);
        } else {
          console.log("Updated call with result:", callId);
        }
      }
    } else {
      console.log("Feedback already exists for call:", callId);
    }
  } catch (error) {
    console.error("Error ensuring feedback exists:", error);
  }
}

/**
 * Generates feedback for a call using OpenAI
 */
async function generateFeedback(callId, transcription, openai) {
  try {
    console.log("Generating feedback with OpenAI for call:", callId);
    
    // Create the prompt
    const prompt = `
Analiza la siguiente transcripción de una llamada telefónica entre un asesor y un cliente:

${transcription}

Por favor, proporciona:

1. Una puntuación global de la llamada (del 0 al 100)
2. 5 aspectos positivos específicos de la llamada
3. 5 aspectos negativos específicos o áreas de mejora
4. 5 oportunidades concretas para mejorar la efectividad de la llamada
5. Determina si la llamada resultó en una "venta" o "no venta"
6. Si fue "venta", especifica qué producto fue ofrecido: "fijo" o "móvil"
7. Si fue "no venta", proporciona una razón breve

Tu análisis debe ser objetivo, específico y accionable.

Responde en formato JSON con las siguientes propiedades:
{
  "score": número del 0 al 100,
  "positive": [lista de 5 aspectos positivos],
  "negative": [lista de 5 aspectos negativos],
  "opportunities": [lista de 5 oportunidades de mejora],
  "result": "venta" o "no venta",
  "product": "fijo" o "móvil" (solo si es venta),
  "reason": "razón breve" (solo si es no venta)
}
`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un evaluador experto de llamadas de servicio al cliente y ventas." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
    });
    
    // Get the response
    const responseText = completion.choices[0]?.message?.content || "";
    
    // Extract JSON from the response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const feedbackData = JSON.parse(jsonMatch[0]);
        // Validate and ensure all fields are present
        return {
          score: Math.min(100, Math.max(0, feedbackData.score || 50)),
          positive: Array.isArray(feedbackData.positive) ? feedbackData.positive.slice(0, 5) : ['Buena atención general'],
          negative: Array.isArray(feedbackData.negative) ? feedbackData.negative.slice(0, 5) : ['Áreas de mejora no identificadas'],
          opportunities: Array.isArray(feedbackData.opportunities) ? feedbackData.opportunities.slice(0, 5) : ['Oportunidades no identificadas'],
          result: ['venta', 'no venta'].includes(feedbackData.result) ? feedbackData.result : '',
          product: ['fijo', 'móvil'].includes(feedbackData.product) ? feedbackData.product : '',
          reason: feedbackData.reason ? String(feedbackData.reason).substring(0, 100) : ''
        };
      }
    } catch (error) {
      console.error("Error parsing feedback JSON:", error);
    }
    
    // Default feedback if parsing fails
    return {
      score: 50,
      positive: ['Atendió la llamada', 'Mantuvo un tono profesional', 'Proporcionó información', 'Intentó resolver la consulta', 'Fue cortés'],
      negative: ['Áreas de mejora no identificadas automáticamente', 'Revisar manualmente', 'El análisis automático falló', 'Posibles problemas técnicos', 'Datos insuficientes'],
      opportunities: ['Revisar manualmente esta llamada', 'Verificar calidad de audio', 'Mejorar el proceso de análisis', 'Utilizar herramientas complementarias', 'Realizar evaluación humana'],
      result: '',
      product: '',
      reason: ''
    };
  } catch (error) {
    console.error("Error generating feedback:", error);
    return {
      score: 50,
      positive: ['Error en el análisis automático'],
      negative: ['Error en el análisis automático'],
      opportunities: ['Revisar manualmente esta llamada'],
      result: '',
      product: '',
      reason: ''
    };
  }
}

// Main server handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  try {
    return await handleAiChat(req);
  } catch (error) {
    console.error(`Error in ai-chat function: ${error}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
