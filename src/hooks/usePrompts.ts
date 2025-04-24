
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
          // Ensure the type is cast to PromptType since we're filtering by a valid type
          const typedPrompts = data.map(prompt => ({
            ...prompt,
            type: prompt.type as PromptType
          }));
          setPrompts(typedPrompts);
        }
        setLoading(false);
      });
  }, [type]);

  // Utility to get the active prompt quickly
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
  const activatePrompt = async (id: string) => {
    // Set all prompts of this type to inactive
    await supabase.from("prompts").update({ active: false }).eq("type", prompts.find(p => p.id === id)?.type);
    // Set the selected as active
    return updatePrompt(id, { active: true });
  };

  return {
    prompts,
    loading,
    activePrompt,
    createPrompt,
    updatePrompt,
    activatePrompt,
  };
}
