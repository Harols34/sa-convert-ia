
import OpenAI from "https://esm.sh/openai@4.28.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * Generates feedback for the call using OpenAI with enhanced contextualization
 */
export async function generateFeedback(openai: OpenAI, transcription: any[]) {
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
    
    // Fetch active feedback prompt
    const { data: activePrompt, error: promptError } = await supabase
      .from('prompts')
      .select('content')
      .eq('type', 'feedback')
      .eq('active', true)
      .maybeSingle();
    
    // Fetch recent calls to provide context for quality trends
    const { data: recentCalls, error: callsError } = await supabase
      .from('calls')
      .select('id, summary, status, date')
      .order('date', { ascending: false })
      .limit(10);
      
    // Get recent feedback patterns to avoid repetition and identify trends
    const { data: recentFeedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('positive, negative, opportunities')
      .order('created_at', { ascending: false })
      .limit(10);
      
    // Extract recent patterns to help AI avoid repetition
    let recentPatterns = {
      positive: new Set<string>(),
      negative: new Set<string>(),
      opportunities: new Set<string>()
    };
    
    if (recentFeedback && recentFeedback.length > 0) {
      recentFeedback.forEach(feedback => {
        if (feedback.positive) feedback.positive.forEach(item => recentPatterns.positive.add(item));
        if (feedback.negative) feedback.negative.forEach(item => recentPatterns.negative.add(item));
        if (feedback.opportunities) feedback.opportunities.forEach(item => recentPatterns.opportunities.add(item));
      });
    }
    
    // Default prompt if none is found in database
    const defaultPrompt = `Eres un experto en análisis de llamadas de servicio al cliente y ventas con amplia experiencia en coaching de agentes.
    
    Analiza la siguiente transcripción de una llamada y proporciona retroalimentación constructiva, específica y personalizada sobre:

    1. Calidad de atención y servicio al cliente
    2. Habilidades de comunicación del agente
    3. Efectividad en la resolución del problema
    4. Oportunidades de mejora específicas y accionables
    5. Aspectos positivos destacables del desempeño del agente
    6. Sugerencias precisas para mejorar la experiencia del cliente
    7. Evaluación de técnicas de venta (cuando aplique)
    
    MUY IMPORTANTE:
    
    - Evita lenguaje genérico y frases cliché
    - Proporciona retroalimentación específica basada en el contenido real de la conversación
    - Identifica momentos específicos de la llamada para fundamentar tus observaciones
    - Adapta tu análisis al contexto específico y tipo de llamada (ventas, soporte, consulta)
    - Personaliza el feedback considerando el nivel de experiencia aparente del agente
    - Usa ejemplos concretos de la conversación para ilustrar puntos fuertes y áreas de mejora
    - Prioriza 2-3 aspectos críticos para mejora en lugar de una lista genérica
    - Evita repetir formulaciones usadas en análisis previos
    
    Estructura tu respuesta en formato Markdown con secciones claras y puntos accionables específicos.`;
    
    // Additional context about previous analyses to avoid repetition
    const repetitionContext = `
    IMPORTANTE - PATRONES DE RETROALIMENTACIÓN RECIENTES A EVITAR:
    Los siguientes patrones se han utilizado frecuentemente en análisis previos y deben ser evitados para proporcionar feedback fresco y específico:
    
    Aspectos positivos frecuentes: ${Array.from(recentPatterns.positive).join(', ')}
    Aspectos negativos frecuentes: ${Array.from(recentPatterns.negative).join(', ')}
    Recomendaciones frecuentes: ${Array.from(recentPatterns.opportunities).join(', ')}
    
    Tu análisis debe ser completamente personalizado para esta llamada específica, evitando estas frases genéricas.
    `;
    
    // Use active prompt from database if available, otherwise use default with anti-repetition context
    const systemContent = (activePrompt?.content) ? 
      `${activePrompt.content}\n\n${repetitionContext}` : 
      `${defaultPrompt}\n\n${repetitionContext}`;
    
    // Generate feedback using OpenAI with enhanced parameters
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: `Analiza y proporciona retroalimentación detallada y específica para la siguiente transcripción de una llamada:\n\n${transcriptionText}`
        }
      ],
      temperature: 0.8, // Increased for more creative/varied responses
      frequency_penalty: 1.2, // Discourage repetition
      presence_penalty: 1.0, // Encourage new topics
    });
    
    const feedbackText = response.choices[0].message.content || "";
    console.log("Feedback generado por OpenAI");
    
    return parseFeedback(feedbackText, transcription[0]?.call_id || "");
  } catch (error) {
    console.error("Error al generar retroalimentación:", error);
    
    // Get the call ID
    let callId = "";
    if (Array.isArray(transcription) && transcription.length > 0) {
      callId = transcription[0]?.call_id || "";
    }
    
    // Return default feedback in case of error - more varied than previous version
    return {
      feedback: {
        call_id: callId,
        score: 50,
        positive: [
          "Se identificó y saludó al cliente según protocolo",
          "Mantuvo la comunicación durante toda la interacción",
          "Proporcionó alguna información relevante para la consulta",
          "Mostró voluntad de ayudar durante el contacto",
          "Finalizó la llamada de manera cortés"
        ],
        negative: [
          "Análisis limitado por problemas en el procesamiento",
          "No se pudo evaluar completamente la calidad técnica",
          "Posible pérdida de detalles importantes del desempeño",
          "No fue posible medir aplicación de protocolos avanzados",
          "Evaluación incompleta de técnicas de comunicación"
        ],
        opportunities: [
          "Solicitar revisión manual específica para esta llamada",
          "Verificar la calidad del audio para análisis futuro",
          "Considerar reanalizar después de resolver problemas técnicos",
          "Revisar manualmente aplicación de protocolos estándar",
          "Analizar gestor de comunicación para prevenir fallas"
        ]
      },
      result: "",
      product: "",
      reason: ""
    };
  }
}

/**
 * Parse the feedback text from OpenAI into structured format with enhanced accuracy
 */
function parseFeedback(feedbackText: string, callId: string) {
  // Parse the generated feedback with improved pattern matching
  let score = 50; // Default value
  const scoreRegex = /(?:puntuaci[oó]n|calificaci[oó]n|evaluaci[oó]n|puntaje).*?(\d+)/i;
  const scoreMatch = feedbackText.match(scoreRegex);
  
  if (scoreMatch && scoreMatch[1]) {
    score = parseInt(scoreMatch[1]);
    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));
  } else {
    // Alternative scoring based on sentiment analysis if no explicit score
    const positiveTerms = [
      "excelente", "sobresaliente", "destacado", "excepcional",
      "efectivo", "eficaz", "adecuado", "satisfactorio", "bueno"
    ];
    
    const negativeTerms = [
      "deficiente", "pobre", "inadecuado", "insatisfactorio", "malo",
      "débil", "mejorable", "insuficiente", "fallas", "errores"
    ];
    
    // Count occurrences of positive and negative terms
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveTerms.forEach(term => {
      const regex = new RegExp(term, 'gi');
      const matches = feedbackText.match(regex);
      if (matches) positiveCount += matches.length;
    });
    
    negativeTerms.forEach(term => {
      const regex = new RegExp(term, 'gi');
      const matches = feedbackText.match(regex);
      if (matches) negativeCount += matches.length;
    });
    
    // Calculate score based on sentiment ratio
    const total = positiveCount + negativeCount;
    if (total > 0) {
      score = Math.round(50 + (positiveCount - negativeCount) / total * 50);
      score = Math.max(0, Math.min(100, score));
    }
  }
  
  // Enhanced extraction patterns for positive aspects
  const positivePatterns = [
    /[Aa]spectos? [Pp]ositivos?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s,
    /[Ff]ortalezas?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s,
    /[Pp]untos? [Ff]uertes?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s,
    /[Dd]estaca(?:ble|do):?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s
  ];
  
  // Enhanced extraction patterns for negative aspects
  const negativePatterns = [
    /[Aa]spectos? [Nn]egativos?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s,
    /[Áá]reas? (?:de )?[Mm]ejoras?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s,
    /[Dd]ebilidades?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s,
    /[Pp]untos? [Dd]ébiles?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s
  ];
  
  // Enhanced extraction patterns for opportunities
  const opportunityPatterns = [
    /[Oo]portunidades?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s,
    /[Rr]ecomendaciones?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s,
    /[Ss]ugerencias?:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s,
    /[Aa]cciones? (?:de )?[Mm]ejora:?\s*(?:\n\s*[-\d*•]+\s*(.*?)(?=\n\s*[-\d*•]+|$))+/s
  ];
  
  // Improve pattern matching for result detection
  let result = "";
  let product = "";
  let reason = "";
  
  // More comprehensive pattern matching for results
  const ventaPatterns = [
    /(?:resultado|resultado\s+de\s+la\s+llamada|clasificación).*?(venta\b)(?!\s+no)/i,
    /(?:se\s+concretó|se\s+logró|se\s+cerró|se\s+realizó)\s+(?:una|la)?\s+venta/i,
    /(?:compra|adquisición|contratación)\s+(?:exitosa|realizada|concretada)/i,
    /(?:cliente\s+(?:aceptó|adquirió|compró))/i
  ];
  
  const noVentaPatterns = [
    /(?:resultado|resultado\s+de\s+la\s+llamada|clasificación).*?(no\s+venta)/i,
    /(?:no\s+se\s+concretó|no\s+se\s+logró|no\s+se\s+cerró)\s+(?:una|la)?\s+venta/i,
    /(?:cliente\s+(?:rechazó|declinó|no\s+aceptó))/i,
    /(?:llamada\s+informativa|solo\s+consulta|llamada\s+de\s+consulta)/i
  ];
  
  // Search for "venta" patterns more accurately
  let isVenta = false;
  for (const pattern of ventaPatterns) {
    const match = feedbackText.match(pattern);
    if (match && !feedbackText.toLowerCase().includes("no venta")) {
      isVenta = true;
      break;
    }
  }
  
  // Search for "no venta" patterns more accurately
  let isNoVenta = false;
  for (const pattern of noVentaPatterns) {
    const match = feedbackText.match(pattern);
    if (match) {
      isNoVenta = true;
      break;
    }
  }
  
  // Determine final result based on pattern matches
  if (isVenta && !isNoVenta) {
    result = "venta";
    
    // Search for product with enhanced patterns
    const productoPatterns = [
      /(?:producto|servicio|plan).*?(fijo|móvil|internet|tv|televisión|combo)/i,
      /(?:se\s+vendió|adquirió|contrató).*?(fijo|móvil|internet|tv|televisión|combo)/i,
      /(?:plan|servicio)\s+(?:de)?\s*(fijo|móvil|internet|tv|televisión|combo)/i
    ];
    
    for (const pattern of productoPatterns) {
      const match = feedbackText.match(pattern);
      if (match && match[1]) {
        const rawProduct = match[1].toLowerCase();
        
        // Normalizar el producto a las categorías requeridas
        if (rawProduct.includes("móvil") || rawProduct.includes("celular") || rawProduct.includes("telefonía móvil")) {
          product = "móvil";
          break;
        } else if (rawProduct.includes("fijo") || rawProduct.includes("internet") || rawProduct.includes("tv") || 
                  rawProduct.includes("tele") || rawProduct.includes("combo") || rawProduct.includes("hogar")) {
          product = "fijo";
          break;
        }
      }
    }
  } else {
    result = "no venta";
    
    // Search for reason with enhanced patterns
    const razonPatterns = [
      /(?:razón|motivo|causa).*?[""]([^""]{1,30})[""]|(?:razón|motivo|causa).*?:?\s*([^,.;]{1,30})[,.;]/i,
      /(?:cliente\s+(?:rechazó|declinó))\s+(?:porque|debido\s+a)\s+([^,.;]{1,30})[,.;]/i,
      /(?:no\s+se\s+concretó)\s+(?:porque|debido\s+a)\s+([^,.;]{1,30})[,.;]/i,
      /(?:obstáculo|barrera|impedimento)\s+(?:principal|):?\s*([^,.;]{1,30})[,.;]/i
    ];
    
    // Try multiple patterns to find a reason
    for (const pattern of razonPatterns) {
      const match = feedbackText.match(pattern);
      if (match) {
        reason = (match[1] || match[2] || "").trim();
        if (reason) {
          // Limit to max 4 words and capitalize first letter
          reason = reason.split(/\s+/).slice(0, 4).join(" ");
          reason = reason.charAt(0).toUpperCase() + reason.slice(1).toLowerCase();
          break;
        }
      }
    }
    
    // If no specific reason found, try to infer from context keywords
    if (!reason) {
      const reasonKeywords = {
        "precio": ["precio", "costo", "caro", "tarifa", "económico"],
        "cobertura": ["cobertura", "zona", "área", "región", "disponibilidad", "servicio"],
        "consulta": ["consulta", "información", "pregunta", "duda", "averiguar", "informativa"],
        "tiempo": ["tiempo", "espera", "plazo", "demora", "pronto", "inmediato"],
        "competencia": ["competencia", "otra empresa", "otro proveedor", "otra operadora", "compañía"],
        "indecisión": ["pensar", "evaluar", "comparar", "indeciso", "decidir", "luego", "después"]
      };
      
      // Search for keywords in the feedback
      const lowerFeedback = feedbackText.toLowerCase();
      let foundReason = "";
      
      for (const [key, terms] of Object.entries(reasonKeywords)) {
        for (const term of terms) {
          if (lowerFeedback.includes(term)) {
            if (key === "precio") foundReason = "Precio alto";
            else if (key === "cobertura") foundReason = "Sin cobertura";
            else if (key === "consulta") foundReason = "Solo consulta";
            else if (key === "tiempo") foundReason = "Tiempos de instalación";
            else if (key === "competencia") foundReason = "Prefiere competencia";
            else if (key === "indecisión") foundReason = "Cliente indeciso";
            break;
          }
        }
        if (foundReason) break;
      }
      
      reason = foundReason || "Cliente indeciso";
    }
  }
  
  // Helper function to extract list items with enhanced pattern matching
  const extractListItems = (text: string) => {
    if (!text) return [];
    
    // More flexible pattern to catch various list formats
    const itemsPattern = /[-\d*•★⭐✓✔]\s*(.*?)(?=\n\s*[-\d*•★⭐✓✔]|$)/g;
    const matches = Array.from(text.matchAll(itemsPattern));
    return matches
      .map(match => match[1].trim())
      .filter(Boolean)
      .map(item => item.replace(/^[:.]\s*/, '')) // Remove leading colons or periods
      .slice(0, 5); // Limit to 5 items
  };
  
  // Function to extract sections using multiple patterns
  const extractSection = (patterns: RegExp[], defaultItems: string[]) => {
    for (const pattern of patterns) {
      const match = feedbackText.match(pattern);
      if (match) {
        const items = extractListItems(match[0]);
        if (items.length > 0) {
          return items;
        }
      }
    }
    return defaultItems;
  };
  
  // Prepare feedback arrays with enhanced defaults
  const positive = extractSection(positivePatterns, [
    "El agente mantuvo un tono profesional", 
    "Se identificó correctamente según protocolo", 
    "Mostró interés en atender al cliente",
    "Proporcionó información relevante según la consulta",
    "Mantuvo trato respetuoso durante la interacción"
  ]);
  
  const negative = extractSection(negativePatterns, [
    "Oportunidad de mejorar la indagación de necesidades", 
    "Faltó verificar satisfacción del cliente con la solución", 
    "Podría mejorar las técnicas de comunicación efectiva",
    "El tiempo de respuesta podría optimizarse",
    "Faltó personalización en el enfoque de atención"
  ]);
  
  const opportunities = extractSection(opportunityPatterns, [
    "Implementar técnicas avanzadas de escucha activa", 
    "Desarrollar preguntas estratégicas para indagación efectiva", 
    "Personalizar propuestas según perfil del cliente",
    "Optimizar el cierre con verificación de satisfacción",
    "Ampliar conocimiento de soluciones alternativas"
  ]);
  
  // Feedback structure
  const feedback = {
    call_id: callId,
    score: score,
    positive: positive,
    negative: negative,
    opportunities: opportunities
  };
  
  console.log("Guardando feedback y resultados:", { feedback, result, product, reason });
  return { feedback, result, product, reason };
}

