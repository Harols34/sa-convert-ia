
const openAIKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('API_DE_OPENAI');

interface Call {
  id: string;
  transcription?: string;
  [key: string]: any;
}

interface BehaviorAnalysisResult {
  name: string;
  evaluation: "cumple" | "no cumple";
  comments: string;
}

export async function analyzeBehaviors(call: Call, behaviors: any[]): Promise<BehaviorAnalysisResult[]> {
  if (!openAIKey) {
    console.warn('No OpenAI API key found, skipping behavior analysis');
    throw new Error('API key de OpenAI no configurada');
  }

  if (!call.transcription || !behaviors || behaviors.length === 0) {
    console.warn('No transcription or behaviors available for analysis');
    return [];
  }

  console.log(`Analyzing ${behaviors.length} behaviors for call ${call.id}`);

  const results: BehaviorAnalysisResult[] = [];

  // Process behaviors in batches to avoid token limits
  const batchSize = 3;
  for (let i = 0; i < behaviors.length; i += batchSize) {
    const behaviorBatch = behaviors.slice(i, i + batchSize);
    
    try {
      const batchResults = await analyzeBehaviorBatch(call, behaviorBatch);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Error analyzing behavior batch ${i}-${i + batchSize}:`, error);
      
      // Add error results for this batch
      behaviorBatch.forEach(behavior => {
        results.push({
          name: behavior.name,
          evaluation: "no cumple",
          comments: `Error al analizar: ${error.message || 'Error desconocido'}`
        });
      });
    }
  }

  console.log(`Completed analysis for ${results.length} behaviors`);
  return results;
}

async function analyzeBehaviorBatch(call: Call, behaviors: any[]): Promise<BehaviorAnalysisResult[]> {
  // Check if transcription seems to be voicemail or too short
  const transcription = call.transcription || "";
  const lowerTranscription = transcription.toLowerCase();
  
  const voicemailIndicators = [
    'correo de voz',
    'buzón de voz', 
    'mailbox',
    'voicemail',
    'deje su mensaje',
    'no disponible en este momento',
    'por favor deje un mensaje',
    'thank you'
  ];

  const hasVoicemailIndicators = voicemailIndicators.some(indicator => 
    lowerTranscription.includes(indicator)
  );

  // If it's clearly voicemail or too short, return "no cumple" for all behaviors
  if (hasVoicemailIndicators || transcription.trim().length < 20) {
    console.log("Transcription appears to be voicemail or too short, marking all behaviors as 'no cumple'");
    return behaviors.map(behavior => ({
      name: behavior.name,
      evaluation: "no cumple" as const,
      comments: transcription.trim().length < 20 
        ? "Transcripción muy corta o vacía para análisis"
        : "La llamada fue dirigida a correo de voz - no hay conversación para analizar"
    }));
  }

  const behaviorPrompts = behaviors.map((behavior, index) => 
    `${index + 1}. **${behavior.name}**: ${behavior.prompt}`
  ).join('\n\n');

  const prompt = `IMPORTANTE: Analiza ÚNICAMENTE esta transcripción específica de UNA SOLA LLAMADA. NO consideres otras llamadas o contextos.

TRANSCRIPCIÓN A ANALIZAR:
"${transcription}"

COMPORTAMIENTOS A EVALUAR:
${behaviorPrompts}

INSTRUCCIONES CRÍTICAS:
1. Evalúa SOLO esta transcripción específica
2. Para cada comportamiento, responde "cumple" o "no cumple"
3. Basa los comentarios únicamente en lo que observas en ESTA transcripción
4. Si no hay suficiente información, marca como "no cumple"

FORMATO DE RESPUESTA OBLIGATORIO - Responde ÚNICAMENTE con este JSON (sin texto adicional):
[
  {
    "name": "Nombre exacto del comportamiento",
    "evaluation": "cumple",
    "comments": "Comentario específico basado en esta transcripción"
  },
  {
    "name": "Nombre exacto del comportamiento",
    "evaluation": "no cumple", 
    "comments": "Comentario específico basado en esta transcripción"
  }
]

NO incluyas explicaciones, markdown, ni texto fuera del JSON.`;

  try {
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
            content: 'Eres un analista de llamadas. Respondes ÚNICAMENTE con JSON válido en el formato solicitado. No agregues texto adicional, explicaciones o markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
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
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Respuesta inválida de OpenAI');
    }

    let content = data.choices[0].message.content.trim();
    console.log('Raw OpenAI response:', content);

    // Clean the response more aggressively
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    content = content.replace(/^[^[\{]*/, ''); // Remove any text before [ or {
    content = content.replace(/[^}\]]*$/, ''); // Remove any text after } or ]
    content = content.trim();
    
    // Ensure it's a valid JSON array
    if (!content.startsWith('[')) {
      console.error('Response does not start with [:', content);
      throw new Error('Formato de respuesta inválido');
    }
    
    if (!content.endsWith(']')) {
      console.error('Response does not end with ]:', content);
      // Try to fix it by adding the closing bracket
      content = content + ']';
    }

    let analysisResults;
    try {
      analysisResults = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing failed, content:', content);
      console.error('Parse error:', parseError);
      
      // Fallback: create default results
      return behaviors.map(behavior => ({
        name: behavior.name,
        evaluation: "no cumple" as const,
        comments: "Error al procesar respuesta de análisis"
      }));
    }
    
    if (!Array.isArray(analysisResults)) {
      console.error('Parsed result is not an array:', analysisResults);
      throw new Error('La respuesta no es un array válido');
    }

    // Validate and clean results
    const validatedResults: BehaviorAnalysisResult[] = [];
    
    for (let i = 0; i < Math.min(analysisResults.length, behaviors.length); i++) {
      const result = analysisResults[i];
      const behavior = behaviors[i];
      
      if (!result || typeof result !== 'object') {
        console.error(`Invalid result at index ${i}:`, result);
        validatedResults.push({
          name: behavior.name,
          evaluation: "no cumple",
          comments: "Error en el formato de respuesta"
        });
        continue;
      }
      
      const evaluation = result.evaluation === 'cumple' ? 'cumple' : 'no cumple';
      
      validatedResults.push({
        name: behavior.name,
        evaluation: evaluation as "cumple" | "no cumple",
        comments: String(result.comments || "Sin comentarios disponibles")
      });
    }
    
    // If we have fewer results than behaviors, fill in the missing ones
    for (let i = validatedResults.length; i < behaviors.length; i++) {
      validatedResults.push({
        name: behaviors[i].name,
        evaluation: "no cumple",
        comments: "No se pudo analizar este comportamiento"
      });
    }
    
    console.log(`Successfully processed ${validatedResults.length} behavior results`);
    return validatedResults;
    
  } catch (error) {
    console.error('Error in analyzeBehaviorBatch:', error);
    
    // Return default "no cumple" results for all behaviors in this batch
    return behaviors.map(behavior => ({
      name: behavior.name,
      evaluation: "no cumple" as const,
      comments: `Error al analizar: ${error.message || 'Error desconocido'}`
    }));
  }
}
