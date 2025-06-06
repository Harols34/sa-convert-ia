
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
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();

  // Optimized user data fetching
  const fetchUserData = useCallback(async (userId: string, currentSession: Session) => {
    try {
      console.log("Fetching user data for ID:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile:", error);
        throw error;
      }
      
      if (!data && error?.code === 'PGRST116') {
        // No profile found, create one
        console.log("Creating default profile for user");
        const userEmail = currentSession.user?.email || 'usuario@example.com';
        
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
          return null;
        }
        
        return {
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
        };
      } else if (data) {
        return {
          id: userId,
          email: currentSession.user?.email || '',
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
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      toast.error("Error al cargar los datos del usuario");
      return null;
    }
  }, []);

  // Initialize auth
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (initialized) return;
      
      try {
        console.log("Initializing auth...");
        
        // Set up auth state listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("Auth event:", event);

            if (!mounted) return;

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
                  
                  // Defer user data fetching to prevent blocking
                  setTimeout(async () => {
                    if (mounted) {
                      const userData = await fetchUserData(currentSession.user.id, currentSession);
                      if (mounted && userData) {
                        setUser(userData);
                      }
                      setLoading(false);
                    }
                  }, 0);
                }
                break;
                
              default:
                if (mounted) {
                  setLoading(false);
                }
                break;
            }
          }
        );

        // Then check for existing session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
        }
        
        if (mounted) {
          if (initialSession?.user) {
            console.log("Found initial session for user:", initialSession.user.id);
            setSession(initialSession);
            
            // Defer user data fetching
            setTimeout(async () => {
              if (mounted) {
                const userData = await fetchUserData(initialSession.user.id, initialSession);
                if (mounted && userData) {
                  setUser(userData);
                }
                setLoading(false);
                setInitialized(true);
              }
            }, 0);
          } else {
            console.log("No initial session found");
            setLoading(false);
            setInitialized(true);
          }
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error checking session:", error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array to prevent re-initialization

  // Sign-in function
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

  // Sign-out function
  const signOut = async () => {
    try {
      console.log("Signing out...");
      
      // Clear local state first
      setSession(null);
      setUser(null);
      setInitialized(false);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during sign out:", error);
      }
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error("Unexpected error signing out:", error);
      navigate('/login');
    }
  };

  // Refresh session function
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
