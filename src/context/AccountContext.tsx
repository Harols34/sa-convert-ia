
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { Account } from "@/lib/types";

interface AccountContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (accountId: string | null) => void;
  userAccounts: Account[];
  isLoading: boolean;
  error: string | null;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session, userRole } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [userAccounts, setUserAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fetch accounts if user has permissions and is authenticated
  const shouldFetchAccounts = user && session && (userRole === 'superAdmin' || userRole === 'admin');

  const fetchUserAccounts = async () => {
    if (!shouldFetchAccounts) {
      console.log("User doesn't need account data, skipping fetch");
      setUserAccounts([]);
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

        accountsData = data || [];
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
          .filter(account => account && account.status === 'active') as Account[];
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
      setSelectedAccountId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch accounts when user or session changes
  useEffect(() => {
    if (user && session) {
      fetchUserAccounts();
    } else {
      // Clear data when no user/session
      setUserAccounts([]);
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
    isLoading,
    error,
    refreshAccounts,
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
