
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PromptType = "summary" | "feedback";

export interface Prompt {
  id: string;
  name: string;
  content: string;
  type: PromptType;
  active: boolean;
  updated_at: string;
}

export function usePrompts(type?: PromptType) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPrompts = useCallback(async () => {
    if (!type) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("type", type)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      if (data) {
        const typedPrompts = data.map(prompt => ({
          ...prompt,
          type: prompt.type as PromptType
        }));
        setPrompts(typedPrompts);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Error al cargar los prompts");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Get the active prompt quickly
  const activePrompt = prompts.find((p) => p.active);

  const createPrompt = async (p: Omit<Prompt, "id" | "updated_at">) => {
    try {
      const { data, error } = await supabase.from("prompts").insert([p]).select();
      
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
