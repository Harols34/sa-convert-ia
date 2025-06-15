
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, AlertTriangle } from "lucide-react";
import { useLimits } from "@/hooks/useLimits";
import { useAccounts } from "@/hooks/useAccounts";

export default function LimitsConfiguration() {
  const { limits, loading: limitsLoading, error, createOrUpdateLimit, deleteLimit } = useLimits();
  const { accounts, loading: accountsLoading } = useAccounts();
  
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [limiteHoras, setLimiteHoras] = useState<number>(100);
  const [limiteConsultas, setLimiteConsultas] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when limits change
  useEffect(() => {
    if (selectedAccount && limits.length > 0) {
      const existingLimit = limits.find(limit => limit.account_id === selectedAccount);
      if (existingLimit) {
        setLimiteHoras(existingLimit.limite_horas);
        setLimiteConsultas(existingLimit.limite_consultas);
      } else {
        setLimiteHoras(100);
        setLimiteConsultas(100);
      }
    }
  }, [selectedAccount, limits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setIsSubmitting(true);
    try {
      await createOrUpdateLimit(selectedAccount, limiteHoras, limiteConsultas);
      // Reset form
      setSelectedAccount("");
      setLimiteHoras(100);
      setLimiteConsultas(100);
    } catch (error) {
      console.error("Error saving limit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (limitId: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este límite?")) {
      try {
        await deleteLimit(limitId);
      } catch (error) {
        console.error("Error deleting limit:", error);
      }
    }
  };

  const getAccountName = (accountId: string) => {
    return accounts.find(account => account.id === accountId)?.name || "Cuenta desconocida";
  };

  if (limitsLoading || accountsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-20 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario para crear/editar límites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Configurar Límites
          </CardTitle>
          <CardDescription>
            Establece o modifica los límites mensuales para una cuenta específica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account">Cuenta</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horas">Límite de Horas</Label>
                <Input
                  id="horas"
                  type="number"
                  min="1"
                  max="10000"
                  value={limiteHoras}
                  onChange={(e) => setLimiteHoras(parseInt(e.target.value) || 100)}
                  placeholder="100"
                />
                <p className="text-xs text-muted-foreground">
                  Horas de transcripción permitidas por mes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="consultas">Límite de Consultas</Label>
                <Input
                  id="consultas"
                  type="number"
                  min="1"
                  max="10000"
                  value={limiteConsultas}
                  onChange={(e) => setLimiteConsultas(parseInt(e.target.value) || 100)}
                  placeholder="100"
                />
                <p className="text-xs text-muted-foreground">
                  Consultas al chatbot permitidas por mes
                </p>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={!selectedAccount || isSubmitting}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Guardando..." : "Guardar Límites"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de límites configurados */}
      <Card>
        <CardHeader>
          <CardTitle>Límites Configurados</CardTitle>
          <CardDescription>
            Límites actualmente establecidos para cada cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {limits.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No hay límites configurados aún
            </p>
          ) : (
            <div className="space-y-4">
              {limits.map((limit) => (
                <Card key={limit.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{getAccountName(limit.account_id)}</h4>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Horas: {limit.limite_horas}</span>
                          <span>Consultas: {limit.limite_consultas}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            Creado: {new Date(limit.fecha_creacion).toLocaleDateString()}
                          </Badge>
                          <Badge variant="outline">
                            Actualizado: {new Date(limit.updated_at).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(limit.id)}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
