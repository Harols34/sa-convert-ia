
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, accountId } = await req.json();
    
    console.log('AI Chat request:', { message, context, accountId });
    
    if (!message) {
      return new Response(JSON.stringify({ error: "Mensaje requerido" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openAIApiKey = Deno.env.get('API_DE_OPENAI') || Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: "API key de OpenAI no configurada" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user and get user context
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuario no autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Authenticated user:', user.id);

    // Build context data with account filtering
    let contextData = "";
    
    if (context === "calls" || context === "general") {
      // Get calls data filtered by account
      let callsQuery = supabase
        .from('calls')
        .select(`
          id, title, agent_name, duration, date, status, 
          transcription, summary, result, product, reason
        `)
        .order('date', { ascending: false })
        .limit(50);

      // Apply account filter if specified
      if (accountId && accountId !== 'all') {
        callsQuery = callsQuery.eq('account_id', accountId);
        console.log('Filtering calls by account:', accountId);
      } else {
        // If no specific account, get user's accessible accounts
        const { data: userAccounts } = await supabase
          .from('user_accounts')
          .select('account_id')
          .eq('user_id', user.id);
        
        if (userAccounts && userAccounts.length > 0) {
          const accountIds = userAccounts.map(ua => ua.account_id);
          callsQuery = callsQuery.in('account_id', accountIds);
          console.log('Filtering calls by user accounts:', accountIds);
        }
      }

      const { data: calls, error: callsError } = await callsQuery;
      
      if (callsError) {
        console.error('Error fetching calls:', callsError);
      } else if (calls && calls.length > 0) {
        contextData += `\nDatos de llamadas disponibles (${calls.length} llamadas):\n`;
        calls.forEach(call => {
          contextData += `- Llamada: ${call.title} | Agente: ${call.agent_name} | Duración: ${call.duration}s | Estado: ${call.status} | Fecha: ${call.date}\n`;
          if (call.summary) {
            contextData += `  Resumen: ${call.summary.substring(0, 200)}...\n`;
          }
          if (call.result) {
            contextData += `  Resultado: ${call.result}\n`;
          }
          if (call.product) {
            contextData += `  Producto: ${call.product}\n`;
          }
        });
      } else {
        contextData += "\nNo se encontraron llamadas para la cuenta seleccionada.\n";
      }

      // Get feedback data filtered by account
      let feedbackQuery = supabase
        .from('feedback')
        .select(`
          call_id, score, positive, negative, opportunities,
          calls!inner(title, agent_name, account_id)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      // Apply account filter to feedback
      if (accountId && accountId !== 'all') {
        feedbackQuery = feedbackQuery.eq('calls.account_id', accountId);
      } else if (userAccounts && userAccounts.length > 0) {
        const accountIds = userAccounts.map(ua => ua.account_id);
        feedbackQuery = feedbackQuery.in('calls.account_id', accountIds);
      }

      const { data: feedback, error: feedbackError } = await feedbackQuery;
      
      if (feedbackError) {
        console.error('Error fetching feedback:', feedbackError);
      } else if (feedback && feedback.length > 0) {
        contextData += `\nDatos de feedback disponibles (${feedback.length} evaluaciones):\n`;
        feedback.forEach(fb => {
          contextData += `- Llamada: ${fb.calls?.title} | Score: ${fb.score}/100\n`;
          if (fb.positive && fb.positive.length > 0) {
            contextData += `  Aspectos positivos: ${fb.positive.join(', ')}\n`;
          }
          if (fb.opportunities && fb.opportunities.length > 0) {
            contextData += `  Oportunidades: ${fb.opportunities.join(', ')}\n`;
          }
        });
      }
    }

    // System prompt with account context awareness
    const systemPrompt = `Eres un asistente de análisis de llamadas de servicio al cliente especializado en Convertia.

IMPORTANTE: Solo tienes acceso a los datos de la cuenta seleccionada por el usuario. ${accountId && accountId !== 'all' ? `La cuenta actual es: ${accountId}` : 'El usuario tiene acceso a múltiples cuentas.'} NO puedes acceder a datos de otras cuentas.

Puedes ayudar con:
- Análisis de calidad de llamadas
- Métricas de desempeño de agentes
- Tendencias en resultados de ventas
- Feedback y recomendaciones de mejora
- Estadísticas generales

CONTEXTO DISPONIBLE:
${contextData}

Si el usuario pregunta por datos que no están en el contexto, explica que solo tienes acceso a los datos de la cuenta seleccionada y sugiere verificar el filtro de cuenta.

Responde de forma clara y profesional en español. Si necesitas más información específica, pregunta al usuario.`;

    console.log('Sending request to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`Error de OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      accountContext: accountId || 'all'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in AI chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || "Error interno del servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
