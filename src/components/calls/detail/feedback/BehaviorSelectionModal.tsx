
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckSquare } from "lucide-react";
import { useBehaviors } from "@/hooks/useBehaviors";
import { Badge } from "@/components/ui/badge";

interface BehaviorSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedBehaviorIds: string[]) => void;
  isLoading?: boolean;
}

export default function BehaviorSelectionModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false
}: BehaviorSelectionModalProps) {
  const { behaviors, loading } = useBehaviors();
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);

  // Filter only active behaviors
  const activeBehaviors = behaviors.filter(behavior => behavior.is_active);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedBehaviors([]);
    }
  }, [open]);

  const handleBehaviorToggle = (behaviorId: string) => {
    setSelectedBehaviors(prev => 
      prev.includes(behaviorId)
        ? prev.filter(id => id !== behaviorId)
        : [...prev, behaviorId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBehaviors.length === activeBehaviors.length) {
      setSelectedBehaviors([]);
    } else {
      setSelectedBehaviors(activeBehaviors.map(b => b.id));
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedBehaviors);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Seleccionar Comportamientos para Analizar
          </DialogTitle>
          <DialogDescription>
            Selecciona uno o varios comportamientos para analizar en esta llamada. 
            Solo se analizarán los comportamientos que selecciones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary and Select All */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedBehaviors.length} de {activeBehaviors.length} comportamientos seleccionados
              </span>
              {selectedBehaviors.length > 0 && (
                <Badge variant="secondary">{selectedBehaviors.length}</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={loading || activeBehaviors.length === 0}
            >
              {selectedBehaviors.length === activeBehaviors.length ? "Deseleccionar todo" : "Seleccionar todo"}
            </Button>
          </div>

          {/* Behaviors List */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Cargando comportamientos...</span>
              </div>
            ) : activeBehaviors.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-4">
                    <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No hay comportamientos activos</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Primero necesitas crear y activar al menos un comportamiento para poder realizar el análisis.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeBehaviors.map((behavior) => (
                  <Card 
                    key={behavior.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedBehaviors.includes(behavior.id) ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleBehaviorToggle(behavior.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedBehaviors.includes(behavior.id)}
                          onChange={() => handleBehaviorToggle(behavior.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base">{behavior.name}</CardTitle>
                          {behavior.description && (
                            <CardDescription className="mt-1">
                              {behavior.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                        <strong>Prompt:</strong> {behavior.prompt.length > 100 
                          ? `${behavior.prompt.substring(0, 100)}...` 
                          : behavior.prompt}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedBehaviors.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Analizando...
              </>
            ) : (
              `Analizar ${selectedBehaviors.length} comportamiento${selectedBehaviors.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
