
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
              
              // Make sure feedback exists and has a score
              const feedback = call.feedback as CallFeedback | null;
              if (feedback?.score) {
                agents[call.agent_id].totalScore += feedback.score;
              }
            }
            
            // Extract feedback data correctly - fixing the TypeScript error
            if (call.feedback) {
              // First make sure it's not an array by checking if it exists
              const feedbackItem = call.feedback as unknown as CallFeedback;
              
              // Now safely access the properties
              if (feedbackItem.positive) {
                positiveFindings.push(...feedbackItem.positive);
              }
              if (feedbackItem.negative) {
                negativeFindings.push(...feedbackItem.negative);
              }
              if (feedbackItem.opportunities) {
                opportunities.push(...feedbackItem.opportunities);
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
