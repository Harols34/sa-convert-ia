
const openAIKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('API_DE_OPENAI');

export async function generateSummary(transcription: string, customPrompt?: string): Promise<string> {
  if (!openAIKey) {
    console.warn('No OpenAI API key found, skipping summary generation');
    return 'Resumen no disponible - API key no configurada';
  }

  try {
    const defaultPrompt = `Analiza la siguiente transcripción de una llamada y proporciona un resumen conciso y profesional que incluya:

1. Motivo principal de la llamada
2. Puntos clave discutidos
3. Resolución o resultado
4. Próximos pasos (si aplica)

Mantén el resumen entre 100-200 palabras y usa un tono profesional.

Transcripción:`;

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
            role: 'user',
            content: `${promptToUse}\n\n${transcription}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
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
    console.log('Generated summary with custom prompt:', !!customPrompt);
    
    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Error al generar resumen: ' + error.message;
  }
}
