
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
    const defaultPrompt = `Analiza ÚNICAMENTE la siguiente transcripción de UNA SOLA LLAMADA. La transcripción incluye marcas de tiempo [MM:SS] para indicar cuándo comienza cada intervención. Tu tarea es generar un resumen profesional y objetivo, basándote ESTRICTA Y EXCLUSIVAMENTE en el contenido de la transcripción. NO inventes, NO supongas, y NO añadas información que no esté explícitamente mencionada.

IMPORTANTE:
- Tu análisis debe ser 100% fiel a la transcripción. Si un tema no se menciona, no lo incluyas.
- No hagas suposiciones sobre costos, cantidad de dispositivos, o cualquier otro detalle si no está en el texto.
- Si la transcripción es demasiado corta o no es clara, indícalo.

TRANSCRIPCIÓN DE LA LLAMADA:
${transcription}

Proporciona un resumen que incluya:

1. **Motivo principal de la llamada**: ¿Por qué contactó la persona?
2. **Puntos clave discutidos**: Los temas más importantes tratados. Cita textualmente fragmentos si es necesario para justificar los puntos.
3. **Resolución o resultado**: ¿Cómo se resolvió la consulta o qué se acordó?
4. **Próximos pasos**: Si se mencionaron acciones futuras.

INSTRUCCIONES ADICIONALES:
- Mantén el resumen entre 100-200 palabras.
- Si la transcripción no es clara o no contiene una conversación real, indica "Transcripción no concluyente para análisis".
- Si no hay suficiente información para un punto, escribe "No se menciona".`;

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
            content: 'Eres un analista experto en resúmenes de llamadas. Tu principal cualidad es la precisión y la fidelidad al texto original. Nunca inventas información. Generas resúmenes basados únicamente en la transcripción proporcionada.'
          },
          {
            role: 'user',
            content: promptToUse
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
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
