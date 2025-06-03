
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Organization } from "@/lib/types";
import { toast } from "sonner";

export default function OrganizationManager() {
  const { organizations, isLoading, createOrganization, updateOrganization, deleteOrganization } = useOrganizations();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: ""
  });

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createOrganization({
        name: formData.name,
        slug: formData.slug,
        description: formData.description
      });
      
      setFormData({ name: "", slug: "", description: "" });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Error creating organization:", error);
    }
  };

  const handleEditOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingOrganization) return;
    
    try {
      await updateOrganization(editingOrganization.id, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description
      });
      
      setFormData({ name: "", slug: "", description: "" });
      setEditingOrganization(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating organization:", error);
    }
  };

  const handleDeleteOrganization = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta organización? Esta acción no se puede deshacer.")) {
      try {
        await deleteOrganization(id);
      } catch (error) {
        console.error("Error deleting organization:", error);
      }
    }
  };

  const openEditDialog = (org: Organization) => {
    setEditingOrganization(org);
    setFormData({
      name: org.name,
      slug: org.slug,
      description: org.description || ""
    });
    setIsEditDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando organizaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Organizaciones</h1>
          <p className="text-muted-foreground">
            Administra las organizaciones y campañas del sistema
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Organización
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Organización</DialogTitle>
              <DialogDescription>
                Crea una nueva organización o campaña en el sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Organización</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: TIGO, CLARO, MUNDO"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Identificador (Slug)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="ej: tigo, claro, mundo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción de la organización..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Crear Organización</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizaciones
          </CardTitle>
          <CardDescription>
            Lista de todas las organizaciones en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{org.slug}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {org.description || "Sin descripción"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.isActive ? "default" : "destructive"}>
                      {org.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(org.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(org)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteOrganization(org.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Organización</DialogTitle>
            <DialogDescription>
              Modifica los datos de la organización
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditOrganization} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre de la Organización</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: TIGO, CLARO, MUNDO"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-slug">Identificador (Slug)</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="ej: tigo, claro, mundo"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la organización..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
