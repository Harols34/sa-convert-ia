
import { useState, useEffect, useCallback, useRef } from "react";
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
  
  // Use refs to prevent unnecessary re-renders
  const currentAccountRef = useRef(selectedAccountId);
  const currentUserRef = useRef(user?.id);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update refs when values change
  useEffect(() => {
    currentAccountRef.current = selectedAccountId;
  }, [selectedAccountId]);

  useEffect(() => {
    currentUserRef.current = user?.id;
  }, [user?.id]);

  const fetchPrompts = useCallback(async () => {
    if (!type || !user?.id) return;
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      console.log("Fetching prompts for type:", type, "account:", selectedAccountId, "user:", user?.id);
      
      let query = supabase
        .from("prompts")
        .select("*")
        .eq("type", type)
        .order("updated_at", { ascending: false });

      // Filter prompts based on current account selection
      if (selectedAccountId && selectedAccountId !== 'all') {
        console.log("Filtering prompts by account:", selectedAccountId);
        // Only show prompts for the selected account or global prompts
        query = query.or(`account_id.eq.${selectedAccountId},and(user_id.is.null,account_id.is.null)`);
      } else {
        // Show user's personal prompts and global prompts only
        query = query.or(`user_id.eq.${user?.id},and(user_id.is.null,account_id.is.null)`);
      }

      const { data, error } = await query.abortSignal(abortControllerRef.current.signal);

      if (error) {
        if (error.message.includes('aborted')) {
          console.log('Prompts request was aborted');
          return;
        }
        throw error;
      }
      
      if (data) {
        const typedPrompts = data.map(prompt => ({
          ...prompt,
          type: prompt.type as PromptType
        }));
        console.log("Prompts fetched for account", selectedAccountId, ":", typedPrompts.length);
        setPrompts(typedPrompts);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error("Error fetching prompts:", error);
      toast.error("Error al cargar los prompts");
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [type, selectedAccountId, user?.id]);

  // Only fetch when dependencies actually change
  useEffect(() => {
    if (type && user?.id) {
      fetchPrompts();
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [type, selectedAccountId, user?.id]); // Specific dependencies

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
      // First deactivate all prompts of this type for this user/account context
      const deactivateQuery = supabase.from("prompts").update({ active: false }).eq("type", type!);
      
      if (selectedAccountId && selectedAccountId !== 'all') {
        deactivateQuery.or(`account_id.eq.${selectedAccountId},user_id.eq.${user?.id},and(user_id.is.null,account_id.is.null)`);
      } else {
        deactivateQuery.or(`user_id.eq.${user?.id},and(user_id.is.null,account_id.is.null)`);
      }
      
      await deactivateQuery;
      
      // Then activate the selected prompt
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
