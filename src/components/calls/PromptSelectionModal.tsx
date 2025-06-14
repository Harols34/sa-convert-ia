
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Behavior {
  id: string;
  name: string;
  description: string;
  prompt: string;
  is_active: boolean;
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
  const [summaryPrompt, setSummaryPrompt] = useState("");
  const [feedbackPrompt, setFeedbackPrompt] = useState("");
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [selectAllBehaviors, setSelectAllBehaviors] = useState(true);

  // Fetch active behaviors
  const { data: behaviors, isLoading: behaviorsLoading, error: behaviorsError } = useQuery({
    queryKey: ['active-behaviors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('behaviors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Behavior[];
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
    onConfirm({
      summaryPrompt: summaryPrompt.trim() || undefined,
      feedbackPrompt: feedbackPrompt.trim() || undefined,
      selectedBehaviors: selectAllBehaviors ? undefined : selectedBehaviors
    });
  };

  const handleReset = () => {
    setSummaryPrompt("");
    setFeedbackPrompt("");
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
                <CardTitle className="text-lg">Prompt Personalizado para Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="summary-prompt">
                    Prompt para generar el resumen de la llamada (opcional)
                  </Label>
                  <Textarea
                    id="summary-prompt"
                    placeholder="Ingrese un prompt personalizado para el resumen o deje vacío para usar el prompt por defecto..."
                    value={summaryPrompt}
                    onChange={(e) => setSummaryPrompt(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Feedback Prompt Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prompt Personalizado para Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="feedback-prompt">
                    Prompt para generar el feedback de la llamada (opcional)
                  </Label>
                  <Textarea
                    id="feedback-prompt"
                    placeholder="Ingrese un prompt personalizado para el feedback o deje vacío para usar el prompt por defecto..."
                    value={feedbackPrompt}
                    onChange={(e) => setFeedbackPrompt(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
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
                      No hay comportamientos activos configurados. Configure comportamientos antes de procesar llamadas.
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
