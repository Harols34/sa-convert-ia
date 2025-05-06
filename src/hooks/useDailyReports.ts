
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
              )
            `)
            .gte('date', startOfDay)
            .lte('date', endOfDay);
            
          if (callsError) throw callsError;
          
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
              
              // Check if feedback exists and has a score
              const feedbackData = call.feedback as unknown;
              
              // Handle the feedback correctly whether it's an array or a single object
              if (Array.isArray(feedbackData) && feedbackData.length > 0) {
                // If it's an array, use the first item
                const firstFeedback = feedbackData[0];
                if (firstFeedback && typeof firstFeedback.score === 'number') {
                  agents[call.agent_id].totalScore += firstFeedback.score;
                }
                
                // Process findings
                feedbackData.forEach(item => {
                  if (item.positive && Array.isArray(item.positive)) {
                    positiveFindings.push(...item.positive);
                  }
                  if (item.negative && Array.isArray(item.negative)) {
                    negativeFindings.push(...item.negative);
                  }
                  if (item.opportunities && Array.isArray(item.opportunities)) {
                    opportunities.push(...item.opportunities);
                  }
                });
              } else if (feedbackData && typeof (feedbackData as any).score === 'number') {
                // If it's a single object
                const singleFeedback = feedbackData as CallFeedback;
                agents[call.agent_id].totalScore += singleFeedback.score;
                
                if (singleFeedback.positive) {
                  positiveFindings.push(...singleFeedback.positive);
                }
                if (singleFeedback.negative) {
                  negativeFindings.push(...singleFeedback.negative);
                }
                if (singleFeedback.opportunities) {
                  opportunities.push(...singleFeedback.opportunities);
                }
              }
            }
          });
          
          // Format the daily report
          const formattedDate = format(new Date(dateStr), 'dd MMMM yyyy', { locale: es });
          
          // Count occurrences of each finding and take the top 5
          const getTopFindings = (findings: string[], limit = 5) => {
            const count: Record<string, number> = {};
            findings.forEach(finding => {
              count[finding] = (count[finding] || 0) + 1;
            });
            
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
