
// Feedback generation utilities

// Function to generate improvement opportunities based on behavior analysis
export const generateOpportunities = (behaviorsAnalysis: any[]) => {
  const notMet = behaviorsAnalysis.filter(b => b.evaluation === "no cumple");
  
  if (notMet.length === 0) return ["No se identificaron oportunidades de mejora significativas"];
  
  return notMet.map(b => {
    // Extract keywords and generate specific suggestions
    const behavior = b.name.toLowerCase();
    if (behavior.includes("saludo")) {
      return "Mejorar el saludo inicial y presentación";
    } else if (behavior.includes("escucha") || behavior.includes("atención")) {
      return "Mejorar técnicas de escucha activa";
    } else if (behavior.includes("preguntas") || behavior.includes("indaga")) {
      return "Implementar preguntas para indagar necesidades";
    } else if (behavior.includes("soluciones") || behavior.includes("alternativas")) {
      return "Ofrecer soluciones alternativas";
    } else if (behavior.includes("cierre")) {
      return "Mejorar el cierre de la llamada";
    } else if (behavior.includes("objeciones")) {
      return "Capacitación en manejo de objeciones";
    }
    
    // If no specific match, return a general suggestion based on the behavior
    return `Mejorar en: ${b.name}`;
  });
};

// Function to generate positive aspects based on behavior analysis
export const generatePositives = (behaviorsAnalysis: any[], score: number) => {
  const met = behaviorsAnalysis.filter(b => b.evaluation === "cumple");
  
  if (met.length === 0) {
    return ["Se identificaron oportunidades de mejora"];
  }
  
  // Always generate some positive aspects, even if score is low
  const commonPositives = [
    "El agente mantuvo un tono profesional",
    "Se identificó correctamente",
    "Intentó comprender la necesidad del cliente",
    "Proporcionó algún tipo de solución",
    "Mantuvo la conversación cordial"
  ];
  
  // If score is good, generate more specific positive aspects
  if (score > 70) {
    return met.map(b => {
      const behavior = b.name.toLowerCase();
      if (behavior.includes("saludo")) {
        return "Excelente presentación y bienvenida";
      } else if (behavior.includes("escucha")) {
        return "Demostró escucha activa y empática";
      } else if (behavior.includes("solución")) {
        return "Ofreció soluciones efectivas y personalizadas";
      } else if (behavior.includes("cierre")) {
        return "Realizó un cierre profesional y completo";
      } else if (behavior.includes("objeciones")) {
        return "Manejó las objeciones eficazmente";
      }
      
      return `Cumplió con: ${b.name}`;
    });
  }
  
  return commonPositives.slice(0, Math.min(5, met.length + 2));
};
