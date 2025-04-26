import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Brain, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Behavior } from "@/lib/types";

export default function BehaviorList() {
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBehaviors();
  }, []);

  const fetchBehaviors = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("behaviors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const transformedBehaviors: Behavior[] = data.map(behavior => {
          let criteria: string[] = [];
          
          try {
            if (behavior.prompt) {
              const parsedPrompt = JSON.parse(behavior.prompt);
              if (parsedPrompt.criteria && Array.isArray(parsedPrompt.criteria)) {
                criteria = parsedPrompt.criteria;
              }
            }
          } catch (e) {
            console.error("Error parsing behavior prompt:", e);
          }
          
          return {
            id: behavior.id,
            name: behavior.name,
            description: behavior.description,
            prompt: behavior.prompt,
            isActive: behavior.is_active,
            criteria: criteria,
            createdBy: behavior.created_by,
            createdAt: behavior.created_at,
            updatedAt: behavior.updated_at
          };
        });
        
        setBehaviors(transformedBehaviors);
      }
    } catch (error) {
      console.error("Error fetching behaviors:", error);
      toast.error("Error al cargar los comportamientos");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBehaviorActive = async (id: string, currentState: boolean) => {
    try {
      setIsActivating(true);
      
      const { error } = await supabase
        .from("behaviors")
        .update({ is_active: !currentState })
        .eq("id", id);
      
      if (error) throw error;
      
      setBehaviors(prev => prev.map(behavior => {
        if (behavior.id === id) {
          return { ...behavior, isActive: !currentState };
        }
        return behavior;
      }));
      
      toast.success("Estado del comportamiento actualizado");
    } catch (error) {
      console.error("Error updating behavior status:", error);
      toast.error("Error al actualizar el estado del comportamiento");
    } finally {
      setIsActivating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro que deseas eliminar este comportamiento?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("behaviors")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setBehaviors((prev) => prev.filter((behavior) => behavior.id !== id));
      toast.success("Comportamiento eliminado correctamente");
    } catch (error) {
      console.error("Error deleting behavior:", error);
      toast.error("Error al eliminar el comportamiento");
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-secondary rounded-lg"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (behaviors.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Brain size={48} className="text-muted-foreground" />
          <h3 className="text-xl font-medium">No hay comportamientos creados</h3>
          <p className="text-muted-foreground max-w-md">
            Los comportamientos permiten a la IA analizar aspectos específicos de
            las llamadas. Crea tu primer comportamiento para empezar.
          </p>
          <Button onClick={() => navigate("/behaviors/new")}>
            Crear Comportamiento
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Criterios</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {behaviors.map((behavior) => (
            <TableRow key={behavior.id}>
              <TableCell className="font-medium">{behavior.name}</TableCell>
              <TableCell className="max-w-xs truncate">
                {behavior.description}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleBehaviorActive(behavior.id, behavior.isActive)}
                  disabled={isActivating}
                  className="py-1.5 px-3"
                  title={behavior.isActive ? "Desactivar comportamiento" : "Activar comportamiento"}
                >
                  {isActivating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : behavior.isActive ? (
                    <ToggleRight className="h-5 w-5 text-primary" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {behavior.criteria?.slice(0, 2).map((criterion, index) => (
                    <Badge key={index} variant="outline">
                      {criterion}
                    </Badge>
                  ))}
                  {behavior.criteria && behavior.criteria.length > 2 && (
                    <Badge variant="outline">+{behavior.criteria.length - 2}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/behaviors/edit/${behavior.id}`)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(behavior.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
