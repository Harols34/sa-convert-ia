
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface Account {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface AccountContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (accountId: string | null) => void;
  userAccounts: Account[];
  allAccounts: Account[];
  isLoading: boolean;
  refreshAccounts: () => Promise<void>;
  loadAccounts: () => Promise<void>;
  createAccount: (name: string) => Promise<boolean>;
  updateAccountStatus: (accountId: string, status: 'active' | 'inactive') => Promise<boolean>;
  assignUserToAccount: (userId: string, accountId: string) => Promise<boolean>;
  removeUserFromAccount: (userId: string, accountId: string) => Promise<boolean>;
  getUserAccounts: (userId: string) => Promise<Account[]>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};

interface AccountProviderProps {
  children: React.ReactNode;
}

export const AccountProvider: React.FC<AccountProviderProps> = ({ children }) => {
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(null);
  const [userAccounts, setUserAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  // Create a unique storage key per user to avoid conflicts between tabs
  const getStorageKey = useCallback(() => {
    return user?.id ? `selectedAccount_${user.id}` : 'selectedAccount_default';
  }, [user?.id]);

  const setSelectedAccountId = useCallback((accountId: string | null) => {
    setSelectedAccountIdState(accountId);
    // Store per user to avoid multi-tab conflicts
    if (accountId) {
      localStorage.setItem(getStorageKey(), accountId);
    } else {
      localStorage.removeItem(getStorageKey());
    }
  }, [getStorageKey]);

  const fetchUserAccounts = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch user accounts based on role
      if (user.role === 'superAdmin') {
        // SuperAdmin can see all accounts
        const { data: allAccountsData, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (error) throw error;
        setUserAccounts(allAccountsData || []);
      } else {
        // Regular users see only their assigned accounts
        const { data: userAccountsData, error } = await supabase
          .from('user_accounts')
          .select(`
            accounts!inner (
              id,
              name,
              status,
              created_at
            )
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        const accounts = userAccountsData
          ?.map(ua => ua.accounts)
          .filter(account => account.status === 'active') || [];
        
        setUserAccounts(accounts);
      }

      // Auto-select account based on stored preference or default logic
      const storedAccountId = localStorage.getItem(getStorageKey());
      
      if (storedAccountId && userAccounts.some(acc => acc.id === storedAccountId)) {
        setSelectedAccountIdState(storedAccountId);
      } else if (userAccounts.length > 0) {
        // Auto-select first account if no stored preference
        const firstAccountId = userAccounts[0]?.id;
        if (firstAccountId) {
          setSelectedAccountId(firstAccountId);
        }
      }
      
    } catch (error) {
      console.error('Error fetching user accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role, isAuthenticated, getStorageKey, userAccounts.length]);

  const loadAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');

      if (error) throw error;
      setAllAccounts(data || []);
    } catch (error) {
      console.error('Error loading all accounts:', error);
      toast.error('Error al cargar las cuentas');
    }
  }, []);

  const createAccount = useCallback(async (name: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('accounts')
        .insert([{ name, status: 'active' }]);

      if (error) throw error;
      
      toast.success('Cuenta creada exitosamente');
      await loadAccounts();
      await fetchUserAccounts();
      return true;
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'Error al crear la cuenta');
      return false;
    }
  }, [loadAccounts, fetchUserAccounts]);

  const updateAccountStatus = useCallback(async (accountId: string, status: 'active' | 'inactive'): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ status })
        .eq('id', accountId);

      if (error) throw error;
      
      await loadAccounts();
      await fetchUserAccounts();
      return true;
    } catch (error: any) {
      console.error('Error updating account status:', error);
      toast.error(error.message || 'Error al actualizar el estado de la cuenta');
      return false;
    }
  }, [loadAccounts, fetchUserAccounts]);

  const assignUserToAccount = useCallback(async (userId: string, accountId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_accounts')
        .insert([{ user_id: userId, account_id: accountId }]);

      if (error) throw error;
      
      toast.success('Usuario asignado exitosamente');
      return true;
    } catch (error: any) {
      console.error('Error assigning user to account:', error);
      toast.error(error.message || 'Error al asignar usuario');
      return false;
    }
  }, []);

  const removeUserFromAccount = useCallback(async (userId: string, accountId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('account_id', accountId);

      if (error) throw error;
      
      toast.success('Usuario removido exitosamente');
      return true;
    } catch (error: any) {
      console.error('Error removing user from account:', error);
      toast.error(error.message || 'Error al remover usuario');
      return false;
    }
  }, []);

  const getUserAccounts = useCallback(async (userId: string): Promise<Account[]> => {
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select(`
          accounts!inner (
            id,
            name,
            status,
            created_at
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      
      return data?.map(ua => ua.accounts) || [];
    } catch (error) {
      console.error('Error getting user accounts:', error);
      return [];
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    await fetchUserAccounts();
    await loadAccounts();
  }, [fetchUserAccounts, loadAccounts]);

  // Load saved account selection on mount
  useEffect(() => {
    if (user?.id) {
      const storedAccountId = localStorage.getItem(getStorageKey());
      if (storedAccountId) {
        setSelectedAccountIdState(storedAccountId);
      }
    }
  }, [user?.id, getStorageKey]);

  // Fetch accounts when user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUserAccounts();
      if (user.role === 'superAdmin') {
        loadAccounts();
      }
    } else {
      setUserAccounts([]);
      setAllAccounts([]);
      setSelectedAccountIdState(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, user?.role, fetchUserAccounts, loadAccounts]);

  const value: AccountContextType = {
    selectedAccountId,
    setSelectedAccountId,
    userAccounts,
    allAccounts,
    isLoading,
    refreshAccounts,
    loadAccounts,
    createAccount,
    updateAccountStatus,
    assignUserToAccount,
    removeUserFromAccount,
    getUserAccounts
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};
