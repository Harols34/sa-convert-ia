
import { useContext, createContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: false,
  error: null,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        setIsLoading(true);
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!session) {
          setIsLoading(false);
          return;
        }
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) {
          throw profileError;
        }
        
        // Create User object
        const userData: User = {
          id: session.user.id,
          email: session.user.email || "",
          name: profile?.full_name || session.user.user_metadata?.full_name,
          full_name: profile?.full_name || session.user.user_metadata?.full_name,
          role: (profile?.role as User["role"]) || "agent",
          avatar: profile?.avatar_url,
          avatar_url: profile?.avatar_url,
          // Set default values for these properties since they don't exist in the profile
          dailyQueryLimit: 20,
          queriesUsed: 0,
          language: (profile?.language as User["language"]) || "es",
        };
        
        setUser(userData);
      } catch (err) {
        console.error("Error loading user:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          // When auth state changes, reload user data
          loadUser();
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading, error }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
