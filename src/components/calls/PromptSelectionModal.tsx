
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Prompt {
  id: string;
  name: string;
  content: string;
  type: "summary" | "feedback";
}

interface PromptSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (prompts: { summaryPrompt?: string; feedbackPrompt?: string }) => void;
}

export default function PromptSelectionModal({
  open,
  onOpenChange,
  onConfirm
}: PromptSelectionModalProps) {
  const [summaryPrompts, setSummaryPrompts] = useState<Prompt[]>([]);
  const [feedbackPrompts, setFeedbackPrompts] = useState<Prompt[]>([]);
  const [selectedSummaryPrompt, setSelectedSummaryPrompt] = useState<string>("");
  const [selectedFeedbackPrompt, setSelectedFeedbackPrompt] = useState<string>("");
  const [customSummaryPrompt, setCustomSummaryPrompt] = useState<string>("");
  const [customFeedbackPrompt, setCustomFeedbackPrompt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();

  useEffect(() => {
    if (open && selectedAccountId && selectedAccountId !== 'all' && user) {
      loadPrompts();
    }
  }, [open, selectedAccountId, user]);

  const loadPrompts = async () => {
    if (!selectedAccountId || selectedAccountId === 'all' || !user) {
      console.warn("No specific account selected or user not authenticated");
      return;
    }

    setLoading(true);
    
    try {
      console.log("Loading prompts STRICTLY for account:", selectedAccountId);

      // Get prompts filtered STRICTLY by account - NO fallback to global prompts
      const { data: prompts, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('account_id', selectedAccountId) // STRICT: Only prompts for this specific account
        .order('name');

      if (error) {
        console.error("Error loading prompts:", error);
        toast.error("Error al cargar prompts");
        return;
      }

      console.log("Loaded prompts STRICTLY for account", selectedAccountId, ":", prompts?.length || 0);

      // Type cast the prompts to ensure proper typing
      const typedPrompts = (prompts || []).map(p => ({
        ...p,
        type: p.type as "summary" | "feedback"
      }));

      const summaryPromptsData = typedPrompts.filter(p => p.type === 'summary');
      const feedbackPromptsData = typedPrompts.filter(p => p.type === 'feedback');

      setSummaryPrompts(summaryPromptsData);
      setFeedbackPrompts(feedbackPromptsData);

      console.log("Summary prompts for account:", summaryPromptsData.length);
      console.log("Feedback prompts for account:", feedbackPromptsData.length);

    } catch (error) {
      console.error("Error loading prompts:", error);
      toast.error("Error al cargar prompts");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const prompts: { summaryPrompt?: string; feedbackPrompt?: string } = {};

    // Handle summary prompt - ONLY existing prompts, no custom creation
    if (selectedSummaryPrompt === "custom") {
      prompts.summaryPrompt = customSummaryPrompt.trim();
      console.log("Using custom summary prompt:", prompts.summaryPrompt);
    } else if (selectedSummaryPrompt) {
      const prompt = summaryPrompts.find(p => p.id === selectedSummaryPrompt);
      prompts.summaryPrompt = prompt?.content;
      console.log("Using existing summary prompt:", prompt?.name, "Content:", prompt?.content);
    }

    // Handle feedback prompt - ONLY existing prompts, no custom creation
    if (selectedFeedbackPrompt === "custom") {
      prompts.feedbackPrompt = customFeedbackPrompt.trim();
      console.log("Using custom feedback prompt:", prompts.feedbackPrompt);
    } else if (selectedFeedbackPrompt) {
      const prompt = feedbackPrompts.find(p => p.id === selectedFeedbackPrompt);
      prompts.feedbackPrompt = prompt?.content;
      console.log("Using existing feedback prompt:", prompt?.name, "Content:", prompt?.content);
    }

    console.log("Final prompts being sent to process-call:", prompts);

    onConfirm(prompts);
    onOpenChange(false);
    
    // Reset form
    setSelectedSummaryPrompt("");
    setSelectedFeedbackPrompt("");
    setCustomSummaryPrompt("");
    setCustomFeedbackPrompt("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seleccionar Prompts para Procesamiento</DialogTitle>
        </DialogHeader>

        {!selectedAccountId || selectedAccountId === 'all' ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Por favor selecciona una cuenta específica para ver los prompts disponibles.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-4">
            <p>Cargando prompts para la cuenta seleccionada...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Prompt Selection */}
            <div className="space-y-2">
              <Label htmlFor="summary-prompt">Prompt de Resumen (Opcional)</Label>
              <Select
                value={selectedSummaryPrompt}
                onValueChange={setSelectedSummaryPrompt}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un prompt de resumen existente o déjalo vacío" />
                </SelectTrigger>
                <SelectContent>
                  {summaryPrompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Prompt personalizado</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedSummaryPrompt === "custom" && (
                <Textarea
                  placeholder="Escribe tu prompt personalizado para el resumen..."
                  value={customSummaryPrompt}
                  onChange={(e) => setCustomSummaryPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              )}
              
              {selectedSummaryPrompt && selectedSummaryPrompt !== "custom" && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    {summaryPrompts.find(p => p.id === selectedSummaryPrompt)?.content}
                  </p>
                </div>
              )}
            </div>

            {/* Feedback Prompt Selection */}
            <div className="space-y-2">
              <Label htmlFor="feedback-prompt">Prompt de Feedback (Opcional)</Label>
              <Select
                value={selectedFeedbackPrompt}
                onValueChange={setSelectedFeedbackPrompt}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un prompt de feedback existente o déjalo vacío" />
                </SelectTrigger>
                <SelectContent>
                  {feedbackPrompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Prompt personalizado</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedFeedbackPrompt === "custom" && (
                <Textarea
                  placeholder="Escribe tu prompt personalizado para el feedback..."
                  value={customFeedbackPrompt}
                  onChange={(e) => setCustomFeedbackPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              )}
              
              {selectedFeedbackPrompt && selectedFeedbackPrompt !== "custom" && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    {feedbackPrompts.find(p => p.id === selectedFeedbackPrompt)?.content}
                  </p>
                </div>
              )}
            </div>

            {summaryPrompts.length === 0 && feedbackPrompts.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p>No hay prompts disponibles para la cuenta seleccionada.</p>
                <p className="text-sm">Puedes proceder sin prompts específicos o crear prompts personalizados.</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedAccountId || selectedAccountId === 'all'}>
            Procesar Archivos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
