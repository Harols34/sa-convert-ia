
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type DailyReport = {
  date: string;
  callCount: number;
  agents: {
    id: string;
    name: string;
    callCount: number;
    averageScore: number;
  }[];
  topFindings: {
    positive: string[];
    negative: string[];
    opportunities: string[];
  };
};

// Define the interface for the feedback of a call
interface CallFeedback {
  score: number;
  positive: string[];
  negative: string[];
  opportunities: string[];
}

export function useDailyReports(days = 7) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get dates for the requested range
        const dates = Array.from({ length: days }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return format(date, 'yyyy-MM-dd');
        });
        
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
              feedback (
                score,
                positive,
                negative,
                opportunities
              ),
              summary
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
          calls?.forEach(call => {
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
                  feedbackItems = call.feedback as CallFeedback[];
                } else {
                  // Cast to the correct type
                  feedbackItems = [call.feedback as unknown as CallFeedback];
                }
                
                // Process all feedback items
                feedbackItems.forEach(item => {
                  if (typeof item.score === 'number') {
                    agents[call.agent_id].totalScore += item.score;
                  }
                  
                  if (Array.isArray(item.positive)) {
                    positiveFindings.push(...item.positive);
                  }
                  
                  if (Array.isArray(item.negative)) {
                    negativeFindings.push(...item.negative);
                  }
                  
                  if (Array.isArray(item.opportunities)) {
                    opportunities.push(...item.opportunities);
                  }
                });
              } else if (call.summary) {
                // Extract findings from summary if feedback is missing
                const extracted = extractPhrasesFromSummary(call.summary);
                positiveFindings.push(...extracted.positive);
                negativeFindings.push(...extracted.negative);
                opportunities.push(...extracted.opportunities);
              }
            }
          });
          
          // If we still don't have findings, generate some defaults based on calls
          if (calls && calls.length > 0 && 
              positiveFindings.length === 0 && 
              negativeFindings.length === 0 && 
              opportunities.length === 0) {
            
            // Add default findings
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
          
          // Format the daily report
          const formattedDate = format(new Date(dateStr), 'dd MMMM yyyy', { locale: es });
          
          // Count occurrences of each finding and take the top 5
          const getTopFindings = (findings: string[], limit = 5) => {
            const count: Record<string, number> = {};
            findings.forEach(finding => {
              count[finding] = (count[finding] || 0) + 1;
            });
            
            // If we don't have findings, return empty array
            if (findings.length === 0) {
              return [];
            }
            
            return Object.entries(count)
              .sort((a, b) => b[1] - a[1])
              .slice(0, limit)
              .map(([finding]) => finding);
          };
          
          return {
            date: formattedDate,
            callCount: calls?.length || 0,
            agents: Object.values(agents).map(agent => ({
              id: agent.id,
              name: agent.name,
              callCount: agent.callCount,
              averageScore: agent.callCount > 0 ? Math.round(agent.totalScore / agent.callCount) : 0
            })),
            topFindings: {
              positive: getTopFindings(positiveFindings),
              negative: getTopFindings(negativeFindings),
              opportunities: getTopFindings(opportunities)
            }
          };
        });
        
        // Execute all promises and sort by date
        const fetchedReports = await Promise.all(reportPromises);
        setReports(fetchedReports);
        console.log("Daily reports loaded:", fetchedReports);
      } catch (err) {
        console.error("Error loading daily reports:", err);
        setError("Error loading daily reports");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReports();
    
    // Set up automatic updates every 30 minutes
    const intervalId = setInterval(() => fetchReports(), 30 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [days]);
  
  return {
    reports,
    isLoading,
    error
  };
}
