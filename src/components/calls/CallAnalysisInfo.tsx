
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Brain, MessageSquare, CheckCircle } from "lucide-react";

interface CallAnalysisInfoProps {
  isOpen: boolean;
  onClose: () => void;
  promptInfo: {
    summaryPrompt?: string;
    feedbackPrompt?: string;
  };
  behaviors: Array<{
    name: string;
    description?: string;
    is_active: boolean;
  }>;
}

export default function CallAnalysisInfo({ 
  isOpen, 
  onClose, 
  promptInfo, 
  behaviors 
}: CallAnalysisInfoProps) {
  const activeBehaviors = behaviors.filter(b => b.is_active);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Configuración de Análisis Aplicada
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Prompts Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Prompts Aplicados
            </h3>
            
            <div className="grid gap-4">
              {promptInfo.summaryPrompt && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      <Badge variant="secondary">Resumen</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {promptInfo.summaryPrompt}
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {promptInfo.feedbackPrompt && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      <Badge variant="secondary">Feedback</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {promptInfo.feedbackPrompt}
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {!promptInfo.summaryPrompt && !promptInfo.feedbackPrompt && (
                <p className="text-sm text-muted-foreground italic">
                  No hay prompts específicos aplicados. Se usaron los prompts por defecto del sistema.
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Behaviors Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Comportamientos Considerados ({activeBehaviors.length})
            </h3>
            
            {activeBehaviors.length > 0 ? (
              <div className="grid gap-3">
                {activeBehaviors.map((behavior, index) => (
                  <Card key={index} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{behavior.name}</h4>
                          {behavior.description && (
                            <p className="text-xs text-muted-foreground">
                              {behavior.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-2">
                          Activo
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No hay comportamientos activos configurados para el análisis.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
