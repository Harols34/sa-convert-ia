
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Account {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('name');

      if (accountsError) throw accountsError;

      setAccounts(data || []);
    } catch (err: any) {
      console.error("Error fetching accounts:", err);
      setError(err.message || "Error al cargar las cuentas");
      toast.error("Error al cargar las cuentas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    fetchAccounts
  };
}
