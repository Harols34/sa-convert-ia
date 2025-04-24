
import OpenAI from "https://esm.sh/openai@4.28.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * Generates a summary of the transcription using OpenAI
 */
export async function generateSummary(openai: OpenAI, transcription: any[]) {
  try {
    // Extraer texto de la transcripción
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
    
    // Fetch active summary prompt
    const { data: activePrompt, error: promptError } = await supabase
      .from('prompts')
      .select('content')
      .eq('type', 'summary')
      .eq('active', true)
      .maybeSingle();
      
    // Default prompt if none is found in database
    const defaultPrompt = `Eres un asistente especializado en analizar y resumir transcripciones de llamadas de servicio al cliente y ventas.
          
          Genera un resumen estructurado que incluya:
          
          1. El problema principal o asunto de la llamada 
          2. Las soluciones propuestas
          3. El resultado de la llamada
          4. Insights valiosos para mejorar las ventas
          5. Cual fuel el ofrecimiento realizado, sea servicios móviles o de hogar, como migración portabilidad línea nueva internet banda ancha televisión o full tigo. 
          6. Se realiza ofrecimiento cruzado buscando vender varios productos (fijo y móvil), responder si o no.
          7. Ofrece los dos productos (si/no)
          
          El formato debe ser en Markdown, conciso y fácil de leer.`;
    
    // Use active prompt from database if available, otherwise use default
    const systemContent = (activePrompt?.content) ? activePrompt.content : defaultPrompt;
    
    // Generar resumen utilizando OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: `Analiza y resume la siguiente transcripción de una llamada:\n\n${transcriptionText}`
        }
      ],
      temperature: 0.5,
    });
    
    return response.choices[0].message.content || "No se pudo generar un resumen.";
  } catch (error) {
    console.error("Error al generar el resumen:", error);
    return "Error al generar el resumen.";
  }
}
