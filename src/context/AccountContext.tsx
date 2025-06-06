
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account, UserAccount } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

// Multi-tenant account context for managing user access to different accounts
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

interface AccountProviderProps {
  children: ReactNode;
}

export const AccountProvider: React.FC<AccountProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [userAccounts, setUserAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar cuentas del usuario actual - CORREGIDO para SuperAdmin
  const loadUserAccounts = async () => {
    if (!user) return;

    try {
      console.log("Loading user accounts for user:", user.id, "role:", user.role);
      
      if (user.role === 'superAdmin') {
        // SuperAdmin ve todas las cuentas activas
        const { data: accounts, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (error) {
          console.error("Error loading accounts for SuperAdmin:", error);
          throw error;
        }
        
        console.log("SuperAdmin accounts loaded:", accounts);
        setUserAccounts((accounts || []).map(account => ({
          ...account,
          status: account.status as 'active' | 'inactive'
        })));
      } else {
        // Usuario normal ve solo sus cuentas asignadas
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
          throw error;
        }

        const accounts = userAccountsData?.map(ua => ({
          ...ua.accounts,
          status: ua.accounts.status as 'active' | 'inactive'
        })).filter(Boolean) || [];
        
        console.log("Regular user accounts loaded:", accounts);
        setUserAccounts(accounts as Account[]);
      }
    } catch (error) {
      console.error('Error loading user accounts:', error);
      toast.error('Error al cargar las cuentas del usuario');
    }
  };

  // Cargar todas las cuentas (solo para SuperAdmin) - ACTUALIZADO
  const loadAccounts = async () => {
    if (!user || user.role !== 'superAdmin') return;

    try {
      // SuperAdmin puede ver todas las cuentas
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');

      if (error) throw error;
      setAllAccounts((accounts || []).map(account => ({
        ...account,
        status: account.status as 'active' | 'inactive'
      })));
    } catch (error) {
      console.error('Error loading all accounts:', error);
      toast.error('Error al cargar las cuentas');
    }
  };

  // Crear nueva cuenta
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
      await loadAccounts();
      await loadUserAccounts();
      return true;
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Error al crear la cuenta');
      return false;
    }
  };

  // Actualizar estado de cuenta
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
      await loadAccounts();
      await loadUserAccounts();
      return true;
    } catch (error) {
      console.error('Error updating account status:', error);
      toast.error('Error al actualizar el estado de la cuenta');
      return false;
    }
  };

  // Asignar usuario a cuenta
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
        if (error.code === '23505') { // Unique constraint violation
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

  // Remover usuario de cuenta
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

  // Obtener cuentas de un usuario específico
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

  useEffect(() => {
    const initializeAccounts = async () => {
      if (user) {
        console.log("Initializing accounts for user:", user.id, "role:", user.role);
        setIsLoading(true);
        
        await Promise.all([
          loadUserAccounts(),
          user.role === 'superAdmin' ? loadAccounts() : Promise.resolve()
        ]);
        
        // Auto-seleccionar la primera cuenta disponible si no hay una seleccionada
        // Para SuperAdmin, permitir sin selección para ver todos los datos
        if (!selectedAccountId && userAccounts.length > 0 && user.role !== 'superAdmin') {
          setSelectedAccountId(userAccounts[0].id);
        }
        
        // Guardar en localStorage la cuenta seleccionada
        if (selectedAccountId) {
          localStorage.setItem('selectedAccountId', selectedAccountId);
        }
        
        setIsLoading(false);
      }
    };

    initializeAccounts();
  }, [user]);

  // Actualizar localStorage cuando cambie la cuenta seleccionada
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
