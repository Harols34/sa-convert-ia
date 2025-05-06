
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

export function useDailyReports(days = 7) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Obtener fechas para el rango solicitado
        const dates = Array.from({ length: days }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return format(date, 'yyyy-MM-dd');
        });
        
        // Para cada fecha, obtener los datos
        const reportPromises = dates.map(async (dateStr) => {
          // Obtener llamadas de ese día
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
          
          // Agrupar por agente
          const agents: Record<string, {
            id: string;
            name: string;
            callCount: number;
            totalScore: number;
          }> = {};
          
          // Agregar puntos positivos/negativos/oportunidades
          const positiveFindings: string[] = [];
          const negativeFindings: string[] = [];
          const opportunities: string[] = [];
          
          calls?.forEach(call => {
            // Agregar agente o actualizar contador
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
              
              if (call.feedback?.score) {
                agents[call.agent_id].totalScore += call.feedback.score;
              }
            }
            
            // Agregar hallazgos
            if (call.feedback) {
              if (call.feedback.positive) {
                positiveFindings.push(...call.feedback.positive);
              }
              if (call.feedback.negative) {
                negativeFindings.push(...call.feedback.negative);
              }
              if (call.feedback.opportunities) {
                opportunities.push(...call.feedback.opportunities);
              }
            }
          });
          
          // Formatear el reporte diario
          const formattedDate = format(new Date(dateStr), 'dd MMMM yyyy', { locale: es });
          
          // Contar ocurrencias de cada hallazgo y tomar los 5 más comunes
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
        
        // Ejecutar todas las promesas y ordenar por fecha
        const fetchedReports = await Promise.all(reportPromises);
        setReports(fetchedReports);
      } catch (err) {
        console.error("Error al cargar los reportes diarios:", err);
        setError("Error al cargar los reportes diarios");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReports();
    
    // Configurar actualización automática cada 30 minutos
    const intervalId = setInterval(() => fetchReports(), 30 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [days]);
  
  return {
    reports,
    isLoading,
    error
  };
}
