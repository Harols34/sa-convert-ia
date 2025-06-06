
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { Session, User } from '@supabase/supabase-js';
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User as AppUser } from "@/lib/types";
import { toast } from "sonner";

// Define the context type
type AuthContextType = {
  session: Session | null;
  user: AppUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  userRole: string | undefined;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserSession: () => Promise<void>;
  setUser: (user: AppUser | null) => void;
  setSession: (session: Session | null) => void;
  updateUser: (userData: Partial<AppUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Optimized user data fetching with error handling
  const fetchUserData = async (userId: string) => {
    try {
      console.log("Fetching user data for ID:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, create one
          console.log("No profile found, creating default profile");
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              full_name: session?.user?.email?.split('@')[0] || 'Usuario',
              role: 'agent',
              language: 'es'
            })
            .select()
            .single();
          
          if (insertError) {
            console.error("Error creating default profile:", insertError);
            throw insertError;
          }
          
          const appUser: AppUser = {
            id: userId,
            email: session?.user?.email || '',
            role: newProfile.role as AppUser["role"],
            name: newProfile.full_name || '',
            full_name: newProfile.full_name || '',
            avatar: newProfile.avatar_url,
            avatar_url: newProfile.avatar_url,
            language: (newProfile.language === 'es' || newProfile.language === 'en') ? newProfile.language : 'es',
            dailyQueryLimit: 20,
            queriesUsed: 0,
            created_at: newProfile.created_at,
            updated_at: newProfile.updated_at
          };
          
          console.log("User profile created successfully with role:", appUser.role);
          setUser(appUser);
        } else {
          console.error("Error fetching user profile:", error);
          throw error;
        }
      } else {
        const appUser: AppUser = {
          id: userId,
          email: session?.user?.email || '',
          role: data.role as AppUser["role"],
          name: data.full_name || '',
          full_name: data.full_name || '',
          avatar: data.avatar_url,
          avatar_url: data.avatar_url,
          language: (data.language === 'es' || data.language === 'en') ? data.language : 'es',
          dailyQueryLimit: 20,
          queriesUsed: 0,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        
        console.log("User data loaded with role:", appUser.role);
        setUser(appUser);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      setLoading(false);
      toast.error("Error al cargar los datos del usuario");
    }
  };

  // Optimized auth state management
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        
        // Check for existing session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (initialSession) {
            console.log("Found initial session");
            setSession(initialSession);
            // Defer user data fetching to prevent blocking
            setTimeout(() => {
              if (mounted) {
                fetchUserData(initialSession.user.id);
              }
            }, 100);
          } else {
            console.log("No initial session found");
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth event:", event);

        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
        } 
        else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession) {
            console.log("Valid session found");
            setSession(currentSession);
            
            // Defer user data fetching
            setTimeout(() => {
              if (mounted) {
                fetchUserData(currentSession.user.id);
              }
            }, 100);
          }
        }
      }
    );

    initializeAuth();

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("SAFETY TIMEOUT: Forcing loading state to end");
        setLoading(false);
      }
    }, 8000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Sign-in function with better error handling
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      console.log("Sign in successful");
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  };

  // Sign-out function
  const signOut = async () => {
    try {
      console.log("Signing out...");
      await supabase.auth.signOut();
      
      // Clean up local state
      setSession(null);
      setUser(null);
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  // Refresh user session
  const refreshUserSession = async () => {
    try {
      console.log("Refreshing user session");
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Error refreshing session:", error);
        return;
      }
      
      if (data.session) {
        console.log("Session refreshed successfully");
        setSession(data.session);
        if (data.session.user && !user) {
          await fetchUserData(data.session.user.id);
        }
      }
    } catch (error) {
      console.error("Unexpected error refreshing session:", error);
    }
  };

  // Update user data
  const updateUser = async (userData: Partial<AppUser>) => {
    try {
      if (!user || !user.id) {
        throw new Error("No authenticated user");
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      setUser({ ...user, ...userData });
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Error al actualizar el perfil");
      throw error;
    }
  };

  // Alias methods
  const login = signIn;
  const logout = signOut;

  // Calculate derived values
  const isAuthenticated = !!session && !!user;
  const userRole = user?.role;

  // Create memoized context value
  const contextValue = useMemo(
    () => ({
      session,
      user,
      isAuthenticated,
      signIn,
      signOut,
      loading,
      userRole,
      login,
      logout,
      refreshUserSession,
      setUser,
      setSession,
      updateUser,
    }),
    [session, user, isAuthenticated, loading, userRole]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
