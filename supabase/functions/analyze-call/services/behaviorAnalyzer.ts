
// OpenAI API key from environment variables
const openAiKey = Deno.env.get("API_DE_OPENAI") || Deno.env.get("OPENAI_API_KEY") || Deno.env.get("Speech Analitycs");

// Function to validate and correct behavior evaluations
function processEvaluation(
  behaviorName: string, 
  rawResult: string, 
  behavior: any
): { evaluation: string, comments: string } {
  try {
    let parsedResult;
    
    // Sometimes OpenAI returns markdown, try to extract the JSON
    if (rawResult.includes('```json')) {
      const jsonMatch = rawResult.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedResult = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("No se pudo extraer JSON de la respuesta");
      }
    } else if (rawResult.startsWith('{') && rawResult.endsWith('}')) {
      parsedResult = JSON.parse(rawResult);
    } else {
      throw new Error("La respuesta no tiene formato JSON");
    }
    
    // Validate expected format
    if (!parsedResult.evaluation || !parsedResult.comments) {
      throw new Error("Respuesta incompleta");
    }
    
    // Normalize evaluation to expected values
    const normalizedEvaluation = parsedResult.evaluation.toLowerCase().trim();
    
    // Analyze comments to correct potential discrepancies
    const comments = parsedResult.comments;
    
    // Post-processing to detect contradictions
    // Look for phrases that indicate non-compliance even if the model says it complies
    const failPhrases = [
      "no se identificó", "no mencionó", "no preguntó", "no explicó", 
      "no verificó", "no ofreció", "no proporcionó", "no cumplió",
      "solo cumplió con 1", "solo cumplió con 2", "cumplió únicamente con 1",
      "cumplió únicamente con 2", "solamente cumplió con 1", "solamente cumplió con 2",
      "sólo cumplió 1", "sólo cumplió 2", "no cumple con los criterios",
      "no cumple con el mínimo", "no cumple con lo requerido"
    ];
    
    // Check if requires meeting multiple criteria
    const requiresMultipleCriteria = 
      behavior.prompt.includes("al menos 3") || 
      behavior.prompt.includes("mínimo 3") || 
      behavior.prompt.includes("3 de 4") ||
      behavior.prompt.includes("tres de cuatro");
    
    // If it says "complies" but comments suggest otherwise
    let correctedEvaluation = normalizedEvaluation;
    
    if (normalizedEvaluation === "cumple") {
      const commentLower = comments.toLowerCase();
      
      // Check for non-compliance phrases in comments
      const hasFailPhrases = failPhrases.some(phrase => commentLower.includes(phrase));
      
      // Check if it mentions number of criteria met that is insufficient
      const hasCriteriaCountFailure = requiresMultipleCriteria && 
        (commentLower.includes("solo cumplió con 1") || 
         commentLower.includes("solo cumplió con 2") ||
         commentLower.includes("cumplió únicamente con 1") ||
         commentLower.includes("cumplió únicamente con 2") ||
         commentLower.includes("solamente cumplió con 1") ||
         commentLower.includes("solamente cumplió con 2") ||
         commentLower.includes("sólo cumplió 1") ||
         commentLower.includes("sólo cumplió 2"));
         
      if (hasFailPhrases || hasCriteriaCountFailure) {
        console.log(`Correcting evaluation for ${behaviorName}: OpenAI said "cumple" but comments indicate "no cumple"`);
        correctedEvaluation = "no cumple";
      }
    }
    
    console.log(`Final evaluation for ${behaviorName}: ${correctedEvaluation} (original: ${normalizedEvaluation})`);
    
    return {
      evaluation: correctedEvaluation,
      comments: parsedResult.comments
    };
  } catch (error) {
    console.error(`Error parsing result for behavior ${behaviorName}:`, error);
    
    // Return fallback result
    return {
      evaluation: "no cumple",
      comments: "No se pudo analizar automáticamente este comportamiento"
    };
  }
}

// Function to analyze behaviors with OpenAI
export async function analyzeBehaviors(call: any, behaviors: any[]) {
  // Check if OpenAI API key is configured
  if (!openAiKey) {
    throw new Error("API key de OpenAI no configurada");
  }

  const behaviorsAnalysis = [];

  // Analyze each behavior with OpenAI
  for (const behavior of behaviors) {
    try {
      console.log(`Analyzing behavior: ${behavior.id} - ${behavior.name} - active: ${behavior.is_active}`);
      
      // Create prompt for OpenAI
      const prompt = `
Basado en la siguiente transcripción de una llamada telefónica, evalúa si el asesor cumple o no cumple con este comportamiento:

COMPORTAMIENTO A EVALUAR: ${behavior.name}
DESCRIPCIÓN: ${behavior.description || ""}
CRITERIO DE EVALUACIÓN: ${behavior.prompt || ""}

TRANSCRIPCIÓN DE LA LLAMADA:
${call.transcription}

IMPORTANTE: Lee muy cuidadosamente el criterio de evaluación y la descripción del comportamiento. Si el comportamiento menciona que deben cumplirse varios criterios o pautas (por ejemplo, "debe cumplir con al menos 3 de 4 criterios"), asegúrate de evaluar cada uno individualmente antes de determinar si CUMPLE o NO CUMPLE.

Por ejemplo, si el criterio menciona que el asesor debe cumplir con 3 de 4 elementos y solo cumple con 1 o 2, entonces la evaluación debe ser "no cumple".

Tu respuesta debe seguir EXACTAMENTE este formato JSON:
{
  "evaluation": "cumple" O "no cumple",
  "comments": "Explicación detallada de por qué cumple o no cumple, mencionando específicamente qué criterios se cumplieron y cuáles no."
}
`;

      // Call OpenAI for evaluation
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Eres un experto en calidad de llamadas telefónicas de servicio al cliente. Tu trabajo es evaluar rigurosamente si un asesor cumple o no con ciertos comportamientos esperados. Eres muy estricto en tus evaluaciones y sigues al pie de la letra los criterios especificados.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.choices[0].message.content;
      
      console.log(`OpenAI raw result for ${behavior.name}:`, result);
      
      // Process and validate the evaluation
      const processedResult = processEvaluation(behavior.name, result, behavior);
      
      // Add to analysis
      behaviorsAnalysis.push({
        name: behavior.name,
        evaluation: processedResult.evaluation,
        comments: processedResult.comments
      });
      
    } catch (error) {
      console.error(`Error analyzing behavior ${behavior.name}:`, error);
      
      // Add fallback result in case of error
      behaviorsAnalysis.push({
        name: behavior.name,
        evaluation: "no cumple",
        comments: "Error al analizar este comportamiento: " + error.message
      });
    }
  }

  return behaviorsAnalysis;
}
