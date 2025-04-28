
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
import { Pencil, Trash2, FileText, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Contract } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ContractList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setIsLoading(true);
      // For demo purposes, we're simulating fetching contracts
      // In a real implementation, you would fetch from Supabase
      const mockContracts: Contract[] = [
        {
          id: "1",
          name: "Contrato Estándar",
          description: "Contrato estándar para ventas telefónicas",
          content: "Contenido del contrato con términos y condiciones...",
          isActive: true,
          criteria: ["Autorización explícita", "Confirmación de datos", "Explicación de tarifas"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "2",
          name: "Contrato Premium",
          description: "Contrato para ventas de servicios premium",
          content: "Contenido del contrato premium con condiciones específicas...",
          isActive: false,
          criteria: ["Verificación de identidad", "Autorización grabada", "Confirmación de términos"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      setContracts(mockContracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Error al cargar los contratos");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContractActive = async (id: string, currentState: boolean) => {
    try {
      setIsActivating(true);
      
      // In a real implementation, you would update the database
      // For now, we'll just update the state
      setContracts(prev => prev.map(contract => {
        if (contract.id === id) {
          return { ...contract, isActive: !currentState };
        }
        return contract;
      }));
      
      toast.success("Estado del contrato actualizado");
    } catch (error) {
      console.error("Error updating contract status:", error);
      toast.error("Error al actualizar el estado del contrato");
    } finally {
      setIsActivating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedContractId) return;
    
    try {
      // In a real implementation, you would delete from the database
      setContracts(prev => prev.filter(contract => contract.id !== selectedContractId));
      toast.success("Contrato eliminado correctamente");
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error("Error al eliminar el contrato");
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedContractId(null);
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

  if (contracts.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <FileText size={48} className="text-muted-foreground" />
          <h3 className="text-xl font-medium">No hay contratos creados</h3>
          <p className="text-muted-foreground max-w-md">
            Los contratos permiten evaluar el cumplimiento de criterios específicos durante llamadas de ventas.
          </p>
          <Button onClick={() => navigate("/contracts/new")}>
            Crear Contrato
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
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
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-medium">{contract.name}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {contract.description}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleContractActive(contract.id, contract.isActive)}
                    disabled={isActivating}
                    className="py-2 px-4 gap-2"
                    title={contract.isActive ? "Desactivar contrato" : "Activar contrato"}
                  >
                    {isActivating ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : contract.isActive ? (
                      <ToggleRight className="h-6 w-6 text-primary" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="ml-2">{contract.isActive ? "Activo" : "Activar"}</span>
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contract.criteria?.slice(0, 2).map((criterion, index) => (
                      <Badge key={index} variant="outline">
                        {criterion}
                      </Badge>
                    ))}
                    {contract.criteria && contract.criteria.length > 2 && (
                      <Badge variant="outline">+{contract.criteria.length - 2}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/contracts/edit/${contract.id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedContractId(contract.id);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Deseas eliminar este contrato?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 text-gray-900 hover:bg-gray-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
