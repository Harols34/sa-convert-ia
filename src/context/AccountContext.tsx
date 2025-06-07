
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Account {
  id: string;
  name: string;
  status: string;
}

interface AccountContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (accountId: string | null) => void;
  userAccounts: Account[];
  isLoading: boolean;
  refreshAccounts: () => Promise<void>;
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
        const { data: allAccounts, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (error) throw error;
        setUserAccounts(allAccounts || []);
      } else {
        // Regular users see only their assigned accounts
        const { data: userAccountsData, error } = await supabase
          .from('user_accounts')
          .select(`
            accounts!inner (
              id,
              name,
              status
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

  const refreshAccounts = useCallback(async () => {
    await fetchUserAccounts();
  }, [fetchUserAccounts]);

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
    } else {
      setUserAccounts([]);
      setSelectedAccountIdState(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, user?.role, fetchUserAccounts]);

  const value: AccountContextType = {
    selectedAccountId,
    setSelectedAccountId,
    userAccounts,
    isLoading,
    refreshAccounts
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};
