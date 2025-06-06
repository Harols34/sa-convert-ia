
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { Account } from "@/lib/types";
import { toast } from "sonner";

interface AccountContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (accountId: string | null) => void;
  userAccounts: Account[];
  allAccounts: Account[];
  isLoading: boolean;
  error: string | null;
  refreshAccounts: () => Promise<void>;
  createAccount: (name: string) => Promise<boolean>;
  loadAccounts: () => Promise<void>;
  updateAccountStatus: (accountId: string, status: 'active' | 'inactive') => Promise<boolean>;
  assignUserToAccount: (userId: string, accountId: string) => Promise<boolean>;
  removeUserFromAccount: (userId: string, accountId: string) => Promise<boolean>;
  getUserAccounts: (userId: string) => Promise<Account[]>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session, userRole } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [userAccounts, setUserAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fetch accounts if user has permissions and is authenticated
  const shouldFetchAccounts = user && session && (userRole === 'superAdmin' || userRole === 'admin');

  const fetchUserAccounts = async () => {
    if (!shouldFetchAccounts) {
      console.log("User doesn't need account data, skipping fetch");
      setUserAccounts([]);
      setAllAccounts([]);
      setSelectedAccountId(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("Fetching accounts for user role:", userRole);

      let accountsData: Account[] = [];

      if (userRole === 'superAdmin') {
        // SuperAdmin can see all accounts
        const { data, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (accountsError) {
          throw accountsError;
        }

        // Cast to proper Account type
        accountsData = (data || []).map(account => ({
          ...account,
          status: account.status as 'active' | 'inactive'
        })) as Account[];
        
        setAllAccounts(accountsData);
      } else if (userRole === 'admin') {
        // Admin can see accounts they're assigned to
        const { data, error: userAccountsError } = await supabase
          .from('user_accounts')
          .select(`
            account_id,
            accounts:account_id (
              id,
              name,
              status,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', user.id);

        if (userAccountsError) {
          throw userAccountsError;
        }

        accountsData = (data || [])
          .map(ua => ua.accounts)
          .filter(account => account && account.status === 'active')
          .map(account => ({
            ...account,
            status: account.status as 'active' | 'inactive'
          })) as Account[];
      }

      console.log("Accounts fetched:", accountsData.length);
      setUserAccounts(accountsData);

      // Set initial selected account
      if (accountsData.length > 0) {
        const savedAccountId = localStorage.getItem('selectedAccountId');
        const validSavedAccount = savedAccountId && accountsData.find(acc => acc.id === savedAccountId);
        
        if (validSavedAccount) {
          setSelectedAccountId(savedAccountId);
        } else if (userRole === 'superAdmin') {
          setSelectedAccountId('all');
        } else {
          setSelectedAccountId(accountsData[0].id);
        }
      } else {
        setSelectedAccountId(null);
      }

    } catch (err: any) {
      console.error("Error fetching accounts:", err);
      setError(err.message || "Error al cargar las cuentas");
      setUserAccounts([]);
      setAllAccounts([]);
      setSelectedAccountId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load all accounts (for SuperAdmin)
  const loadAccounts = async () => {
    if (userRole !== 'superAdmin') return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');

      if (error) throw error;

      const accounts = (data || []).map(account => ({
        ...account,
        status: account.status as 'active' | 'inactive'
      })) as Account[];

      setAllAccounts(accounts);
    } catch (err: any) {
      console.error("Error loading all accounts:", err);
      setError(err.message || "Error al cargar las cuentas");
    } finally {
      setIsLoading(false);
    }
  };

  // Create new account
  const createAccount = async (name: string): Promise<boolean> => {
    if (userRole !== 'superAdmin') {
      toast.error("Solo los SuperAdmins pueden crear cuentas");
      return false;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .insert([{ name, status: 'active' }]);

      if (error) throw error;

      toast.success("Cuenta creada exitosamente");
      await loadAccounts();
      return true;
    } catch (err: any) {
      console.error("Error creating account:", err);
      toast.error(err.message || "Error al crear la cuenta");
      return false;
    }
  };

  // Update account status
  const updateAccountStatus = async (accountId: string, status: 'active' | 'inactive'): Promise<boolean> => {
    if (userRole !== 'superAdmin') {
      toast.error("Solo los SuperAdmins pueden modificar cuentas");
      return false;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .update({ status })
        .eq('id', accountId);

      if (error) throw error;

      await loadAccounts();
      return true;
    } catch (err: any) {
      console.error("Error updating account status:", err);
      toast.error(err.message || "Error al actualizar la cuenta");
      return false;
    }
  };

  // Assign user to account
  const assignUserToAccount = async (userId: string, accountId: string): Promise<boolean> => {
    if (userRole !== 'superAdmin') {
      toast.error("Solo los SuperAdmins pueden asignar usuarios");
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_accounts')
        .insert([{ user_id: userId, account_id: accountId }]);

      if (error) throw error;

      toast.success("Usuario asignado exitosamente");
      return true;
    } catch (err: any) {
      console.error("Error assigning user to account:", err);
      toast.error(err.message || "Error al asignar usuario");
      return false;
    }
  };

  // Remove user from account
  const removeUserFromAccount = async (userId: string, accountId: string): Promise<boolean> => {
    if (userRole !== 'superAdmin') {
      toast.error("Solo los SuperAdmins pueden remover usuarios");
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('account_id', accountId);

      if (error) throw error;

      toast.success("Usuario removido exitosamente");
      return true;
    } catch (err: any) {
      console.error("Error removing user from account:", err);
      toast.error(err.message || "Error al remover usuario");
      return false;
    }
  };

  // Get user accounts
  const getUserAccounts = async (userId: string): Promise<Account[]> => {
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select(`
          account_id,
          accounts:account_id (
            id,
            name,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      return (data || [])
        .map(ua => ua.accounts)
        .filter(account => account)
        .map(account => ({
          ...account,
          status: account.status as 'active' | 'inactive'
        })) as Account[];
    } catch (err: any) {
      console.error("Error fetching user accounts:", err);
      return [];
    }
  };

  // Fetch accounts when user or session changes
  useEffect(() => {
    if (user && session) {
      fetchUserAccounts();
    } else {
      // Clear data when no user/session
      setUserAccounts([]);
      setAllAccounts([]);
      setSelectedAccountId(null);
      setIsLoading(false);
      setError(null);
    }
  }, [user, session, userRole]);

  // Save selected account to localStorage
  useEffect(() => {
    if (selectedAccountId) {
      localStorage.setItem('selectedAccountId', selectedAccountId);
    } else {
      localStorage.removeItem('selectedAccountId');
    }
  }, [selectedAccountId]);

  const refreshAccounts = async () => {
    await fetchUserAccounts();
  };

  const value: AccountContextType = {
    selectedAccountId,
    setSelectedAccountId,
    userAccounts,
    allAccounts,
    isLoading,
    error,
    refreshAccounts,
    createAccount,
    loadAccounts,
    updateAccountStatus,
    assignUserToAccount,
    removeUserFromAccount,
    getUserAccounts,
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
};
