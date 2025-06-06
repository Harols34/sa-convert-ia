
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { usePrompts } from "@/hooks/usePrompts";
import { Loader2 } from "lucide-react";

interface PromptSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedPrompts: { summary?: string; feedback?: string }) => void;
}

export function PromptSelectionModal({ open, onOpenChange, onConfirm }: PromptSelectionModalProps) {
  const [selectedSummaryPrompt, setSelectedSummaryPrompt] = useState<string>("");
  const [selectedFeedbackPrompt, setSelectedFeedbackPrompt] = useState<string>("");
  
  const { prompts: summaryPrompts, loading: loadingSummary } = usePrompts("summary");
  const { prompts: feedbackPrompts, loading: loadingFeedback } = usePrompts("feedback");

  // Reset selections when modal opens
  useEffect(() => {
    if (open) {
      setSelectedSummaryPrompt("");
      setSelectedFeedbackPrompt("");
    }
  }, [open]);

  const handleConfirm = () => {
    const selectedPrompts: { summary?: string; feedback?: string } = {};
    
    if (selectedSummaryPrompt) {
      const summaryPrompt = summaryPrompts.find(p => p.id === selectedSummaryPrompt);
      selectedPrompts.summary = summaryPrompt?.content;
    }
    
    if (selectedFeedbackPrompt) {
      const feedbackPrompt = feedbackPrompts.find(p => p.id === selectedFeedbackPrompt);
      selectedPrompts.feedback = feedbackPrompt?.content;
    }
    
    onConfirm(selectedPrompts);
    onOpenChange(false);
  };

  const canConfirm = selectedSummaryPrompt || selectedFeedbackPrompt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar Prompts para Análisis</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Summary Prompt Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Resumen</Badge>
              <span className="text-sm text-muted-foreground">(Opcional)</span>
            </div>
            
            {loadingSummary ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Cargando prompts...</span>
              </div>
            ) : (
              <Select value={selectedSummaryPrompt} onValueChange={setSelectedSummaryPrompt}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar prompt de resumen" />
                </SelectTrigger>
                <SelectContent>
                  {summaryPrompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.name}
                      {prompt.active && <Badge variant="secondary" className="ml-2">Activo</Badge>}
                    </SelectItem>
                  ))}
                  {summaryPrompts.length === 0 && (
                    <SelectItem value="none" disabled>
                      No hay prompts de resumen disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Feedback Prompt Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Feedback</Badge>
              <span className="text-sm text-muted-foreground">(Opcional)</span>
            </div>
            
            {loadingFeedback ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Cargando prompts...</span>
              </div>
            ) : (
              <Select value={selectedFeedbackPrompt} onValueChange={setSelectedFeedbackPrompt}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar prompt de feedback" />
                </SelectTrigger>
                <SelectContent>
                  {feedbackPrompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.name}
                      {prompt.active && <Badge variant="secondary" className="ml-2">Activo</Badge>}
                    </SelectItem>
                  ))}
                  {feedbackPrompts.length === 0 && (
                    <SelectItem value="none" disabled>
                      No hay prompts de feedback disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Continuar con Carga
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
