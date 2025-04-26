
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    if (!type) return;
    setLoading(true);
    supabase
      .from("prompts")
      .select("*")
      .eq("type", type)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const typedPrompts = data.map(prompt => ({
            ...prompt,
            type: prompt.type as PromptType
          }));
          setPrompts(typedPrompts);
        }
        setLoading(false);
      });
  }, [type]);

  // Get the active prompt quickly
  const activePrompt = prompts.find((p) => p.active);

  const createPrompt = async (p: Omit<Prompt, "id" | "updated_at">) => {
    const { data } = await supabase.from("prompts").insert([p]).select();
    return data?.[0] as Prompt;
  };

  const updatePrompt = async (id: string, updates: Partial<Prompt>) => {
    const { data } = await supabase.from("prompts").update(updates).eq("id", id).select();
    return data?.[0] as Prompt;
  };

  // Utility to activate just one prompt for this type
  const togglePromptActive = async (id: string, currentState: boolean) => {
    return updatePrompt(id, { active: !currentState });
  };

  return {
    prompts,
    loading,
    activePrompt,
    createPrompt,
    updatePrompt,
    togglePromptActive,
  };
}
