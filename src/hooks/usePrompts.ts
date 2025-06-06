
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";

export type PromptType = "summary" | "feedback";

export interface Prompt {
  id: string;
  name: string;
  content: string;
  type: PromptType;
  active: boolean;
  updated_at: string;
  account_id?: string;
  user_id?: string;
}

export function usePrompts(type?: PromptType) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();

  const fetchPrompts = useCallback(async () => {
    if (!type || !user) return;
    
    try {
      setLoading(true);
      console.log("Fetching prompts for type:", type, "account:", selectedAccountId, "user:", user.id);
      
      let query = supabase
        .from("prompts")
        .select("*")
        .eq("type", type)
        .order("updated_at", { ascending: false });

      // Filtrar por prompts del usuario o de la cuenta (si no es personal)
      if (selectedAccountId && selectedAccountId !== 'all') {
        query = query.or(`user_id.eq.${user.id},and(account_id.eq.${selectedAccountId},user_id.is.null)`);
      } else {
        // Solo mostrar prompts del usuario si no hay cuenta seleccionada
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (data) {
        const typedPrompts = data.map(prompt => ({
          ...prompt,
          type: prompt.type as PromptType
        }));
        console.log("Prompts fetched:", typedPrompts.length);
        setPrompts(typedPrompts);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Error al cargar los prompts");
    } finally {
      setLoading(false);
    }
  }, [type, selectedAccountId, user]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Get the active prompt quickly
  const activePrompt = prompts.find((p) => p.active);

  const createPrompt = async (p: Omit<Prompt, "id" | "updated_at">) => {
    try {
      const promptData = {
        ...p,
        account_id: selectedAccountId && selectedAccountId !== 'all' ? selectedAccountId : null,
        user_id: user?.id || null
      };
      
      const { data, error } = await supabase.from("prompts").insert([promptData]).select();
      
      if (error) throw error;
      
      await fetchPrompts();
      return data?.[0] as Prompt;
    } catch (error) {
      console.error("Error creating prompt:", error);
      throw error;
    }
  };

  const updatePrompt = async (id: string, updates: Partial<Prompt>) => {
    try {
      const { data, error } = await supabase.from("prompts").update(updates).eq("id", id).select();
      
      if (error) throw error;
      
      await fetchPrompts();
      return data?.[0] as Prompt;
    } catch (error) {
      console.error("Error updating prompt:", error);
      throw error;
    }
  };

  // Utility to activate just one prompt for this type
  const togglePromptActive = async (promptId: string) => {
    try {
      const { error } = await supabase.from("prompts").update({ active: true }).eq("id", promptId);
      
      if (error) throw error;
      
      await fetchPrompts();
      return true;
    } catch (error) {
      console.error("Error toggling prompt active state:", error);
      throw error;
    }
  };

  return {
    prompts,
    loading,
    activePrompt,
    createPrompt,
    updatePrompt,
    togglePromptActive,
    fetchPrompts
  };
}
