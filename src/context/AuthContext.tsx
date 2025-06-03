
import React, { createContext, useContext, useState, useEffect } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { User as AppUser } from "@/lib/types";

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  sessionChecked: boolean;
  setUser: (user: AppUser | null) => void;
  setSession: (session: Session | null) => void;
  refreshUserSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  const refreshUserSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        return;
      }

      if (data.session) {
        setSession(data.session);
        
        // Cargar perfil del usuario incluyendo organización
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            *,
            organizations:organization_id (
              id,
              name,
              slug
            )
          `)
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error getting profile:", profileError);
        }

        const userData: AppUser = {
          id: data.session.user.id,
          email: data.session.user.email || "",
          role: (profile?.role as AppUser["role"]) || "agent",
          name: profile?.full_name || data.session.user.user_metadata?.full_name,
          full_name: profile?.full_name || data.session.user.user_metadata?.full_name,
          avatar: profile?.avatar_url,
          avatar_url: profile?.avatar_url,
          language: (profile?.language as AppUser["language"]) || "es",
          dailyQueryLimit: 20,
          queriesUsed: 0,
          created_at: profile?.created_at || data.session.user.created_at,
          updated_at: profile?.updated_at || data.session.user.updated_at,
          organizationId: profile?.organization_id
        };

        setUser(userData);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  };

  useEffect(() => {
    // Configurar listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event, session?.user?.id);
        
        setSession(session);
        
        if (session?.user) {
          // Cargar perfil del usuario incluyendo organización
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
              *,
              organizations:organization_id (
                id,
                name,
                slug
              )
            `)
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error("Error getting profile:", profileError);
          }

          const userData: AppUser = {
            id: session.user.id,
            email: session.user.email || "",
            role: (profile?.role as AppUser["role"]) || "agent",
            name: profile?.full_name || session.user.user_metadata?.full_name,
            full_name: profile?.full_name || session.user.user_metadata?.full_name,
            avatar: profile?.avatar_url,
            avatar_url: profile?.avatar_url,
            language: (profile?.language as AppUser["language"]) || "es",
            dailyQueryLimit: 20,
            queriesUsed: 0,
            created_at: profile?.created_at || session.user.created_at,
            updated_at: profile?.updated_at || session.user.updated_at,
            organizationId: profile?.organization_id
          };

          setUser(userData);
        } else {
          setUser(null);
        }
        
        setLoading(false);
        setSessionChecked(true);
      }
    );

    // Verificar sesión inicial
    refreshUserSession().finally(() => {
      setLoading(false);
      setSessionChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!user && !!session;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated,
        sessionChecked,
        setUser,
        setSession,
        refreshUserSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
