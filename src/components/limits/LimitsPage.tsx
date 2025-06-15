
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Settings, TrendingUp } from "lucide-react";
import LimitsDashboard from "./LimitsDashboard";
import LimitsConfiguration from "./LimitsConfiguration";
import LimitsUsageHistory from "./LimitsUsageHistory";

export default function LimitsPage() {
  return (
    <div className="space-y-6 component-fade">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Límites</h1>
          <p className="text-muted-foreground">
            Configura y monitorea los límites de uso por cuenta
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Historial de Uso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard de Consumo</CardTitle>
              <CardDescription>
                Monitoreo en tiempo real del uso de recursos por cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LimitsDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Límites</CardTitle>
              <CardDescription>
                Establece límites mensuales para transcripción y consultas por cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LimitsConfiguration />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Uso</CardTitle>
              <CardDescription>
                Consulta el historial detallado de uso de recursos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LimitsUsageHistory />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
