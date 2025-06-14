
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, PlayCircle, CheckSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BehaviorSelectionModal from "./BehaviorSelectionModal";

interface FeedbackLoadingProps {
  isLoading: boolean;
  onGenerateClick: (selectedBehaviorIds?: string[]) => void;
  error?: string | null;
  feedbackExists: boolean;
  autoGenerating: boolean;
}

export default function FeedbackLoading({
  isLoading,
  onGenerateClick,
  error,
  feedbackExists,
  autoGenerating
}: FeedbackLoadingProps) {
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);

  console.log("FeedbackLoading render:", { isLoading, error, feedbackExists, autoGenerating });

  const handleGenerateWithSelection = () => {
    setShowBehaviorModal(true);
  };

  const handleBehaviorSelectionConfirm = (selectedBehaviorIds: string[]) => {
    setShowBehaviorModal(false);
    onGenerateClick(selectedBehaviorIds);
  };

  // Don't show loading screen if feedback already exists
  if (feedbackExists) {
    console.log("Feedback exists, hiding loading screen");
    return null;
  }

  return (
    <Card className="glass-card dark:glass-card-dark">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {isLoading ? (
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          ) : error ? (
            <AlertCircle className="h-12 w-12 text-destructive" />
          ) : (
            <PlayCircle className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <CardTitle>
          {isLoading 
            ? "Generando análisis..." 
            : error 
            ? "Error en el análisis" 
            : "Feedback Pendiente por Generar"}
        </CardTitle>
        <CardDescription>
          {isLoading 
            ? "El análisis de comportamientos está en progreso. Esto puede tomar unos momentos."
            : error 
            ? "Ocurrió un error al generar el análisis. Puedes intentar nuevamente."
            : "El feedback para esta llamada está pendiente por generar. Selecciona los comportamientos que deseas analizar o analiza todos los comportamientos activos."}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!isLoading && !autoGenerating && (
          <div className="space-y-3">
            <div className="text-center space-y-2">
              <Button 
                onClick={handleGenerateWithSelection}
                className="w-full"
                size="lg"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Seleccionar Comportamientos y Analizar
              </Button>
              
              <div className="text-xs text-muted-foreground">
                Podrás elegir qué comportamientos específicos analizar
              </div>
            </div>
            
            <div className="border-t pt-3">
              <Button 
                variant="outline"
                onClick={() => onGenerateClick()}
                className="w-full"
                size="sm"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Analizar Todos los Comportamientos Activos
              </Button>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="text-center text-sm text-muted-foreground">
            <div className="space-y-1">
              <p>⏳ Analizando transcripción...</p>
              <p>🤖 Evaluando comportamientos...</p>
              <p>📊 Generando puntuación...</p>
            </div>
          </div>
        )}
      </CardContent>

      <BehaviorSelectionModal
        open={showBehaviorModal}
        onOpenChange={setShowBehaviorModal}
        onConfirm={handleBehaviorSelectionConfirm}
        isLoading={isLoading}
      />
    </Card>
  );
}
