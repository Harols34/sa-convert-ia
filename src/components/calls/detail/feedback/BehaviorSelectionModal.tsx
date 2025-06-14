
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckSquare, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";

interface Behavior {
  id: string;
  name: string;
  description: string;
  prompt: string;
  is_active: boolean;
  account_id: string | null;
}

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
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { selectedAccountId } = useAccount();

  // Load behaviors when modal opens
  useEffect(() => {
    if (open) {
      loadBehaviors();
      setSelectedBehaviors([]);
      setError(null);
    }
  }, [open, selectedAccountId]);

  const loadBehaviors = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Loading behaviors for selection modal with account:", selectedAccountId);
      
      let query = supabase
        .from('behaviors')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Filter by account if available
      if (selectedAccountId && selectedAccountId !== 'all') {
        query = query.or(`account_id.eq.${selectedAccountId},account_id.is.null`);
      }

      const { data, error: behaviorError } = await query;

      if (behaviorError) {
        console.error("Error loading behaviors:", behaviorError);
        setError("Error al cargar comportamientos: " + behaviorError.message);
        toast.error("Error al cargar comportamientos");
        return;
      }

      console.log("Loaded behaviors for modal:", data?.length || 0);
      setBehaviors(data || []);
      
      if (!data || data.length === 0) {
        setError("No hay comportamientos activos disponibles para esta cuenta");
      }
    } catch (error) {
      console.error("Error loading behaviors:", error);
      setError("Error al cargar comportamientos");
      toast.error("Error al cargar comportamientos");
    } finally {
      setLoading(false);
    }
  };

  const handleBehaviorToggle = (behaviorId: string) => {
    setSelectedBehaviors(prev => 
      prev.includes(behaviorId)
        ? prev.filter(id => id !== behaviorId)
        : [...prev, behaviorId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBehaviors.length === behaviors.length) {
      setSelectedBehaviors([]);
    } else {
      setSelectedBehaviors(behaviors.map(b => b.id));
    }
  };

  const handleConfirm = () => {
    if (selectedBehaviors.length === 0) {
      toast.error("Selecciona al menos un comportamiento");
      return;
    }
    
    console.log("Confirming behavior selection:", selectedBehaviors);
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
          {!loading && behaviors.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedBehaviors.length} de {behaviors.length} comportamientos seleccionados
                </span>
                {selectedBehaviors.length > 0 && (
                  <Badge variant="secondary">{selectedBehaviors.length}</Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={loading || behaviors.length === 0}
              >
                {selectedBehaviors.length === behaviors.length ? "Deseleccionar todo" : "Seleccionar todo"}
              </Button>
            </div>
          )}

          {/* Behaviors List */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Cargando comportamientos...</span>
              </div>
            ) : error ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-4">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Error al cargar comportamientos</h3>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    <Button 
                      variant="outline" 
                      onClick={loadBehaviors} 
                      className="mt-4"
                      size="sm"
                    >
                      Reintentar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : behaviors.length === 0 ? (
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
                {behaviors.map((behavior) => (
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
            disabled={selectedBehaviors.length === 0 || isLoading || loading}
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
