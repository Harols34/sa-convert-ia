
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
 * Main handler for the general chat function
 */
async function handleGeneralChat(req) {
  // Parse request body
  const { query, userId, history } = await req.json();
  
  if (!query) {
    throw new Error("Message is required");
  }
  
  console.log(`Processing general chat query: "${query.substring(0, 50)}..."`);
  
  // Initialize OpenAI client
  const openai = initializeOpenAI();
  
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

Ejemplos de preguntas que puedes responder:
- "¿Cuántas llamadas tenemos en total?"
- "¿Cuáles son los principales temas tratados en las llamadas?"
- "¿Cuál es el promedio de duración de las llamadas?"
- "¿Qué agentes han atendido más llamadas?"
- "¿Qué productos se mencionan más frecuentemente?"
- "¿Cuáles son los motivos más comunes de las llamadas?"
- "¿Puedes mostrarme un resumen de la llamada más reciente?"
- "¿Cuál es el sentimiento general de las llamadas?"
- "¿Qué oportunidades de mejora has identificado?"
- "¿Cuáles son las quejas más comunes?"
`;
  
  // Prepare message history for the API
  const messages = [
    { role: "system", content: systemPrompt },
    ...(history || []).map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: "user", content: query }
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
      .select('id, title, agent_name, duration, date, result, product, summary, transcription')
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
    const resultsCount = {};
    recentCalls.forEach(call => {
      if (call.result) {
        resultsCount[call.result] = (resultsCount[call.result] || 0) + 1;
      }
    });
    
    // Format the statistics as text
    let statsText = `Total de llamadas en el sistema: ${totalCalls || 0}\n\n`;
    
    if (Object.keys(resultsCount).length > 0) {
      statsText += "Resultados de llamadas recientes:\n";
      Object.entries(resultsCount).forEach(([result, count]) => {
        statsText += `- ${result || 'Sin resultado'}: ${count}\n`;
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
      statsText += "Llamadas recientes con sus detalles:\n";
      recentCalls.forEach(call => {
        statsText += `- ID: ${call.id}, Agente: ${call.agent_name}, Fecha: ${new Date(call.date).toLocaleDateString()}\n`;
        if (call.summary) {
          statsText += `  Resumen: ${call.summary}\n`;
        }
        if (call.transcription) {
          statsText += `  Transcripción: ${call.transcription.substring(0, 200)}...\n`;
        }
        statsText += "\n";
      });
    }
    
    return statsText;
  } catch (error) {
    console.error("Error fetching call stats:", error);
    return "Error al obtener estadísticas de llamadas.";
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
    return await handleGeneralChat(req);
  } catch (error) {
    console.error(`Error in general-chat function: ${error}`);
    
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
