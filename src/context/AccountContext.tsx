
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface AccountContextType {
  userAccounts: Account[];
  selectedAccountId: string | null;
  setSelectedAccountId: (accountId: string | null) => void;
  allAccounts: Account[];
  loadAccounts: () => Promise<void>;
  createAccount: (name: string) => Promise<boolean>;
  updateAccountStatus: (accountId: string, status: 'active' | 'inactive') => Promise<boolean>;
  assignUserToAccount: (userId: string, accountId: string) => Promise<boolean>;
  removeUserFromAccount: (userId: string, accountId: string) => Promise<boolean>;
  getUserAccounts: (userId: string) => Promise<Account[]>;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [userAccounts, setUserAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create fallback accounts for demo/offline mode
  const createFallbackAccounts = (): Account[] => {
    return [
      {
        id: 'demo-account-1',
        name: 'Cuenta Demo Principal',
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-account-2',
        name: 'Cuenta Demo Secundaria',
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  };

  // Optimized account loading with fallback
  const loadUserAccounts = React.useCallback(async () => {
    if (!user || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      console.log("Loading user accounts for user:", user.id, "role:", user.role);
      setIsLoading(true);
      
      if (user.role === 'superAdmin') {
        try {
          // SuperAdmin sees ALL accounts
          const { data: accounts, error } = await supabase
            .from('accounts')
            .select('*')
            .order('name');

          if (error) {
            console.error("Error loading accounts for SuperAdmin:", error);
            // Use fallback accounts
            const fallbackAccounts = createFallbackAccounts();
            setUserAccounts(fallbackAccounts);
            setAllAccounts(fallbackAccounts);
            return;
          }
          
          const formattedAccounts = (accounts || []).map(account => ({
            ...account,
            status: account.status as 'active' | 'inactive'
          }));
          
          setUserAccounts(formattedAccounts);
          setAllAccounts(formattedAccounts);
        } catch (error) {
          console.error("Network error loading accounts:", error);
          // Use fallback accounts
          const fallbackAccounts = createFallbackAccounts();
          setUserAccounts(fallbackAccounts);
          setAllAccounts(fallbackAccounts);
        }
      } else {
        try {
          // Regular users see only assigned accounts
          const { data: userAccountsData, error } = await supabase
            .from('user_accounts')
            .select(`
              account_id,
              accounts!inner (
                id,
                name,
                created_at,
                updated_at,
                status
              )
            `)
            .eq('user_id', user.id);

          if (error) {
            console.error("Error loading user accounts:", error);
            // Use fallback single account for regular users
            const fallbackAccounts = [createFallbackAccounts()[0]];
            setUserAccounts(fallbackAccounts);
            return;
          }

          const accounts = userAccountsData?.map(ua => ({
            ...ua.accounts,
            status: ua.accounts.status as 'active' | 'inactive'
          })).filter(Boolean) || [];
          
          // If no accounts found, provide fallback
          if (accounts.length === 0) {
            const fallbackAccounts = [createFallbackAccounts()[0]];
            setUserAccounts(fallbackAccounts);
          } else {
            setUserAccounts(accounts as Account[]);
          }
        } catch (error) {
          console.error("Network error loading user accounts:", error);
          // Use fallback single account
          const fallbackAccounts = [createFallbackAccounts()[0]];
          setUserAccounts(fallbackAccounts);
        }
      }
    } catch (error) {
      console.error('Unexpected error loading user accounts:', error);
      // Always provide fallback
      const fallbackAccounts = createFallbackAccounts();
      setUserAccounts(user?.role === 'superAdmin' ? fallbackAccounts : [fallbackAccounts[0]]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  // Load all accounts (for SuperAdmin)
  const loadAccounts = async () => {
    if (!user || user.role !== 'superAdmin') return;

    try {
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading all accounts:', error);
        const fallbackAccounts = createFallbackAccounts();
        setAllAccounts(fallbackAccounts);
        return;
      }
      
      const formattedAccounts = (accounts || []).map(account => ({
        ...account,
        status: account.status as 'active' | 'inactive'
      }));
      
      setAllAccounts(formattedAccounts);
    } catch (error) {
      console.error('Network error loading all accounts:', error);
      const fallbackAccounts = createFallbackAccounts();
      setAllAccounts(fallbackAccounts);
    }
  };

  // Auto-select account logic - improved
  const handleAccountSelection = React.useCallback(() => {
    if (userAccounts.length === 0) {
      setSelectedAccountId(null);
      return;
    }

    // For single account users, auto-select immediately
    if (userAccounts.length === 1) {
      console.log("Auto-selecting single account:", userAccounts[0].id);
      setSelectedAccountId(userAccounts[0].id);
      return;
    }

    // For multiple accounts, check saved preference
    const savedAccountId = localStorage.getItem('selectedAccountId');
    if (savedAccountId && userAccounts.some(acc => acc.id === savedAccountId)) {
      console.log("Using saved account selection:", savedAccountId);
      setSelectedAccountId(savedAccountId);
    } else if (user?.role === 'superAdmin') {
      // SuperAdmin defaults to 'all'
      console.log("SuperAdmin defaulting to 'all'");
      setSelectedAccountId('all');
    } else {
      // Regular users default to first account
      console.log("Defaulting to first account:", userAccounts[0].id);
      setSelectedAccountId(userAccounts[0].id);
    }
  }, [userAccounts, user?.role]);

  // Create new account
  const createAccount = async (name: string): Promise<boolean> => {
    if (!user || user.role !== 'superAdmin') {
      toast.error('No tienes permisos para crear cuentas');
      return false;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .insert([{ name, status: 'active' }]);

      if (error) throw error;

      toast.success('Cuenta creada exitosamente');
      await Promise.all([loadAccounts(), loadUserAccounts()]);
      return true;
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Error al crear la cuenta');
      return false;
    }
  };

  // Update account status
  const updateAccountStatus = async (accountId: string, status: 'active' | 'inactive'): Promise<boolean> => {
    if (!user || user.role !== 'superAdmin') {
      toast.error('No tienes permisos para actualizar cuentas');
      return false;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .update({ status })
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Estado de cuenta actualizado');
      await Promise.all([loadAccounts(), loadUserAccounts()]);
      return true;
    } catch (error) {
      console.error('Error updating account status:', error);
      toast.error('Error al actualizar el estado de la cuenta');
      return false;
    }
  };

  // Assign user to account
  const assignUserToAccount = async (userId: string, accountId: string): Promise<boolean> => {
    if (!user || user.role !== 'superAdmin') {
      toast.error('No tienes permisos para asignar usuarios');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_accounts')
        .insert([{ user_id: userId, account_id: accountId }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('El usuario ya está asignado a esta cuenta');
        } else {
          throw error;
        }
        return false;
      }

      toast.success('Usuario asignado a la cuenta exitosamente');
      return true;
    } catch (error) {
      console.error('Error assigning user to account:', error);
      toast.error('Error al asignar usuario a la cuenta');
      return false;
    }
  };

  // Remove user from account
  const removeUserFromAccount = async (userId: string, accountId: string): Promise<boolean> => {
    if (!user || user.role !== 'superAdmin') {
      toast.error('No tienes permisos para remover usuarios');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('account_id', accountId);

      if (error) throw error;

      toast.success('Usuario removido de la cuenta exitosamente');
      return true;
    } catch (error) {
      console.error('Error removing user from account:', error);
      toast.error('Error al remover usuario de la cuenta');
      return false;
    }
  };

  // Get accounts for specific user
  const getUserAccounts = async (userId: string): Promise<Account[]> => {
    try {
      const { data: userAccountsData, error } = await supabase
        .from('user_accounts')
        .select(`
          account_id,
          accounts!inner (
            id,
            name,
            created_at,
            updated_at,
            status
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      return userAccountsData?.map(ua => ({
        ...ua.accounts,
        status: ua.accounts.status as 'active' | 'inactive'
      })).filter(Boolean) as Account[] || [];
    } catch (error) {
      console.error('Error getting user accounts:', error);
      return [];
    }
  };

  // Initialize accounts when user changes
  useEffect(() => {
    let mounted = true;

    const initializeAccounts = async () => {
      if (user && isAuthenticated) {
        console.log("Initializing accounts for user:", user.id, "role:", user.role);
        
        try {
          await loadUserAccounts();
          
          if (user.role === 'superAdmin') {
            await loadAccounts();
          }
        } catch (error) {
          console.error('Error initializing accounts:', error);
        }
      } else {
        if (mounted) {
          setUserAccounts([]);
          setAllAccounts([]);
          setSelectedAccountId(null);
          setIsLoading(false);
        }
      }
    };

    initializeAccounts();

    return () => {
      mounted = false;
    };
  }, [user, isAuthenticated, loadUserAccounts]);

  // Handle account selection after accounts are loaded
  useEffect(() => {
    if (!isLoading && userAccounts.length > 0) {
      handleAccountSelection();
    }
  }, [isLoading, userAccounts, handleAccountSelection]);

  // Update localStorage when account selection changes
  useEffect(() => {
    if (selectedAccountId && selectedAccountId !== 'all') {
      localStorage.setItem('selectedAccountId', selectedAccountId);
    } else {
      localStorage.removeItem('selectedAccountId');
    }
  }, [selectedAccountId]);

  return (
    <AccountContext.Provider
      value={{
        userAccounts,
        selectedAccountId,
        setSelectedAccountId,
        allAccounts,
        loadAccounts,
        createAccount,
        updateAccountStatus,
        assignUserToAccount,
        removeUserFromAccount,
        getUserAccounts,
        isLoading,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};
