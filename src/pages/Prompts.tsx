import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, MessageSquare, ToggleRight, ToggleLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Prompt, PromptType } from "@/hooks/usePrompts";

export default function PromptsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated && !loading) {
        toast.error("Sesión expirada", {
          description: "Por favor inicia sesión para continuar"
        });
        navigate("/login", { replace: true });
        return false;
      }
      setIsLoading(false);
      return true;
    };

    const timer = setTimeout(() => {
      checkAuth();
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      const typedPrompts = data?.map(prompt => ({
        ...prompt,
        type: prompt.type as PromptType
      })) || [];
      
      setPrompts(typedPrompts);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Error al cargar los prompts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPromptId) return;

    try {
      const { error } = await supabase
        .from("prompts")
        .delete()
        .eq("id", selectedPromptId);

      if (error) throw error;

      setPrompts((prev) => prev.filter((prompt) => prompt.id !== selectedPromptId));
      toast.success("Prompt eliminado correctamente");
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error("Error al eliminar el prompt");
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedPromptId(null);
    }
  };

  const togglePromptActive = async (promptId: string, promptType: PromptType) => {
    try {
      setIsActivating(true);
      
      const { error } = await supabase
        .from("prompts")
        .update({ active: true })
        .eq("id", promptId);
      
      if (error) throw error;
      
      await fetchPrompts();
      
      toast.success("Estado del prompt actualizado correctamente");
    } catch (error) {
      console.error("Error updating prompt status:", error);
      toast.error("Error al actualizar el estado del prompt");
    } finally {
      setIsActivating(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 md:p-6 ml-0 md:ml-64 transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Prompts</h2>
              <p className="text-muted-foreground">
                Gestiona los prompts para análisis y resúmenes de llamadas
              </p>
            </div>
            <Button
              onClick={() => navigate("/prompts/new")}
              className="mt-4 md:mt-0 bg-green-600 text-white hover:bg-green-700"
            >
              <MessageSquare className="mr-2 h-4 w-4" /> Nuevo Prompt
            </Button>
          </div>

          <Card className="overflow-hidden shadow-md border-gray-200">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Nombre</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tipo</TableHead>
                    <TableHead className="font-semibold text-gray-700">Estado</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prompts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No hay prompts disponibles
                      </TableCell>
                    </TableRow>
                  ) : (
                    prompts.map((prompt) => (
                      <TableRow key={prompt.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{prompt.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={prompt.type === "summary" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-green-100 text-green-800 border-green-300"}>
                            {prompt.type === "summary" ? "Resumen" : "Feedback"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="state" 
                            className={prompt.active ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"}
                          >
                            {prompt.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePromptActive(prompt.id, prompt.type)}
                            disabled={isActivating || prompt.active}
                            className={`hover:bg-green-50 py-1.5 px-3 ${
                              prompt.active ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
                            }`}
                            title={prompt.active ? "Prompt activo" : "Activar prompt"}
                          >
                            {isActivating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                {prompt.active ? (
                                  <ToggleRight className="mr-2 h-5 w-5" />
                                ) : (
                                  <ToggleLeft className="mr-2 h-5 w-5" />
                                )}
                                {prompt.active ? "Activo" : "Activar"}
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/prompts/edit/${prompt.id}`)}
                            className="hover:bg-gray-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedPromptId(prompt.id);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="hover:bg-red-50 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </main>
      </div>
      <div className="ml-0 md:ml-64 transition-all duration-300">
        <Footer />
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Deseas eliminar este prompt?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 text-gray-900 hover:bg-gray-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
