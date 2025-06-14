
const openAIKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('API_DE_OPENAI');

export async function generateSummary(transcriptionResult: any, customPrompt?: string): Promise<string> {
  if (!openAIKey) {
    console.warn('No OpenAI API key found, skipping summary generation');
    return 'Resumen no disponible - API key no configurada';
  }

  // Check if we have valid content to analyze
  if (!transcriptionResult.hasValidContent || !transcriptionResult.text || transcriptionResult.text.trim().length === 0) {
    return 'No hay transcripción disponible para generar resumen';
  }

  try {
    const defaultPrompt = `Analiza ÚNICAMENTE la siguiente transcripción de una llamada telefónica y proporciona un resumen preciso basado EXCLUSIVAMENTE en lo que se dice en esta conversación específica.

INSTRUCCIONES CRÍTICAS:
- Base su análisis SOLO en el contenido de esta transcripción
- NO invente información que no esté presente en la conversación
- NO asuma detalles que no se mencionan explícitamente
- Si algo no se discute en la llamada, indique claramente "No se menciona en la llamada"

Transcripción con hablantes identificados:
${transcriptionResult.segments.map((segment: any) => 
  `[${segment.speaker?.toUpperCase() || 'DESCONOCIDO'}]: ${segment.text}`
).join('\n')}

Proporciona un resumen estructurado que incluya:

1. **Motivo de la llamada**: ¿Por qué contactó el cliente?
2. **Información recopilada**: ¿Qué datos específicos se obtuvieron del cliente?
3. **Ofrecimiento realizado**: ¿Qué productos/servicios se ofrecieron específicamente?
4. **Respuesta del cliente**: ¿Cómo reaccionó el cliente a las propuestas?
5. **Resultado**: ¿Cómo terminó la llamada?
6. **Próximos pasos**: ¿Se establecieron acciones futuras?

IMPORTANTE: Si alguna sección no aplica porque no se menciona en la conversación, indique "No se menciona en esta llamada".`;

    const promptToUse = customPrompt || defaultPrompt;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un analista experto en llamadas de servicio al cliente. Analiza ÚNICAMENTE el contenido proporcionado sin agregar información externa o asumir detalles no mencionados.'
          },
          {
            role: 'user',
            content: promptToUse
          }
        ],
        max_tokens: 800,
        temperature: 0.1, // Very low temperature for consistency
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI');
    }

    const summary = data.choices[0].message.content;
    console.log('Generated summary for specific call transcription');
    
    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Error al generar resumen: ' + error.message;
  }
}
