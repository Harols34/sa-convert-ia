
import { useState, useEffect } from "react";
import { Organization } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching organizations:", error);
        setError(error.message);
        return;
      }

      const mappedOrganizations: Organization[] = (data || []).map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        settings: (org.settings as Record<string, any>) || {},
        isActive: org.is_active,
        createdAt: org.created_at,
        updatedAt: org.updated_at
      }));

      setOrganizations(mappedOrganizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      setError("Error al cargar las organizaciones");
    } finally {
      setIsLoading(false);
    }
  };

  const createOrganization = async (organizationData: {
    name: string;
    slug: string;
    description?: string;
    settings?: Record<string, any>;
  }) => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          name: organizationData.name,
          slug: organizationData.slug,
          description: organizationData.description || null,
          settings: organizationData.settings || {},
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating organization:", error);
        toast.error("Error al crear la organización");
        throw error;
      }

      toast.success("Organización creada exitosamente");
      await fetchOrganizations();
      return data;
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    }
  };

  const updateOrganization = async (
    id: string,
    organizationData: Partial<{
      name: string;
      slug: string;
      description: string;
      settings: Record<string, any>;
      isActive: boolean;
    }>
  ) => {
    try {
      const updateData: any = {};
      
      if (organizationData.name !== undefined) updateData.name = organizationData.name;
      if (organizationData.slug !== undefined) updateData.slug = organizationData.slug;
      if (organizationData.description !== undefined) updateData.description = organizationData.description;
      if (organizationData.settings !== undefined) updateData.settings = organizationData.settings;
      if (organizationData.isActive !== undefined) updateData.is_active = organizationData.isActive;

      const { error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", id);

      if (error) {
        console.error("Error updating organization:", error);
        toast.error("Error al actualizar la organización");
        throw error;
      }

      toast.success("Organización actualizada exitosamente");
      await fetchOrganizations();
    } catch (error) {
      console.error("Error updating organization:", error);
      throw error;
    }
  };

  const deleteOrganization = async (id: string) => {
    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting organization:", error);
        toast.error("Error al eliminar la organización");
        throw error;
      }

      toast.success("Organización eliminada exitosamente");
      await fetchOrganizations();
    } catch (error) {
      console.error("Error deleting organization:", error);
      throw error;
    }
  };

  const getUserOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          organization_id,
          organizations:organization_id (*)
        `)
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (error) {
        console.error("Error fetching user organization:", error);
        return null;
      }

      if (!data.organizations) {
        return null;
      }

      const org = data.organizations as any;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        settings: (org.settings as Record<string, any>) || {},
        isActive: org.is_active,
        createdAt: org.created_at,
        updatedAt: org.updated_at
      } as Organization;
    } catch (error) {
      console.error("Error fetching user organization:", error);
      return null;
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return {
    organizations,
    isLoading,
    error,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    getUserOrganization
  };
}
