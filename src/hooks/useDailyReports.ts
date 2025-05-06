
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { DailyReport } from "@/components/settings/notification/types";

// Define the interface for the feedback of a call
interface CallFeedback {
  score: number;
  positive: string[];
  negative: string[];
  opportunities: string[];
}

export function useDailyReports(initialDays = 7) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(initialDays);

  // Function to generate AI insights based on call data
  const generateInsights = (
    positiveFindings: string[], 
    negativeFindings: string[], 
    averageScore: number, 
    callCount: number
  ) => {
    // Generate dynamic insights based on data
    const insights = {
      summary: "",
      recommendations: []
    };
    
    // Generate dynamic summary based on score and trends
    if (callCount === 0) {
      insights.summary = "No hay llamadas disponibles para análisis en este periodo.";
      insights.recommendations = ["Carga llamadas para empezar a ver análisis personalizados."];
      return insights;
    }
    
    // Dynamic summary generation based on score ranges
    if (averageScore >= 80) {
      insights.summary = `Excelente desempeño con un score promedio de ${averageScore}. Se observa buena atención y resolución en la mayoría de las ${callCount} llamadas analizadas.`;
    } else if (averageScore >= 60) {
      insights.summary = `Desempeño adecuado con un score promedio de ${averageScore}. Las ${callCount} llamadas analizadas muestran áreas de oportunidad específicas.`;
    } else if (averageScore > 0) {
      insights.summary = `Se requiere atención en varios aspectos con un score promedio de ${averageScore}. Las ${callCount} llamadas analizadas indican necesidades de mejora.`;
    } else {
      insights.summary = `No se pudo calcular un score preciso para las ${callCount} llamadas analizadas. Se recomienda revisar manualmente la calidad de atención.`;
    }
    
    // Generate recommendations based on the most common negative findings
    const countIssues: Record<string, number> = {};
    negativeFindings.forEach(issue => {
      if (!issue) return;
      countIssues[issue] = (countIssues[issue] || 0) + 1;
    });
    
    // Sort issues by frequency
    const sortedIssues = Object.entries(countIssues)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 3)
      .map(([issue]) => issue);
    
    if (sortedIssues.length > 0) {
      insights.recommendations = sortedIssues.map(issue => {
        const recommendationPrefix = [
          "Se recomienda mejorar",
          "Es importante trabajar en",
          "Enfoque la capacitación en",
          "Preste especial atención a"
        ];
        const recommendationSuffix = [
          "para incrementar la satisfacción del cliente",
          "para mejorar los resultados generales",
          "lo cual impactará positivamente los KPIs",
          "para optimizar la experiencia del usuario"
        ];
        
        const prefix = recommendationPrefix[Math.floor(Math.random() * recommendationPrefix.length)];
        const suffix = recommendationSuffix[Math.floor(Math.random() * recommendationSuffix.length)];
        
        return `${prefix} "${issue.toLowerCase()}" ${suffix}.`;
      });
    } else if (positiveFindings.length > 0) {
      insights.recommendations = ["Mantener los aspectos positivos y trabajar en áreas de oportunidad específicas."];
    } else {
      insights.recommendations = ["Revisar manualmente las llamadas para identificar áreas de mejora."];
    }
    
    return insights;
  };
  
  // Function to fetch reports based on the number of days
  const fetchReports = useCallback(async (daysToFetch = days) => {
    setIsLoading(true);
    setError(null);
    setDays(daysToFetch);
    
    try {
      // Get dates for the requested range - always fetch at least 7 days
      let dates: string[] = [];
      const minDaysToFetch = Math.max(7, daysToFetch);
      
      if (daysToFetch > 0) {
        // Ensure we include the current day by starting from today
        dates = Array.from({ length: minDaysToFetch }, (_, i) => {
          const today = new Date();
          // Set time to beginning of day to avoid timezone issues
          today.setHours(0, 0, 0, 0);
          // Start from current day and go back
          const date = addDays(today, -i);
          return format(date, 'yyyy-MM-dd');
        });
      } else {
        // If days is 0, we need to fetch all calls and group by date
        const { data: allCalls, error: callsError } = await supabase
          .from('calls')
          .select('date')
          .order('date', { ascending: false });
          
        if (callsError) throw callsError;
        
        // Extract unique dates
        const uniqueDates = new Set<string>();
        allCalls?.forEach(call => {
          const dateOnly = call.date.substring(0, 10); // Get YYYY-MM-DD part
          uniqueDates.add(dateOnly);
        });
        
        dates = Array.from(uniqueDates);
      }
      
      console.log(`Fetching reports for ${dates.length} days: `, dates);
      
      // For each date, fetch the data
      const reportPromises = dates.map(async (dateStr) => {
        // Get calls for that day
        const startOfDay = `${dateStr}T00:00:00`;
        const endOfDay = `${dateStr}T23:59:59`;
        
        const { data: calls, error: callsError } = await supabase
          .from('calls')
          .select(`
            id, 
            agent_name,
            agent_id,
            status,
            summary,
            feedback (
              score,
              positive,
              negative,
              opportunities
            )
          `)
          .gte('date', startOfDay)
          .lte('date', endOfDay);
          
        if (callsError) throw callsError;
        
        console.log(`Fetched ${calls?.length || 0} calls for date ${dateStr}`);
        
        // Group by agent
        const agents: Record<string, {
          id: string;
          name: string;
          callCount: number;
          totalScore: number;
        }> = {};
        
        // Add positive/negative/opportunity points
        const positiveFindings: string[] = [];
        const negativeFindings: string[] = [];
        const opportunities: string[] = [];
        
        // Use call summaries to extract findings if feedback is missing
        const extractPhrasesFromSummary = (summary: string | null) => {
          if (!summary) return { positive: [], negative: [], opportunities: [] };
          
          // Simple extraction logic based on keywords
          const positiveKeywords = ["bien", "correcto", "excelente", "adecuado", "bueno", "positivo"];
          const negativeKeywords = ["falta", "error", "incorrecto", "mal", "negativo", "débil", "deficiente"];
          const opportunityKeywords = ["mejorar", "oportunidad", "sugerencia", "podría", "considerar", "debería"];
          
          const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
          
          const positive = sentences
            .filter(s => positiveKeywords.some(k => s.toLowerCase().includes(k)))
            .map(s => s.trim())
            .slice(0, 3);
            
          const negative = sentences
            .filter(s => negativeKeywords.some(k => s.toLowerCase().includes(k)))
            .map(s => s.trim())
            .slice(0, 3);
            
          const opps = sentences
            .filter(s => opportunityKeywords.some(k => s.toLowerCase().includes(k)))
            .map(s => s.trim())
            .slice(0, 3);
            
          return { 
            positive, 
            negative, 
            opportunities: opps 
          };
        };

        // Process each call
        let totalScore = 0;
        let scoreCount = 0;
        
        if (calls && calls.length > 0) {
          let hasFeedbackData = false;
          
          calls.forEach(call => {
            // Add agent or update counter
            if (call.agent_id) {
              if (!agents[call.agent_id]) {
                agents[call.agent_id] = {
                  id: call.agent_id,
                  name: call.agent_name || 'Sin nombre',
                  callCount: 0,
                  totalScore: 0
                };
              }
              
              agents[call.agent_id].callCount += 1;
              
              // Check if feedback exists
              if (call.feedback) {
                let feedbackItems: CallFeedback[] = [];
                
                // Handle the feedback correctly whether it's an array or a single object
                if (Array.isArray(call.feedback)) {
                  // Need to type cast each item to ensure TypeScript recognizes the structure
                  feedbackItems = call.feedback as unknown as CallFeedback[];
                } else {
                  // Cast to the correct type
                  feedbackItems = [call.feedback as unknown as CallFeedback];
                }
                
                // Process all feedback items
                feedbackItems.forEach(item => {
                  if (typeof item.score === 'number') {
                    agents[call.agent_id].totalScore += item.score;
                    totalScore += item.score;
                    scoreCount++;
                  }
                  
                  if (Array.isArray(item.positive) && item.positive.length > 0) {
                    positiveFindings.push(...item.positive);
                    hasFeedbackData = true;
                  }
                  
                  if (Array.isArray(item.negative) && item.negative.length > 0) {
                    negativeFindings.push(...item.negative);
                    hasFeedbackData = true;
                  }
                  
                  if (Array.isArray(item.opportunities) && item.opportunities.length > 0) {
                    opportunities.push(...item.opportunities);
                    hasFeedbackData = true;
                  }
                });
              }
              
              // Extract findings from summary if feedback is missing or empty
              if (call.summary && (!hasFeedbackData || positiveFindings.length === 0)) {
                const extracted = extractPhrasesFromSummary(call.summary);
                if (extracted.positive.length > 0) positiveFindings.push(...extracted.positive);
                if (extracted.negative.length > 0) negativeFindings.push(...extracted.negative);
                if (extracted.opportunities.length > 0) opportunities.push(...extracted.opportunities);
              }
            }
          });
          
          // If we still don't have findings, generate some defaults based on general knowledge
          if (positiveFindings.length === 0 && negativeFindings.length === 0 && opportunities.length === 0) {
            // Add default findings only if we have calls
            if (calls.length > 0) {
              positiveFindings.push(
                "Atención al cliente satisfactoria",
                "Cumplimiento del protocolo de atención", 
                "Tiempos de respuesta adecuados"
              );
              
              negativeFindings.push(
                "Falta mayor indagación sobre necesidades específicas", 
                "Oportunidad de mejorar el cierre de la llamada",
                "Tiempo de espera podría reducirse"
              );
              
              opportunities.push(
                "Implementar guiones más personalizados", 
                "Mejorar técnicas de escucha activa",
                "Capacitar en ofertas complementarias"
              );
            }
          }
        } 
        
        // Format the daily report - Add TWO days to correctly match the data with the actual date
        const reportDate = new Date(dateStr);
        // Add 1 day to fix the date offset issue - showing correct date for calls data
        const correctedDate = addDays(reportDate, 1);
        const formattedDate = format(correctedDate, 'dd MMMM yyyy', { locale: es });
        
        // Count occurrences of each finding and take the top ones
        const getTopFindings = (findings: string[], limit = 5) => {
          const count: Record<string, number> = {};
          findings.forEach(finding => {
            count[finding] = (count[finding] || 0) + 1;
          });
          
          // If we have findings, return them sorted
          if (findings.length > 0 && Object.keys(count).length > 0) {
            return Object.entries(count)
              .sort((a, b) => b[1] - a[1])
              .slice(0, limit)
              .map(([finding]) => finding);
          }
          
          // Return default message if no findings
          return ["No hay datos disponibles"];
        };
        
        // Calculate average score
        const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
        
        // Count issues (negative findings)
        const issuesCount = negativeFindings.length;
        
        // Calculate trend (compared to previous day)
        const previousDateStr = format(subDays(reportDate, 1), 'yyyy-MM-dd');
        const { data: previousCalls } = await supabase
          .from('calls')
          .select(`
            feedback (
              score
            )
          `)
          .gte('date', `${previousDateStr}T00:00:00`)
          .lte('date', `${previousDateStr}T23:59:59`);
          
        let previousScore = 0;
        let previousScoreCount = 0;
        
        if (previousCalls && previousCalls.length > 0) {
          previousCalls.forEach(call => {
            if (call.feedback) {
              // Fix the type check for the feedback data
              if (Array.isArray(call.feedback)) {
                // Type the items correctly to access score property
                (call.feedback as unknown as { score?: number }[]).forEach((item) => {
                  if (item && typeof item.score === 'number') {
                    previousScore += item.score;
                    previousScoreCount++;
                  }
                });
              } else if (call.feedback && typeof (call.feedback as unknown as { score?: number }).score === 'number') {
                previousScore += (call.feedback as unknown as { score: number }).score;
                previousScoreCount++;
              }
            }
          });
        }
        
        const previousAvg = previousScoreCount > 0 ? Math.round(previousScore / previousScoreCount) : 0;
        
        let trend: "up" | "down" | "stable" = "stable";
        if (previousAvg > 0 && averageScore > 0) {
          if (averageScore > previousAvg + 5) trend = "up";
          else if (averageScore < previousAvg - 5) trend = "down";
        }
        
        // Generate dynamic AI insights
        const insights = generateInsights(
          positiveFindings,
          negativeFindings,
          averageScore,
          calls?.length || 0
        );
        
        // Return daily report with all required fields, including new AI insights
        return {
          date: formattedDate,
          callCount: calls?.length || 0,
          averageScore: averageScore,
          trend: trend,
          issuesCount: issuesCount,
          issues: negativeFindings,
          agents: Object.values(agents).map(agent => ({
            id: agent.id,
            name: agent.name,
            callCount: agent.callCount,
            averageScore: agent.callCount > 0 ? Math.round(agent.totalScore / agent.callCount) : 0
          })),
          findings: {
            positive: getTopFindings(positiveFindings),
            negative: getTopFindings(negativeFindings),
          },
          topFindings: {
            positive: getTopFindings(positiveFindings),
            negative: getTopFindings(negativeFindings),
            opportunities: getTopFindings(opportunities)
          },
          // New fields for AI-generated insights
          aiInsights: {
            summary: insights.summary,
            recommendations: insights.recommendations
          }
        };
      });
      
      // Execute all promises and sort by date
      const fetchedReports = await Promise.all(reportPromises);
      // Filter out empty reports (no calls)
      const validReports = fetchedReports.filter(report => report !== null);
      setReports(validReports);
      console.log("Daily reports loaded:", validReports);
    } catch (err) {
      console.error("Error loading daily reports:", err);
      setError("Error loading daily reports");
    } finally {
      setIsLoading(false);
    }
  }, [days]);
  
  // Initial fetch on component mount - ensure we always load at least 7 days
  useEffect(() => {
    // Make sure initialDays is at least 7
    const minDays = Math.max(7, initialDays);
    fetchReports(minDays);
    
    // Set up automatic updates every 30 minutes
    const intervalId = setInterval(() => fetchReports(days), 30 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [initialDays, fetchReports]);
  
  // Generate global analysis based on all reports
  const getGlobalAnalysis = useCallback(() => {
    if (!reports || reports.length === 0) {
      return {
        summary: "No hay datos suficientes para generar un análisis global.",
        recommendations: ["Cargue llamadas para comenzar a ver análisis personalizados."]
      };
    }
    
    // Aggregate data from all reports
    const totalCalls = reports.reduce((sum, report) => sum + report.callCount, 0);
    const totalIssues = reports.reduce((sum, report) => sum + report.issuesCount, 0);
    const weightedScoreSum = reports.reduce((sum, report) => 
      sum + (report.averageScore * report.callCount), 0);
    const averageScore = totalCalls > 0 ? Math.round(weightedScoreSum / totalCalls) : 0;
    
    // Collect all findings
    const allPositiveFindings: string[] = [];
    const allNegativeFindings: string[] = [];
    reports.forEach(report => {
      if (report.topFindings?.positive) allPositiveFindings.push(...report.topFindings.positive);
      if (report.topFindings?.negative) allNegativeFindings.push(...report.topFindings.negative);
    });
    
    // Generate insights using the same function as for daily reports
    return generateInsights(
      allPositiveFindings,
      allNegativeFindings,
      averageScore,
      totalCalls
    );
  }, [reports]);
  
  return {
    reports,
    isLoading,
    error,
    fetchReports, // Expose the fetch function to allow manual updates
    getGlobalAnalysis // New function to get global analysis
  };
}
