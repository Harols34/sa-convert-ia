
const openAIKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('API_DE_OPENAI');

export async function generateFeedback(transcription: string, summary: string, customPrompt?: string) {
  if (!openAIKey) {
    console.warn('No OpenAI API key found, skipping feedback generation');
    return {
      score: 0,
      positive: ['Feedback no disponible - API key no configurada'],
      negative: [],
      opportunities: [],
      sentiment: 'neutral',
      entities: [],
      topics: [],
      behaviors_analysis: []
    };
  }

  try {
    const defaultPrompt = `Analiza la siguiente llamada y proporciona feedback estructurado:

TRANSCRIPCIÓN: {transcription}

RESUMEN: {summary}

Proporciona tu análisis en el siguiente formato JSON exacto:
{
  "score": [número del 0-100],
  "positive": ["punto positivo 1", "punto positivo 2"],
  "negative": ["área de mejora 1", "área de mejora 2"],
  "opportunities": ["oportunidad 1", "oportunidad 2"],
  "sentiment": "positive|negative|neutral",
  "entities": ["entidad1", "entidad2"],
  "topics": ["tema1", "tema2"]
}`;

    const promptToUse = customPrompt || defaultPrompt;
    
    // Replace placeholders in the prompt
    const finalPrompt = promptToUse
      .replace('{transcription}', transcription)
      .replace('{summary}', summary);

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
            content: 'Eres un experto en análisis de llamadas. Responde SOLO con el JSON solicitado, sin texto adicional.'
          },
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Generated feedback with custom prompt:', !!customPrompt);
    
    try {
      const parsedFeedback = JSON.parse(content);
      
      // Validate required fields
      return {
        score: parsedFeedback.score || 0,
        positive: Array.isArray(parsedFeedback.positive) ? parsedFeedback.positive : [],
        negative: Array.isArray(parsedFeedback.negative) ? parsedFeedback.negative : [],
        opportunities: Array.isArray(parsedFeedback.opportunities) ? parsedFeedback.opportunities : [],
        sentiment: parsedFeedback.sentiment || 'neutral',
        entities: Array.isArray(parsedFeedback.entities) ? parsedFeedback.entities : [],
        topics: Array.isArray(parsedFeedback.topics) ? parsedFeedback.topics : [],
        behaviors_analysis: parsedFeedback.behaviors_analysis || []
      };
    } catch (parseError) {
      console.error('Error parsing feedback JSON:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

  } catch (error) {
    console.error('Error generating feedback:', error);
    return {
      score: 0,
      positive: ['Error al generar feedback: ' + error.message],
      negative: [],
      opportunities: [],
      sentiment: 'neutral',
      entities: [],
      topics: [],
      behaviors_analysis: []
    };
  }
}
