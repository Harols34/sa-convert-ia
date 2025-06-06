
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
  
  // Use refs to track current values and prevent unnecessary re-fetches
  const lastFetchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPrompts = useCallback(async () => {
    if (!type || !user?.id) return;
    
    // Create a unique key for this fetch request
    const fetchKey = `${type}-${selectedAccountId}-${user.id}`;
    
    // Skip if we already fetched the same data
    if (lastFetchRef.current === fetchKey) {
      return;
    }
    
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

      // Apply strict account-based filtering
      if (selectedAccountId && selectedAccountId !== 'all') {
        console.log("Filtering prompts by specific account:", selectedAccountId);
        // Show only prompts for the selected account or global prompts (no user_id and no account_id)
        query = query.or(`account_id.eq.${selectedAccountId},and(user_id.is.null,account_id.is.null)`);
      } else {
        // Show user's personal prompts and global prompts only
        console.log("Filtering prompts for user and global prompts");
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
        console.log("Prompts fetched and filtered for account", selectedAccountId, ":", typedPrompts.length);
        setPrompts(typedPrompts);
        lastFetchRef.current = fetchKey; // Mark this fetch as completed
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

  // Only fetch when necessary - prevent automatic reloads
  useEffect(() => {
    if (type && user?.id) {
      // Small delay to prevent multiple rapid calls
      const timeoutId = setTimeout(fetchPrompts, 100);
      return () => clearTimeout(timeoutId);
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [type, selectedAccountId, user?.id]);

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
      
      // Reset fetch cache to force refresh
      lastFetchRef.current = '';
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
      
      // Reset fetch cache to force refresh
      lastFetchRef.current = '';
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
      
      // Reset fetch cache to force refresh
      lastFetchRef.current = '';
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
