
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
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();

  // Helper function to validate language
  const validateLanguage = (lang: string | null | undefined): 'es' | 'en' => {
    return (lang === 'es' || lang === 'en') ? lang : 'es';
  };

  // Optimized user data fetching with better error handling
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
        return createFallbackUser(userId, currentSession);
      }
      
      if (!data) {
        console.log("No profile found, creating default profile");
        return await createDefaultProfile(userId, currentSession);
      } else {
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
      }
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      return createFallbackUser(userId, currentSession);
    }
  }, []);

  // Create fallback user for offline or error scenarios
  const createFallbackUser = (userId: string, currentSession: Session): AppUser => {
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
  };

  // Create default profile with better error handling
  const createDefaultProfile = async (userId: string, currentSession: Session): Promise<AppUser> => {
    try {
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
        return createFallbackUser(userId, currentSession);
      }
      
      return {
        id: userId,
        email: userEmail,
        role: newProfile.role as AppUser["role"],
        name: newProfile.full_name || '',
        full_name: newProfile.full_name || '',
        avatar: newProfile.avatar_url,
        avatar_url: newProfile.avatar_url,
        language: validateLanguage(newProfile.language),
        dailyQueryLimit: 20,
        queriesUsed: 0,
        created_at: newProfile.created_at,
        updated_at: newProfile.updated_at
      };
    } catch (error) {
      console.error("Error in createDefaultProfile:", error);
      return createFallbackUser(userId, currentSession);
    }
  };

  // Initialize auth - simplified and faster
  useEffect(() => {
    if (initialized) return;

    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        
        // Get initial session first
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (initialSession?.user) {
            console.log("Initial session found, setting up user");
            setSession(initialSession);
            
            // Fetch user data asynchronously
            setTimeout(async () => {
              if (mounted) {
                const userData = await fetchUserData(initialSession.user.id, initialSession);
                if (mounted) {
                  setUser(userData);
                }
              }
            }, 0);
          }
          setLoading(false);
          setInitialized(true);
        }

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("Auth event:", event, "Session exists:", !!currentSession);

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
                  
                  // Fetch user data asynchronously
                  setTimeout(async () => {
                    if (mounted) {
                      const userData = await fetchUserData(currentSession.user.id, currentSession);
                      if (mounted) {
                        setUser(userData);
                      }
                    }
                  }, 0);
                }
                setLoading(false);
                break;
                
              default:
                setLoading(false);
                break;
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing auth:", error);
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
  }, [fetchUserData, initialized]);

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
