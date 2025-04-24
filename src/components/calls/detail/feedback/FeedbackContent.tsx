
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Call, BehaviorAnalysis } from "@/lib/types";
import FeedbackErrorDisplay from "./FeedbackErrorDisplay";
import ScoreCard from "./ScoreCard";
import FeedbackPointsCard from "./FeedbackPointsCard";
import BehaviorsAnalysis from "./BehaviorsAnalysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedbackContentProps {
  call: Call;
  localFeedback: Call["feedback"];
  behaviorsToDisplay: BehaviorAnalysis[];
  isLoadingBehaviors: boolean;
  analysisError: string | null;
  onRefreshAnalysis: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function FeedbackContent({
  call,
  localFeedback,
  behaviorsToDisplay,
  isLoadingBehaviors,
  analysisError,
  onRefreshAnalysis,
  activeTab,
  setActiveTab
}: FeedbackContentProps) {
  // Mostrar un esqueleto de carga cuando no hay feedback pero está cargando
  const showSkeleton = isLoadingBehaviors && (!localFeedback && behaviorsToDisplay.length === 0);

  // Calculate compliance percentage
  const totalBehaviors = behaviorsToDisplay.length;
  const compliantBehaviors = behaviorsToDisplay.filter(b => b.evaluation === "cumple").length;
  const compliancePercentage = totalBehaviors > 0 
    ? Math.round((compliantBehaviors / totalBehaviors) * 100) 
    : 0;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="summary">Resumen</TabsTrigger>
        <TabsTrigger value="behaviors">Comportamientos</TabsTrigger>
        <TabsTrigger value="details">Detalles</TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {showSkeleton ? (
            <>
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
            </>
          ) : (
            <>
              <ScoreCard score={localFeedback?.score ? localFeedback.score / 100 : 0} />
              <FeedbackPointsCard title="Aspectos Positivos" points={localFeedback?.positive || []} />
              <FeedbackPointsCard title="Oportunidades de Mejora" points={localFeedback?.opportunities || []} />
            </>
          )}
        </div>
        
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Evaluación General</CardTitle>
            <CardDescription>
              Evaluación de calidad basada en {totalBehaviors} comportamientos clave
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showSkeleton ? (
              <>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-2.5 w-full mb-4" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span>Cumplimiento de comportamientos</span>
                  <span className="font-semibold">{compliancePercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ width: `${compliancePercentage}%` }}
                  ></div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  {compliancePercentage >= 80 
                    ? "Excelente desempeño, cumple con la mayoría de los comportamientos esperados." 
                    : compliancePercentage >= 60 
                    ? "Buen desempeño, pero hay áreas de oportunidad para mejorar." 
                    : "Se requiere atención para mejorar el cumplimiento de comportamientos esperados."}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="behaviors" className="space-y-4 mt-4">
        {analysisError && <FeedbackErrorDisplay errorMessage={analysisError} />}
        <BehaviorsAnalysis 
          behaviors={behaviorsToDisplay} 
          isLoading={isLoadingBehaviors} 
          onRefresh={onRefreshAnalysis} 
        />
      </TabsContent>

      <TabsContent value="details" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showSkeleton ? (
            <>
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
            </>
          ) : (
            <>
              <FeedbackPointsCard title="Aspectos Positivos" points={localFeedback?.positive || []} />
              <FeedbackPointsCard title="Aspectos Negativos" points={localFeedback?.negative || []} />
              <FeedbackPointsCard title="Oportunidades de Mejora" points={localFeedback?.opportunities || []} />
            </>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
