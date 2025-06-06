
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Trash2, Settings, Info } from "lucide-react";
import { Call } from "@/hooks/useCallList";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import CallAnalysisInfo from "./CallAnalysisInfo";
import { usePrompts } from "@/hooks/usePrompts";
import { useBehaviors } from "@/hooks/useBehaviors";

interface CallTableProps {
  calls: Call[];
  selectedCalls: string[];
  multiSelectMode: boolean;
  onToggleCallSelection: (callId: string) => void;
  onToggleAllCalls: () => void;
  onDeleteCall: (callId: string) => void;
  loading?: boolean;
}

export default function CallTable({
  calls,
  selectedCalls,
  multiSelectMode,
  onToggleCallSelection,
  onToggleAllCalls,
  onDeleteCall,
  loading = false
}: CallTableProps) {
  const navigate = useNavigate();
  const [showAnalysisInfo, setShowAnalysisInfo] = useState(false);
  const [selectedCallForInfo, setSelectedCallForInfo] = useState<Call | null>(null);
  
  const { prompts: summaryPrompts } = usePrompts("summary");
  const { prompts: feedbackPrompts } = usePrompts("feedback");
  const { behaviors } = useBehaviors();

  const handleShowAnalysisInfo = (call: Call) => {
    setSelectedCallForInfo(call);
    setShowAnalysisInfo(true);
  };

  const getPromptInfo = () => {
    const activeSummaryPrompt = summaryPrompts.find(p => p.active);
    const activeFeedbackPrompt = feedbackPrompts.find(p => p.active);
    
    return {
      summaryPrompt: activeSummaryPrompt?.content,
      feedbackPrompt: activeFeedbackPrompt?.content
    };
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: Call["status"]) => {
    const statusConfig = {
      complete: { label: "Completa", variant: "default" as const },
      analyzing: { label: "Analizando", variant: "secondary" as const },
      transcribing: { label: "Transcribiendo", variant: "secondary" as const },
      pending: { label: "Pendiente", variant: "outline" as const },
      error: { label: "Error", variant: "destructive" as const },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getResultBadge = (result?: "" | "venta" | "no venta") => {
    if (!result || result === "") return null;
    
    const resultConfig = {
      venta: { label: "Venta", variant: "default" as const },
      "no venta": { label: "No Venta", variant: "secondary" as const },
    };

    const config = resultConfig[result];
    return config ? <Badge variant={config.variant}>{config.label}</Badge> : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Cargando llamadas...</span>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {multiSelectMode && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCalls.length === calls.length && calls.length > 0}
                    onCheckedChange={onToggleAllCalls}
                  />
                </TableHead>
              )}
              <TableHead>Archivo</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={multiSelectMode ? 8 : 7} 
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay llamadas disponibles
                </TableCell>
              </TableRow>
            ) : (
              calls.map((call) => (
                <TableRow key={call.id} className="hover:bg-muted/50">
                  {multiSelectMode && (
                    <TableCell>
                      <Checkbox
                        checked={selectedCalls.includes(call.id)}
                        onCheckedChange={() => onToggleCallSelection(call.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div className="max-w-[200px] truncate">
                      {call.filename || call.title}
                    </div>
                  </TableCell>
                  <TableCell>{call.agentName}</TableCell>
                  <TableCell>
                    {format(new Date(call.date), "dd/MM/yyyy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>{formatDuration(call.duration)}</TableCell>
                  <TableCell>{getStatusBadge(call.status)}</TableCell>
                  <TableCell>
                    {getResultBadge(call.result)}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleShowAnalysisInfo(call)}
                      className="hover:bg-blue-50"
                      title="Ver configuración de análisis"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/calls/${call.id}`)}
                      className="hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteCall(call.id)}
                      className="hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showAnalysisInfo && selectedCallForInfo && (
        <CallAnalysisInfo
          isOpen={showAnalysisInfo}
          onClose={() => setShowAnalysisInfo(false)}
          promptInfo={getPromptInfo()}
          behaviors={behaviors}
        />
      )}
    </>
  );
}
