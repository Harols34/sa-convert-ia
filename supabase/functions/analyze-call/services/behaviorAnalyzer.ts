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
      
      // Extract transcription text with proper speaker labeling
      let readableTranscript = "";
      try {
        if (call.transcription) {
          const segments = typeof call.transcription === 'string' 
            ? JSON.parse(call.transcription) 
            : call.transcription;
          
          if (Array.isArray(segments)) {
            readableTranscript = segments.map(segment => {
              const speaker = segment.speaker || "Desconocido";
              return `${speaker}: ${segment.text || ""}`;
            }).join("\n\n");
          } else {
            readableTranscript = call.transcription;
          }
        }
      } catch (parseError) {
        console.error("Error parsing transcription:", parseError);
        readableTranscript = typeof call.transcription === 'string' 
          ? call.transcription 
          : JSON.stringify(call.transcription);
      }
      
      // Create prompt for OpenAI - optimized for lower token usage
      const prompt = `
Evalúa el siguiente comportamiento del asesor basado en la transcripción proporcionada:

COMPORTAMIENTO: ${behavior.name}
DESCRIPCIÓN: ${behavior.description || ""}
CRITERIO: ${behavior.prompt || ""}

TRANSCRIPCIÓN:
${readableTranscript}

Tu respuesta debe ser un objeto JSON con estos campos:
{"evaluation": "cumple" o "no cumple", "comments": "explicación detallada"}
`;

      // Ensure transcription is not too long - truncate if needed
      const maxPromptLength = 12000; // Setting a smaller limit to save tokens
      let finalPrompt = prompt;
      if (finalPrompt.length > maxPromptLength) {
        console.log(`Prompt is too long (${finalPrompt.length} chars), truncating...`);
        
        // Find the index where the transcription starts
        const transcriptionStartIndex = finalPrompt.indexOf('TRANSCRIPCIÓN:');
        if (transcriptionStartIndex !== -1) {
          // Calculate how much transcription we can keep
          const beforeTranscription = finalPrompt.substring(0, transcriptionStartIndex + 'TRANSCRIPCIÓN:'.length);
          const afterTranscriptionIndex = finalPrompt.indexOf('Tu respuesta debe ser', transcriptionStartIndex);
          const afterTranscription = afterTranscriptionIndex !== -1 ? 
            finalPrompt.substring(afterTranscriptionIndex) : 
            "\n\nTu respuesta debe ser un objeto JSON..."; // Fallback
          
          // Calculate available space for transcription
          const availableSpace = maxPromptLength - beforeTranscription.length - afterTranscription.length - 100; // Extra buffer
          
          // Extract and truncate transcription
          const truncatedTranscription = readableTranscript.substring(0, availableSpace) + 
            "\n\n[Transcripción truncada para reducir uso de tokens]";
          
          // Reassemble prompt
          finalPrompt = beforeTranscription + "\n" + truncatedTranscription + "\n\n" + afterTranscription;
          console.log(`Truncated prompt to ${finalPrompt.length} chars to reducir costos`);
        }
      }

      try {
        // Call OpenAI for evaluation with improved error handling
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Cambio a modelo más económico
            messages: [
              { 
                role: 'system', 
                content: 'Evalúa rigurosamente si un asesor cumple o no con comportamientos específicos basado en una transcripción. Sé estricto y sigue al pie de la letra los criterios.' 
              },
              { role: 'user', content: finalPrompt }
            ],
            temperature: 0.3,
            max_tokens: 600, // Reducido para ahorrar tokens
          }),
        });

        if (!response.ok) {
          const errorDetail = await response.text();
          console.error(`OpenAI API error details: ${errorDetail}`);
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error("Respuesta inesperada de OpenAI: no se encontró el contenido esperado");
        }
        
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
      } catch (apiError) {
        console.error(`API error analyzing behavior ${behavior.name}:`, apiError);
        
        // Retry once with even more simplified prompt if there's an error
        try {
          console.log(`Retrying behavior ${behavior.name} with simplified prompt...`);
          
          const simplifiedPrompt = `
Evalúa si el asesor cumple o no con este comportamiento:
${behavior.name}: ${behavior.prompt}

Transcripción resumida:
${readableTranscript.substring(0, 5000)}

Responde con JSON: {"evaluation": "cumple" o "no cumple", "comments": "explicación"}
`;

          const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo', // Modelo aún más económico para el reintento
              messages: [
                { role: 'user', content: simplifiedPrompt }
              ],
              temperature: 0.2,
              max_tokens: 400,
            }),
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Retry failed: ${retryResponse.status}`);
          }
          
          const retryData = await retryResponse.json();
          const retryResult = retryData.choices[0].message.content;
          const processedRetryResult = processEvaluation(behavior.name, retryResult, behavior);
          
          behaviorsAnalysis.push({
            name: behavior.name,
            evaluation: processedRetryResult.evaluation,
            comments: processedRetryResult.comments + " (análisis simplificado por limitaciones técnicas)"
          });
          
        } catch (retryError) {
          console.error(`Retry also failed for behavior ${behavior.name}:`, retryError);
          
          // Add fallback result for API errors
          behaviorsAnalysis.push({
            name: behavior.name,
            evaluation: "no cumple",
            comments: `Error al analizar este comportamiento: ${apiError.message}`
          });
        }
      }
      
    } catch (error) {
      console.error(`General error analyzing behavior ${behavior.name}:`, error);
      
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
