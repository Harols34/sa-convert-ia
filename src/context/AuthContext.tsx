import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
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

  // Optimized user data fetching with better error handling
  const fetchUserData = useCallback(async (userId: string) => {
    if (!userId) {
      console.error("No userId provided to fetchUserData");
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching user data for ID:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching user profile:", error);
        
        if (error.code === 'PGRST116') {
          // No profile found, create one
          console.log("No profile found, creating default profile");
          const userEmail = session?.user?.email || 'usuario@example.com';
          
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              full_name: userEmail.split('@')[0] || 'Usuario',
              role: 'agent',
              language: 'es'
            })
            .select()
            .single();
          
          if (insertError) {
            console.error("Error creating default profile:", insertError);
            setLoading(false);
            return;
          }
          
          setUser({
            id: userId,
            email: userEmail,
            role: newProfile.role as AppUser["role"],
            name: newProfile.full_name || '',
            full_name: newProfile.full_name || '',
            avatar: newProfile.avatar_url,
            avatar_url: newProfile.avatar_url,
            language: newProfile.language === 'es' || newProfile.language === 'en' ? newProfile.language : 'es',
            dailyQueryLimit: 20,
            queriesUsed: 0,
            created_at: newProfile.created_at,
            updated_at: newProfile.updated_at
          });
        } else {
          throw error;
        }
      } else if (data) {
        setUser({
          id: userId,
          email: session?.user?.email || '',
          role: data.role as AppUser["role"],
          name: data.full_name || '',
          full_name: data.full_name || '',
          avatar: data.avatar_url,
          avatar_url: data.avatar_url,
          language: data.language === 'es' || data.language === 'en' ? data.language : 'es',
          dailyQueryLimit: 20,
          queriesUsed: 0,
          created_at: data.created_at,
          updated_at: data.updated_at
        });
        
        console.log("User data loaded successfully with role:", data.role);
      }
      
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      toast.error("Error al cargar los datos del usuario");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  // Optimized auth state management
  useEffect(() => {
    let mounted = true;
    let sessionCheckTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }
        
        if (mounted) {
          if (initialSession?.user) {
            console.log("Found initial session for user:", initialSession.user.id);
            setSession(initialSession);
            fetchUserData(initialSession.user.id);
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

    // Set up auth state listener with optimized event handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth event:", event, "Session exists:", !!currentSession);

        if (!mounted) return;

        // Clear any existing timeout
        if (sessionCheckTimeout) {
          clearTimeout(sessionCheckTimeout);
        }

        switch (event) {
          case 'SIGNED_OUT':
            setSession(null);
            setUser(null);
            setLoading(false);
            break;
            
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (currentSession?.user) {
              console.log("Setting session for user:", currentSession.user.id);
              setSession(currentSession);
              
              // Defer user data fetching slightly to avoid blocking
              sessionCheckTimeout = setTimeout(() => {
                if (mounted) {
                  fetchUserData(currentSession.user.id);
                }
              }, 100);
            }
            break;
            
          case 'USER_UPDATED':
            if (currentSession?.user && user) {
              // Update session but keep existing user data
              setSession(currentSession);
            }
            break;
            
          default:
            break;
        }
      }
    );

    initializeAuth();

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth initialization timeout reached, forcing loading to false");
        setLoading(false);
      }
    }, 10000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
      if (sessionCheckTimeout) {
        clearTimeout(sessionCheckTimeout);
      }
    };
  }, [fetchUserData, loading, user]);

  // Optimized sign-in function
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }
      
      console.log("Sign in successful for:", email);
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  };

  // Optimized sign-out function
  const signOut = async () => {
    try {
      console.log("Signing out...");
      
      // Clear local state first
      setSession(null);
      setUser(null);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during sign out:", error);
      }
      
      // Navigate to login regardless of signOut result
      navigate('/login');
    } catch (error) {
      console.error("Unexpected error signing out:", error);
      // Still navigate to login page
      navigate('/login');
    }
  };

  // Improved refresh session function
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

  // Update user data function
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

  // Create optimized context value
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
