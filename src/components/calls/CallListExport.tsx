import React from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCcw } from "lucide-react";
import { Call, Feedback, BehaviorAnalysis } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateCallStatus } from "@/components/calls/detail/CallUtils";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import { downloadAudio } from "../calls/detail/audio/audioUtils";

interface CallListExportProps {
  selectedCalls?: Call[];
}

export default function CallListExport({ selectedCalls }: CallListExportProps) {
  const prepareExportData = async () => {
    try {
      toast.loading("Preparando exportación...", { id: "export" });
      
      let calls: Call[] = [];
      
      if (selectedCalls && selectedCalls.length > 0) {
        calls = selectedCalls;
      } else {
        const { data, error } = await supabase
          .from('calls')
          .select(`
            *,
            feedback (*)
          `)
          .order('date', { ascending: false });
          
        if (error) throw error;
        
        calls = data.map(call => {
          let feedback: Feedback | undefined = undefined;
          
          if (call.feedback && call.feedback.length > 0) {
            const fbData = call.feedback[0];
            
            let behaviorsAnalysis: BehaviorAnalysis[] = [];
            if (fbData.behaviors_analysis) {
              if (typeof fbData.behaviors_analysis === 'string') {
                try {
                  behaviorsAnalysis = JSON.parse(fbData.behaviors_analysis);
                } catch (e) {
                  console.error("Error parsing behaviors_analysis:", e);
                }
              } else if (Array.isArray(fbData.behaviors_analysis)) {
                behaviorsAnalysis = fbData.behaviors_analysis.map((item: any) => ({
                  name: item.name || "",
                  evaluation: (item.evaluation === "cumple" || item.evaluation === "no cumple") 
                    ? item.evaluation : "no cumple",
                  comments: item.comments || ""
                }));
              }
            }
            
            feedback = {
              id: fbData.id,
              call_id: fbData.call_id,
              score: fbData.score || 0,
              positive: fbData.positive || [],
              negative: fbData.negative || [],
              opportunities: fbData.opportunities || [],
              behaviors_analysis: behaviorsAnalysis,
              created_at: fbData.created_at,
              updated_at: fbData.updated_at,
              sentiment: fbData.sentiment,
              topics: fbData.topics || [],
              entities: fbData.entities || []
            };
          }
          
          let result: "" | "venta" | "no venta" = "";
          if (call.result === "venta" || call.result === "no venta") {
            result = call.result;
          }
          
          let product: "" | "fijo" | "móvil" = "";
          if (call.product === "fijo" || call.product === "móvil") {
            product = call.product;
          }
          
          return {
            id: call.id,
            title: call.title,
            filename: call.filename,
            agentName: call.agent_name || "Sin asignar",
            agentId: call.agent_id,
            duration: call.duration || 0,
            date: call.date,
            status: validateCallStatus(call.status),
            progress: call.progress || 0,
            audio_url: call.audio_url,
            audioUrl: call.audio_url,
            transcription: null,
            summary: call.summary || "",
            result: result,
            product: product,
            reason: call.reason || "",
            tipificacionId: call.tipificacion_id,
            feedback: feedback,
            statusSummary: call.status_summary || ""
          };
        });
      }
      
      const { data: tipificacionesData } = await supabase
        .from('tipificaciones')
        .select('id, name');
        
      const tipificacionMap = new Map();
      if (tipificacionesData) {
        tipificacionesData.forEach(tip => {
          tipificacionMap.set(tip.id, tip.name);
        });
      }
      
      const exportRows = [];
      
      for (const call of calls) {
        const date = new Date(call.date);
        const formattedDate = date.toLocaleString();
        
        const tipificacionName = call.tipificacionId ? 
          tipificacionMap.get(call.tipificacionId) || "Sin asignar" : 
          "Sin asignar";
        
        exportRows.push({
          "Título": call.title,
          "Duración (seg)": call.duration,
          "Fecha": formattedDate,
          "Asesor": call.agentName,
          "Tipificación": tipificacionName,
          "Estado": call.status === "complete" ? "Completo" : 
                   call.status === "pending" ? "Pendiente" : 
                   call.status === "analyzing" ? "Analizando" : 
                   call.status === "transcribing" ? "Transcribiendo" : 
                   call.status === "error" ? "Error" : call.status,
          "Resumen Estado": call.statusSummary || "",
          "Resumen": call.summary || ""
        });
      }
      
      const headers = exportRows.length > 0 ? 
        Object.keys(exportRows[0]) : 
        [
          "Título", 
          "Duración (seg)", 
          "Fecha", 
          "Asesor", 
          "Tipificación", 
          "Estado",
          "Resumen Estado",
          "Resumen"
        ];
      
      return { exportRows, headers };
    } catch (error) {
      console.error("Error preparing export data:", error);
      toast.error("Error en la preparación de datos", { 
        id: "export",
        description: error instanceof Error ? error.message : "Error desconocido" 
      });
      throw error;
    }
  };

  const exportToExcel = async () => {
    try {
      const { exportRows } = await prepareExportData();
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Llamadas");
      
      XLSX.writeFile(workbook, `llamadas_${new Date().toISOString().slice(0,10)}.xlsx`);
      
      toast.success("Exportación a Excel completada", { id: "export" });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Error en la exportación a Excel", { 
        id: "export",
        description: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  };

  const exportToText = async () => {
    try {
      const { exportRows, headers } = await prepareExportData();
      
      let textContent = headers.join('\t') + '\n';
      
      exportRows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return value.replace(/\t/g, ' ');
          return value;
        });
        textContent += values.join('\t') + '\n';
      });
      
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      downloadAudio(url, `llamadas_${new Date().toISOString().slice(0,10)}`, 'txt');
      
      toast.success("Exportación a texto completada", { id: "export" });
    } catch (error) {
      console.error("Error exporting to text:", error);
      toast.error("Error en la exportación a texto", { 
        id: "export",
        description: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <span>Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToExcel}>
          Exportar a Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToText}>
          Exportar a Texto (.txt)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
