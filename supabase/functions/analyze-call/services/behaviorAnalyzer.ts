
import { Call } from "../types/index.ts";

const openAIKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('API_DE_OPENAI');

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
  const behaviorPrompts = behaviors.map((behavior, index) => 
    `${index + 1}. **${behavior.name}**: ${behavior.prompt}`
  ).join('\n\n');

  const prompt = `Analiza la siguiente transcripción de llamada ÚNICAMENTE según los comportamientos especificados. Esta es la transcripción de UNA SOLA LLAMADA específica - no consideres otras llamadas o transcripciones.

TRANSCRIPCIÓN DE LA LLAMADA:
${call.transcription}

COMPORTAMIENTOS A EVALUAR:
${behaviorPrompts}

INSTRUCCIONES IMPORTANTES:
1. Evalúa ÚNICAMENTE esta transcripción específica
2. Para cada comportamiento, determina si se "cumple" o "no cumple"
3. Proporciona comentarios específicos basados en lo que observas en ESTA transcripción
4. Si la transcripción no contiene suficiente información o es un correo de voz, marca como "no cumple" con comentario explicativo
5. Si no hay una transcripción clara o válida, indica "Transcripción no disponible para análisis"

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
[
  {
    "name": "Nombre del comportamiento",
    "evaluation": "cumple" o "no cumple",
    "comments": "Comentario específico basado en la transcripción"
  }
]

NO incluyas ningún texto adicional, markdown, ni explicaciones fuera del JSON.`;

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
          content: 'Eres un analista experto en evaluación de comportamientos en llamadas. Respondes ÚNICAMENTE con JSON válido sin texto adicional.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
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
    console.error('Invalid OpenAI response structure:', data);
    throw new Error('Respuesta inválida de OpenAI');
  }

  const content = data.choices[0].message.content.trim();
  console.log('Raw OpenAI response:', content);

  // Clean the response to ensure it's valid JSON
  let cleanedContent = content;
  
  // Remove any markdown code blocks
  cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remove any leading/trailing whitespace or newlines
  cleanedContent = cleanedContent.trim();
  
  // Ensure it starts with [ and ends with ]
  if (!cleanedContent.startsWith('[')) {
    console.error('Response does not start with [:', cleanedContent);
    throw new Error('Formato de respuesta inválido - no es un array JSON');
  }
  
  if (!cleanedContent.endsWith(']')) {
    console.error('Response does not end with ]:', cleanedContent);
    throw new Error('Formato de respuesta inválido - array JSON incompleto');
  }

  try {
    const analysisResults = JSON.parse(cleanedContent);
    
    if (!Array.isArray(analysisResults)) {
      console.error('Parsed result is not an array:', analysisResults);
      throw new Error('La respuesta no es un array válido');
    }

    // Validate each result
    const validatedResults: BehaviorAnalysisResult[] = [];
    
    for (let i = 0; i < analysisResults.length; i++) {
      const result = analysisResults[i];
      
      if (!result || typeof result !== 'object') {
        console.error(`Invalid result at index ${i}:`, result);
        continue;
      }
      
      if (!result.name || !result.evaluation || !result.comments) {
        console.error(`Missing required fields in result ${i}:`, result);
        continue;
      }
      
      if (result.evaluation !== 'cumple' && result.evaluation !== 'no cumple') {
        console.error(`Invalid evaluation value in result ${i}:`, result.evaluation);
        result.evaluation = 'no cumple';
      }
      
      validatedResults.push({
        name: String(result.name),
        evaluation: result.evaluation as "cumple" | "no cumple",
        comments: String(result.comments)
      });
    }
    
    console.log(`Successfully parsed and validated ${validatedResults.length} results`);
    return validatedResults;
    
  } catch (parseError) {
    console.error('JSON parsing error:', parseError);
    console.error('Content that failed to parse:', cleanedContent);
    
    // Return default "no cumple" results for all behaviors in this batch
    return behaviors.map(behavior => ({
      name: behavior.name,
      evaluation: "no cumple" as const,
      comments: `Error al procesar respuesta de análisis: ${parseError.message}`
    }));
  }
}
