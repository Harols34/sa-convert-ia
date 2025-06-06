
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";

export interface Behavior {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  account_id?: string;
}

export function useBehaviors() {
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedAccountId } = useAccount();

  const fetchBehaviors = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching behaviors with account filter:", selectedAccountId);
      
      let query = supabase
        .from("behaviors")
        .select("*")
        .order("updated_at", { ascending: false });

      // Aplicar filtro de cuenta si hay una seleccionada y no es 'all'
      if (selectedAccountId && selectedAccountId !== 'all') {
        console.log("Filtering behaviors by account:", selectedAccountId);
        query = query.eq('account_id', selectedAccountId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log("Behaviors fetched:", data?.length || 0);
      setBehaviors(data || []);
    } catch (error) {
      console.error("Error fetching behaviors:", error);
      toast.error("Error al cargar los comportamientos");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchBehaviors();
  }, [fetchBehaviors]);

  const createBehavior = async (behaviorData: Omit<Behavior, "id" | "created_at" | "updated_at">) => {
    try {
      const newBehavior = {
        ...behaviorData,
        account_id: selectedAccountId && selectedAccountId !== 'all' ? selectedAccountId : null
      };
      
      const { data, error } = await supabase
        .from("behaviors")
        .insert([newBehavior])
        .select();
      
      if (error) throw error;
      
      await fetchBehaviors();
      return data?.[0] as Behavior;
    } catch (error) {
      console.error("Error creating behavior:", error);
      throw error;
    }
  };

  const updateBehavior = async (id: string, updates: Partial<Behavior>) => {
    try {
      const { data, error } = await supabase
        .from("behaviors")
        .update(updates)
        .eq("id", id)
        .select();
      
      if (error) throw error;
      
      await fetchBehaviors();
      return data?.[0] as Behavior;
    } catch (error) {
      console.error("Error updating behavior:", error);
      throw error;
    }
  };

  const deleteBehavior = async (id: string) => {
    try {
      const { error } = await supabase
        .from("behaviors")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      await fetchBehaviors();
    } catch (error) {
      console.error("Error deleting behavior:", error);
      throw error;
    }
  };

  return {
    behaviors,
    loading,
    createBehavior,
    updateBehavior,
    deleteBehavior,
    fetchBehaviors
  };
}
