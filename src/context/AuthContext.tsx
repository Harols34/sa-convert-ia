
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
  // Add missing methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserSession: () => Promise<void>;
  setUser: (user: AppUser | null) => void;
  setSession: (session: Session | null) => void;
  updateUser: (userData: Partial<AppUser>) => Promise<void>;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session refresh interval (in milliseconds)
const SESSION_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes

// Define the provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Safety timeout to prevent infinite loading state
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("SAFETY TIMEOUT ACTIVATED: Forcing loading state to end");
        setLoading(false);
      }
    }, 10000); // 10 seconds max for loading state

    return () => clearTimeout(safetyTimeout);
  }, [loading]);

  // Handle authentication state changes
  useEffect(() => {
    console.info("Checking initial session...");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.info("Auth event:", event);

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          
          // Clear any refresh timer
          if (refreshTimer) {
            clearInterval(refreshTimer);
            setRefreshTimer(null);
          }
        } 
        else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (currentSession) {
            console.info("Valid session found");
            setSession(currentSession);
            
            // Defer user data fetching to prevent auth state issues
            setTimeout(() => {
              fetchUserData(currentSession.user.id);
            }, 0);

            // Start session refresh timer
            startSessionRefreshTimer();
          } else {
            console.info("No active session found");
            setSession(null);
            setUser(null);
            setLoading(false);
          }
        }
      }
    );

    // Initial session check
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          console.info("Found initial session");
          setSession(initialSession);
          
          // Defer user data fetching
          setTimeout(() => {
            fetchUserData(initialSession.user.id);
          }, 0);
          
          // Start session refresh timer
          startSessionRefreshTimer();
        } else {
          console.info("No initial session found");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup
    return () => {
      subscription.unsubscribe();
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, []);

  // Start a timer to periodically refresh the session
  const startSessionRefreshTimer = () => {
    // Clear any existing timer
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    
    // Create a new timer
    const timer = setInterval(async () => {
      console.info("Refreshing session token...");
      try {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error("Error refreshing session:", error);
          // If we can't refresh, try to get the current session
          const { data: currentSession } = await supabase.auth.getSession();
          
          if (!currentSession.session) {
            console.warn("Session expired and could not be refreshed");
            // No need to sign out here - the auth state change handler will handle it
          }
        } else if (data.session) {
          console.info("Session refreshed successfully");
          // No need to setSession - the auth state change handler will handle it
        }
      } catch (refreshError) {
        console.error("Unexpected error refreshing session:", refreshError);
      }
    }, SESSION_REFRESH_INTERVAL);
    
    setRefreshTimer(timer);
  };

  // Helper function to validate and cast role
  const validateRole = (role: string | null | undefined): AppUser["role"] => {
    const validRoles: AppUser["role"][] = ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"];
    if (role && validRoles.includes(role as AppUser["role"])) {
      return role as AppUser["role"];
    }
    return "agent"; // default fallback
  };

  // Helper function to validate and cast language
  const validateLanguage = (language: string | null | undefined): "es" | "en" => {
    if (language === "es" || language === "en") {
      return language;
    }
    return "es"; // default fallback
  };

  // Fetch user data from Supabase with improved error handling
  const fetchUserData = async (userId: string) => {
    try {
      console.info("Fetching user data for ID:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, create one
          console.info("No profile found, creating default profile");
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
          
          // Use the newly created profile
          const appUser: AppUser = {
            id: userId,
            email: session?.user?.email || '',
            role: validateRole(newProfile.role),
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
          
          console.info("User profile created successfully with role:", appUser.role);
          setUser(appUser);
        } else {
          console.error("Error fetching user profile:", error);
          throw error;
        }
      } else {
        // Create the app user object from existing profile
        const appUser: AppUser = {
          id: userId,
          email: session?.user?.email || '',
          role: validateRole(data.role),
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
        
        console.info("User data loaded with role:", appUser.role);
        setUser(appUser);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      setLoading(false);
      toast.error("Error al cargar los datos del usuario");
    }
  };

  // Sign-in function
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // No need to manually set session here, the auth state listener will handle it
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  };

  // Sign-out function
  const signOut = async () => {
    setLoading(true);
    
    try {
      await supabase.auth.signOut();
      // No need to manually clear session here, the auth state change handler will handle it
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
      toast.error("Error al cerrar sesión");
    }
  };

  // Add alias methods for compatibility
  const login = signIn;
  const logout = signOut;

  // Refresh user session
  const refreshUserSession = async () => {
    try {
      console.log("Manually refreshing user session");
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
      
      // Update local user state
      setUser({ ...user, ...userData });
      
      toast.success("Perfil actualizado correctamente");
      return;
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Error al actualizar el perfil");
      throw error;
    }
  };

  // Calculate isAuthenticated
  const isAuthenticated = !!session && !!user;
  
  // Get userRole
  const userRole = user?.role;

  // Create the context value
  const contextValue = useMemo(
    () => ({
      session,
      user,
      isAuthenticated,
      signIn,
      signOut,
      loading,
      userRole,
      // Add the missing methods to the context value
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

// Create a custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
