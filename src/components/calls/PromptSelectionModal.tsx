
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";

interface Behavior {
  id: string;
  name: string;
  description: string;
  prompt: string;
  is_active: boolean;
  account_id?: string;
  user_id?: string;
}

interface Prompt {
  id: string;
  name: string;
  content: string;
  type: "summary" | "feedback";
  active: boolean;
  account_id?: string;
  user_id?: string;
}

interface PromptSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (prompts: { 
    summaryPrompt?: string; 
    feedbackPrompt?: string;
    selectedBehaviors?: string[];
  }) => void;
}

export default function PromptSelectionModal({
  open,
  onOpenChange,
  onConfirm
}: PromptSelectionModalProps) {
  const [customSummaryPrompt, setCustomSummaryPrompt] = useState("");
  const [customFeedbackPrompt, setCustomFeedbackPrompt] = useState("");
  const [selectedSummaryPrompt, setSelectedSummaryPrompt] = useState<string>("custom");
  const [selectedFeedbackPrompt, setSelectedFeedbackPrompt] = useState<string>("custom");
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [selectAllBehaviors, setSelectAllBehaviors] = useState(true);
  
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();

  // Fetch active behaviors filtered by account
  const { data: behaviors, isLoading: behaviorsLoading, error: behaviorsError } = useQuery({
    queryKey: ['active-behaviors', selectedAccountId],
    queryFn: async () => {
      console.log("Fetching behaviors for account:", selectedAccountId);
      
      let query = supabase
        .from('behaviors')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Apply account filtering
      if (selectedAccountId && selectedAccountId !== 'all') {
        query = query.eq('account_id', selectedAccountId);
      } else if (selectedAccountId === 'all' && user?.role === 'superAdmin') {
        // SuperAdmin with "all" sees all behaviors
      } else {
        // User without specific account - only personal behaviors
        query = query.eq('user_id', user?.id).is('account_id', null);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      console.log("Behaviors fetched:", data?.length || 0);
      return data as Behavior[];
    },
    enabled: open
  });

  // Fetch summary prompts filtered by account
  const { data: summaryPrompts, isLoading: summaryPromptsLoading } = useQuery({
    queryKey: ['summary-prompts', selectedAccountId],
    queryFn: async () => {
      console.log("Fetching summary prompts for account:", selectedAccountId);
      
      let query = supabase
        .from('prompts')
        .select('*')
        .eq('type', 'summary')
        .order('updated_at', { ascending: false });

      // Apply account filtering
      if (selectedAccountId && selectedAccountId !== 'all') {
        query = query.eq('account_id', selectedAccountId);
      } else if (selectedAccountId === 'all' && user?.role === 'superAdmin') {
        // SuperAdmin with "all" sees all prompts
      } else {
        // User without specific account - only personal prompts
        query = query.eq('user_id', user?.id).is('account_id', null);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      console.log("Summary prompts fetched:", data?.length || 0);
      return data as Prompt[];
    },
    enabled: open
  });

  // Fetch feedback prompts filtered by account
  const { data: feedbackPrompts, isLoading: feedbackPromptsLoading } = useQuery({
    queryKey: ['feedback-prompts', selectedAccountId],
    queryFn: async () => {
      console.log("Fetching feedback prompts for account:", selectedAccountId);
      
      let query = supabase
        .from('prompts')
        .select('*')
        .eq('type', 'feedback')
        .order('updated_at', { ascending: false });

      // Apply account filtering
      if (selectedAccountId && selectedAccountId !== 'all') {
        query = query.eq('account_id', selectedAccountId);
      } else if (selectedAccountId === 'all' && user?.role === 'superAdmin') {
        // SuperAdmin with "all" sees all prompts
      } else {
        // User without specific account - only personal prompts
        query = query.eq('user_id', user?.id).is('account_id', null);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      console.log("Feedback prompts fetched:", data?.length || 0);
      return data as Prompt[];
    },
    enabled: open
  });

  useEffect(() => {
    if (behaviors && behaviors.length > 0 && selectAllBehaviors) {
      setSelectedBehaviors(behaviors.map(b => b.id));
    }
  }, [behaviors, selectAllBehaviors]);

  const handleBehaviorToggle = (behaviorId: string, checked: boolean) => {
    if (checked) {
      setSelectedBehaviors(prev => [...prev, behaviorId]);
    } else {
      setSelectedBehaviors(prev => prev.filter(id => id !== behaviorId));
      setSelectAllBehaviors(false);
    }
  };

  const handleSelectAllToggle = (checked: boolean) => {
    setSelectAllBehaviors(checked);
    if (checked && behaviors) {
      setSelectedBehaviors(behaviors.map(b => b.id));
    } else {
      setSelectedBehaviors([]);
    }
  };

  const handleConfirm = () => {
    let finalSummaryPrompt: string | undefined;
    let finalFeedbackPrompt: string | undefined;

    // Determine summary prompt
    if (selectedSummaryPrompt === "custom") {
      finalSummaryPrompt = customSummaryPrompt.trim() || undefined;
    } else if (selectedSummaryPrompt && selectedSummaryPrompt !== "default") {
      const selectedPrompt = summaryPrompts?.find(p => p.id === selectedSummaryPrompt);
      finalSummaryPrompt = selectedPrompt?.content || undefined;
    }

    // Determine feedback prompt
    if (selectedFeedbackPrompt === "custom") {
      finalFeedbackPrompt = customFeedbackPrompt.trim() || undefined;
    } else if (selectedFeedbackPrompt && selectedFeedbackPrompt !== "default") {
      const selectedPrompt = feedbackPrompts?.find(p => p.id === selectedFeedbackPrompt);
      finalFeedbackPrompt = selectedPrompt?.content || undefined;
    }

    onConfirm({
      summaryPrompt: finalSummaryPrompt,
      feedbackPrompt: finalFeedbackPrompt,
      selectedBehaviors: selectAllBehaviors ? undefined : selectedBehaviors
    });
  };

  const handleReset = () => {
    setCustomSummaryPrompt("");
    setCustomFeedbackPrompt("");
    setSelectedSummaryPrompt("custom");
    setSelectedFeedbackPrompt("custom");
    setSelectedBehaviors([]);
    setSelectAllBehaviors(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Configuración de Análisis de Llamadas</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Summary Prompt Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prompt para Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="summary-prompt-select">
                    Seleccionar prompt de resumen
                  </Label>
                  {summaryPromptsLoading ? (
                    <div className="flex items-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Cargando prompts...</span>
                    </div>
                  ) : (
                    <Select value={selectedSummaryPrompt} onValueChange={setSelectedSummaryPrompt}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar prompt" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Prompt por defecto del sistema</SelectItem>
                        <SelectItem value="custom">Prompt personalizado</SelectItem>
                        {summaryPrompts?.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.name} {prompt.active && "(Activo)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedSummaryPrompt === "custom" && (
                  <div>
                    <Label htmlFor="custom-summary-prompt">
                      Prompt personalizado para resumen
                    </Label>
                    <Textarea
                      id="custom-summary-prompt"
                      placeholder="Ingrese un prompt personalizado para el resumen..."
                      value={customSummaryPrompt}
                      onChange={(e) => setCustomSummaryPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feedback Prompt Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prompt para Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="feedback-prompt-select">
                    Seleccionar prompt de feedback
                  </Label>
                  {feedbackPromptsLoading ? (
                    <div className="flex items-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Cargando prompts...</span>
                    </div>
                  ) : (
                    <Select value={selectedFeedbackPrompt} onValueChange={setSelectedFeedbackPrompt}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar prompt" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Prompt por defecto del sistema</SelectItem>
                        <SelectItem value="custom">Prompt personalizado</SelectItem>
                        {feedbackPrompts?.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.name} {prompt.active && "(Activo)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedFeedbackPrompt === "custom" && (
                  <div>
                    <Label htmlFor="custom-feedback-prompt">
                      Prompt personalizado para feedback
                    </Label>
                    <Textarea
                      id="custom-feedback-prompt"
                      placeholder="Ingrese un prompt personalizado para el feedback..."
                      value={customFeedbackPrompt}
                      onChange={(e) => setCustomFeedbackPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Behaviors Selection Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selección de Comportamientos a Analizar</CardTitle>
              </CardHeader>
              <CardContent>
                {behaviorsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Cargando comportamientos...</span>
                  </div>
                ) : behaviorsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Error al cargar comportamientos: {behaviorsError.message}
                    </AlertDescription>
                  </Alert>
                ) : !behaviors || behaviors.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay comportamientos activos configurados para la cuenta seleccionada. Configure comportamientos antes de procesar llamadas.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {/* Select All Option */}
                    <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
                      <Checkbox
                        id="select-all"
                        checked={selectAllBehaviors}
                        onCheckedChange={handleSelectAllToggle}
                      />
                      <Label htmlFor="select-all" className="font-medium">
                        Analizar todos los comportamientos activos
                      </Label>
                    </div>

                    {!selectAllBehaviors && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Seleccione los comportamientos específicos a analizar:
                        </Label>
                        <div className="grid gap-3 max-h-[300px] overflow-y-auto">
                          {behaviors.map((behavior) => (
                            <div
                              key={behavior.id}
                              className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                id={behavior.id}
                                checked={selectedBehaviors.includes(behavior.id)}
                                onCheckedChange={(checked) => 
                                  handleBehaviorToggle(behavior.id, checked as boolean)
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <Label
                                  htmlFor={behavior.id}
                                  className="font-medium cursor-pointer"
                                >
                                  {behavior.name}
                                </Label>
                                {behavior.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {behavior.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selection Summary */}
                    <div className="text-sm text-muted-foreground">
                      {selectAllBehaviors 
                        ? `Se analizarán todos los ${behaviors.length} comportamientos activos`
                        : `${selectedBehaviors.length} comportamiento(s) seleccionado(s) para análisis`
                      }
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Restablecer
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectAllBehaviors && selectedBehaviors.length === 0 && behaviors && behaviors.length > 0}
            >
              Procesar Llamadas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
