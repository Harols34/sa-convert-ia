
import OpenAI from "https://esm.sh/openai@4.28.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * Generates a summary of the transcription using OpenAI
 */
export async function generateSummary(openai: OpenAI, transcription: any[]) {
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
    
    // Fetch active summary prompt
    const { data: activePrompt, error: promptError } = await supabase
      .from('prompts')
      .select('content')
      .eq('type', 'summary')
      .eq('active', true)
      .maybeSingle();
      
    // Default prompt if none is found in database
    const defaultPrompt = `Eres un asistente especializado en analizar y resumir transcripciones de llamadas de servicio al cliente y ventas.
          
          Genera un resumen detallado y personalizado que incluya:
          
          1. El problema principal o asunto de la llamada 
          2. Las soluciones propuestas y su efectividad
          3. El resultado final de la llamada (si se logró una venta, resolución o quedó pendiente)
          4. Insights específicos sobre la calidad de la atención (tono, empatía, conocimiento del asesor)
          5. Detalles sobre el producto o servicio ofrecido (móvil, hogar, internet, televisión, etc.)
          6. Si se realizó venta cruzada y qué productos adicionales se ofrecieron
          7. Señala oportunidades de mejora específicas basadas en la conversación

          El resumen debe ser detallado, personalizado según la conversación específica, 
          y debe incluir citas o referencias a partes relevantes de la llamada.
          
          Usa un formato de Markdown, separando claramente las secciones, con un estilo profesional pero fácil de leer.`;
    
    // Use active prompt from database if available, otherwise use default
    const systemContent = (activePrompt?.content) ? activePrompt.content : defaultPrompt;
    
    console.log("Generating AI summary with model: gpt-4o-mini");
    
    // Generate summary using OpenAI
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
      temperature: 0.7, // Increased for more creativity and variability
    });
    
    const summary = response.choices[0].message.content || "No se pudo generar un resumen.";
    console.log("Summary generated successfully");
    
    return summary;
  } catch (error) {
    console.error("Error al generar el resumen:", error);
    return "Error al generar el resumen.";
  }
}
