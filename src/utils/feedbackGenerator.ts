
// Local utility to generate feedback for daily and global reports

// Function to generate insights for daily reports
export const generateDailyInsights = (report: any): string[] => {
  if (!report || !report.callCount || report.callCount === 0) {
    return ["No hay datos disponibles para este día."];
  }
  
  const insights = [];
  
  // Insight about call volume
  if (report.callCount === 1) {
    insights.push(`Se procesó 1 llamada en esta fecha.`);
  } else {
    insights.push(`Se procesaron ${report.callCount} llamadas en esta fecha.`);
  }
  
  // Insight about quality
  if (report.averageScore > 85) {
    insights.push(`Excelente calidad de atención con score promedio de ${report.averageScore}%.`);
  } else if (report.averageScore > 70) {
    insights.push(`Buena calidad de atención con score promedio de ${report.averageScore}%.`);
  } else if (report.averageScore > 50) {
    insights.push(`Calidad de atención aceptable con score promedio de ${report.averageScore}%.`);
  } else {
    insights.push(`Calidad de atención por debajo del estándar con score promedio de ${report.averageScore}%.`);
  }
  
  // Insight about featured agents
  if (report.agents && report.agents.length > 0) {
    const topAgent = report.agents.sort((a, b) => b.averageScore - a.averageScore)[0];
    insights.push(`Agente destacado: ${topAgent.name} con score ${topAgent.averageScore}%.`);
  }
  
  return insights;
};

// Function to generate global analysis
export const generateGlobalAnalysis = (reports: any[], timeRange: number): string => {
  if (!reports || reports.length === 0) return "";
  
  const totalCalls = reports.reduce((sum, report) => sum + (report.callCount || 0), 0);
  const avgScore = Math.round(reports.reduce((sum, report) => sum + (report.averageScore || 0), 0) / reports.length);
  
  // Determine time period for the message
  let periodText = "";
  switch (timeRange) {
    case 7: periodText = "la última semana"; break;
    case 15: periodText = "los últimos 15 días"; break;
    case 30: periodText = "el último mes"; break;
    case 90: periodText = "los últimos 3 meses"; break;
    default: periodText = "el período seleccionado";
  }

  // Analyze trends
  let trendAnalysis = "";
  if (reports.length > 1) {
    const firstReport = reports[reports.length - 1];
    const lastReport = reports[0];
    const scoreDiff = lastReport.averageScore - firstReport.averageScore;
    
    if (scoreDiff > 5) {
      trendAnalysis = `Tendencia positiva con mejora de ${scoreDiff.toFixed(1)}% en la calidad de atención durante ${periodText}.`;
    } else if (scoreDiff < -5) {
      trendAnalysis = `Tendencia negativa con caída de ${Math.abs(scoreDiff).toFixed(1)}% en la calidad de atención durante ${periodText}.`;
    } else {
      trendAnalysis = `Rendimiento estable en la calidad de atención durante ${periodText}.`;
    }
  }

  // Collect all unique positive and negative findings
  const allPositives = new Set();
  const allNegatives = new Set();
  
  reports.forEach(report => {
    if (report.findings?.positive) {
      report.findings.positive.forEach(finding => allPositives.add(finding));
    }
    if (report.topFindings?.positive) {
      report.topFindings.positive.forEach(finding => allPositives.add(finding));
    }
    if (report.findings?.negative) {
      report.findings.negative.forEach(finding => allNegatives.add(finding));
    }
    if (report.topFindings?.negative) {
      report.topFindings.negative.forEach(finding => allNegatives.add(finding));
    }
  });

  // Generate personalized summary
  return `
Durante ${periodText}, se han analizado ${totalCalls} llamadas con un promedio de calidad del ${avgScore}%. 

${trendAnalysis}

${allPositives.size > 0 ? "Destacan como aspectos positivos: " + Array.from(allPositives).slice(0, 3).join(", ") + "." : ""}

${allNegatives.size > 0 ? "Se identifican como áreas de mejora: " + Array.from(allNegatives).slice(0, 3).join(", ") + "." : ""}

Recomendaciones: Enfocarse en mantener los aspectos positivos mientras se trabajan las áreas de oportunidad identificadas.
`.trim();
};
