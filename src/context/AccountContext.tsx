
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account, UserAccount } from '@/lib/types';
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
  const [isLoading, setIsLoading] = useState(true);

  // Optimized account loading with better error handling
  const loadUserAccounts = async () => {
    if (!user || !isAuthenticated) return;

    try {
      console.log("Loading user accounts for user:", user.id, "role:", user.role);
      
      if (user.role === 'superAdmin') {
        // SuperAdmin sees ALL accounts
        const { data: accounts, error } = await supabase
          .from('accounts')
          .select('*')
          .order('name');

        if (error) {
          console.error("Error loading accounts for SuperAdmin:", error);
          return;
        }
        
        console.log("SuperAdmin accounts loaded:", accounts?.length || 0);
        const formattedAccounts = (accounts || []).map(account => ({
          ...account,
          status: account.status as 'active' | 'inactive'
        }));
        
        setUserAccounts(formattedAccounts);
        setAllAccounts(formattedAccounts);
      } else {
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
          return;
        }

        const accounts = userAccountsData?.map(ua => ({
          ...ua.accounts,
          status: ua.accounts.status as 'active' | 'inactive'
        })).filter(Boolean) || [];
        
        console.log("Regular user accounts loaded:", accounts.length);
        setUserAccounts(accounts as Account[]);
      }
    } catch (error) {
      console.error('Error loading user accounts:', error);
      toast.error('Error al cargar las cuentas del usuario');
    }
  };

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
        return;
      }
      
      const formattedAccounts = (accounts || []).map(account => ({
        ...account,
        status: account.status as 'active' | 'inactive'
      }));
      
      setAllAccounts(formattedAccounts);
    } catch (error) {
      console.error('Error loading all accounts:', error);
      toast.error('Error al cargar las cuentas');
    }
  };

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
        setIsLoading(true);
        
        try {
          await loadUserAccounts();
          
          if (user.role === 'superAdmin') {
            await loadAccounts();
          }

          // Handle account selection
          if (mounted) {
            const savedAccountId = localStorage.getItem('selectedAccountId');
            
            if (user.role === 'superAdmin') {
              setSelectedAccountId(savedAccountId || 'all');
            } else {
              // Auto-select first account for regular users
              setTimeout(() => {
                if (mounted && userAccounts.length > 0 && !selectedAccountId) {
                  setSelectedAccountId(userAccounts[0].id);
                }
              }, 200);
            }
          }
        } catch (error) {
          console.error('Error initializing accounts:', error);
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      } else {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAccounts();

    return () => {
      mounted = false;
    };
  }, [user, isAuthenticated]);

  // Update localStorage when account selection changes
  useEffect(() => {
    if (selectedAccountId) {
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
