
const openAIKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('API_DE_OPENAI');

export async function generateSummary(transcription: string, customPrompt?: string): Promise<string> {
  if (!openAIKey) {
    console.warn('No OpenAI API key found, skipping summary generation');
    return 'Resumen no disponible - API key no configurada';
  }

  // Check if transcription is empty or contains only voicemail/system messages
  if (!transcription || transcription.trim().length === 0) {
    return 'No hay transcripción disponible para generar resumen';
  }

  // Check for common voicemail indicators
  const voicemailIndicators = [
    'correo de voz',
    'buzón de voz',
    'mailbox',
    'voicemail',
    'deje su mensaje',
    'no disponible en este momento',
    'por favor deje un mensaje'
  ];

  const lowerTranscription = transcription.toLowerCase();
  const hasVoicemailIndicators = voicemailIndicators.some(indicator => 
    lowerTranscription.includes(indicator)
  );

  if (hasVoicemailIndicators && transcription.length < 100) {
    return 'La llamada fue dirigida a correo de voz - no hay transcripción de conversación disponible';
  }

  // Check if transcription seems too short or incomplete
  if (transcription.trim().length < 50) {
    return 'Transcripción muy corta o incompleta - no hay suficiente contenido para generar resumen';
  }

  try {
    const defaultPrompt = `Analiza ÚNICAMENTE la siguiente transcripción de UNA SOLA LLAMADA y proporciona un resumen conciso y profesional.

IMPORTANTE: Esta es la transcripción de una llamada específica - NO consideres otras llamadas, grabaciones o contextos externos.

TRANSCRIPCIÓN DE LA LLAMADA:
${transcription}

Proporciona un resumen que incluya:

1. **Motivo principal de la llamada**: ¿Por qué contactó el cliente?
2. **Puntos clave discutidos**: Los temas más importantes tratados
3. **Resolución o resultado**: ¿Cómo se resolvió la consulta o qué se acordó?
4. **Próximos pasos**: Si se mencionaron acciones futuras

INSTRUCCIONES:
- Mantén el resumen entre 100-200 palabras
- Usa un tono profesional y objetivo
- Basa tu análisis ÚNICAMENTE en esta transcripción
- Si la transcripción es unclear o contiene principalmente ruido/mensajes automáticos, indica "Transcripción no clara para análisis"
- Si no hay suficiente información, indica qué falta específicamente`;

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
            content: 'Eres un analista experto en resúmenes de llamadas. Generas resúmenes precisos basados únicamente en la transcripción proporcionada, sin hacer suposiciones sobre otras llamadas o contextos.'
          },
          {
            role: 'user',
            content: promptToUse
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI');
    }

    const summary = data.choices[0].message.content.trim();
    console.log('Generated summary for specific call transcription');
    
    // Additional validation
    if (summary.length < 20) {
      return 'No se pudo generar un resumen adecuado - transcripción insuficiente';
    }
    
    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    return `Error al generar resumen de esta llamada específica: ${error.message}`;
  }
}
