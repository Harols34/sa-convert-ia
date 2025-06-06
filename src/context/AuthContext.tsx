
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from "react-router-dom";
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

  // Helper function to validate language
  const validateLanguage = (lang: string | null | undefined): 'es' | 'en' => {
    return (lang === 'es' || lang === 'en') ? lang : 'es';
  };

  // Create fallback user for offline or error scenarios
  const createFallbackUser = useCallback((userId: string, currentSession: Session): AppUser => {
    const userEmail = currentSession.user?.email || 'usuario@example.com';
    console.log("Creating fallback user for:", userEmail);
    
    return {
      id: userId,
      email: userEmail,
      role: 'agent' as AppUser["role"],
      name: userEmail.split('@')[0] || 'Usuario',
      full_name: userEmail.split('@')[0] || 'Usuario',
      avatar: null,
      avatar_url: null,
      language: 'es' as const,
      dailyQueryLimit: 20,
      queriesUsed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }, []);

  // Optimized user data fetching with timeout and retry
  const fetchUserData = useCallback(async (userId: string, currentSession: Session): Promise<AppUser> => {
    try {
      console.log("Fetching user data for ID:", userId);
      
      // Set timeout for the query
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );
      
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile:", error);
        return createFallbackUser(userId, currentSession);
      }
      
      if (!data) {
        console.log("No profile found, using fallback");
        return createFallbackUser(userId, currentSession);
      }
      
      return {
        id: userId,
        email: currentSession.user?.email || '',
        role: data.role as AppUser["role"],
        name: data.full_name || '',
        full_name: data.full_name || '',
        avatar: data.avatar_url,
        avatar_url: data.avatar_url,
        language: validateLanguage(data.language),
        dailyQueryLimit: 20,
        queriesUsed: 0,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      return createFallbackUser(userId, currentSession);
    }
  }, [createFallbackUser]);

  // Initialize auth - optimized to prevent loops
  useEffect(() => {
    let mounted = true;
    let initializationComplete = false;

    const initializeAuth = async () => {
      if (initializationComplete) return;
      
      try {
        console.log("Initializing auth...");
        
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          console.log("Initial session found");
          setSession(initialSession);
          
          // Fetch user data in background
          fetchUserData(initialSession.user.id, initialSession)
            .then(userData => {
              if (mounted) {
                setUser(userData);
              }
            })
            .catch(error => {
              console.error("Failed to fetch user data:", error);
              if (mounted) {
                setUser(createFallbackUser(initialSession.user.id, initialSession));
              }
            });
        }
        
        setLoading(false);
        initializationComplete = true;
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setLoading(false);
          initializationComplete = true;
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
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
              
              // Fetch user data in background without blocking
              setTimeout(() => {
                if (mounted) {
                  fetchUserData(currentSession.user.id, currentSession)
                    .then(userData => {
                      if (mounted) {
                        setUser(userData);
                      }
                    })
                    .catch(error => {
                      console.error("Failed to fetch user data:", error);
                      if (mounted) {
                        setUser(createFallbackUser(currentSession.user.id, currentSession));
                      }
                    });
                }
              }, 100);
            }
            setLoading(false);
            break;
            
          default:
            setLoading(false);
            break;
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, createFallbackUser]);

  // Sign-in function
  const signIn = useCallback(async (email: string, password: string) => {
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
  }, []);

  // Sign-out function
  const signOut = useCallback(async () => {
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
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error("Unexpected error signing out:", error);
      navigate('/login');
    }
  }, [navigate]);

  // Refresh session function
  const refreshUserSession = useCallback(async () => {
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
  }, []);

  // Update user data function
  const updateUser = useCallback(async (userData: Partial<AppUser>) => {
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
  }, [user]);

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
    [session, user, loading, userRole, signIn, signOut, refreshUserSession, updateUser]
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
