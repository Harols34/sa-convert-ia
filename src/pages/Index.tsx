
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, user, refreshUserSession } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [initTime] = useState(Date.now());
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const forceRedirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      if (forceRedirectTimeoutRef.current) {
        clearTimeout(forceRedirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Force redirect after maximum wait time (5 seconds)
    forceRedirectTimeoutRef.current = setTimeout(() => {
      if (!isRedirecting) {
        console.log("Forcing redirect after timeout");
        setIsRedirecting(true);
        navigate("/login", { replace: true });
      }
    }, 5000);

    return () => {
      if (forceRedirectTimeoutRef.current) {
        clearTimeout(forceRedirectTimeoutRef.current);
        forceRedirectTimeoutRef.current = null;
      }
    };
  }, [navigate, isRedirecting]);

  useEffect(() => {
    // First update session to ensure current data
    const updateSession = async () => {
      try {
        // Clear any previous auth errors
        localStorage.removeItem('auth_error');
        
        // Try to manually recover session from localStorage if available
        const storedSession = localStorage.getItem('supabase.auth.token');
        if (storedSession) {
          try {
            const sessionData = JSON.parse(storedSession);
            const expiryTime = sessionData.expires_at ? sessionData.expires_at * 1000 : 0;
            
            // Add 5-minute buffer to ensure token isn't about to expire
            if (Date.now() < expiryTime - (5 * 60 * 1000)) {
              console.log('Using stored valid session');
              // Wait for auth to handle this session
              await new Promise(resolve => setTimeout(resolve, 300));
            } else {
              console.log('Stored session expired or near expiry, cleaning');
              localStorage.removeItem('supabase.auth.token');
            }
          } catch (e) {
            console.error('Error parsing stored session:', e);
          }
        }
        
        // Check if we have a token but it might be invalid
        const timeNow = Date.now();
        if (timeNow - initTime > 2000 && !isAuthenticated && !loading) {
          // Try to manually clear auth if we've waited too long
          console.log("Checking for invalid tokens");
          try {
            // Don't try to sign out if already signed out
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              const { error } = await supabase.auth.signOut({ scope: 'local' });
              if (error) console.error("Error clearing auth:", error);
            }
            
            setTimeout(() => {
              setIsRedirecting(true);
              navigate("/login", { replace: true });
            }, 100);
            return;
          } catch (e) {
            console.error("Error in manual auth clear:", e);
          }
        }
        
        // Normal refresh - only if not already authenticated
        if (!isAuthenticated && !loading) {
          await refreshUserSession();
        }
      } catch (error) {
        console.error("Error refreshing session:", error);
        setTimeout(() => {
          setIsRedirecting(true);
          navigate("/login", { replace: true });
        }, 100);
      }
    };
    
    if (!loading && !isAuthenticated) {
      updateSession();
    }
  }, [loading, refreshUserSession, isAuthenticated, navigate, initTime]);

  useEffect(() => {
    // Prevent redirect if already redirecting
    if (isRedirecting) {
      return;
    }
    
    // Clear any previous timeouts
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }
    
    // Add a small delay to ensure authentication state is loaded
    redirectTimeoutRef.current = setTimeout(() => {
      console.log("Index page - Checking auth state:", { isAuthenticated, loading, user });
      
      // Optimize redirection to avoid infinite loading
      if (!loading) {
        setIsRedirecting(true);
        
        if (isAuthenticated && user) {
          // Show role information
          toast.success(`Bienvenido ${user?.name || 'usuario'}`, {
            description: "Sesión iniciada correctamente",
            duration: 3000,
          });
          
          // Navigate to dashboard/analytics directly (as per requirement #2)
          console.log("Authenticated, navigating to analytics");
          navigate("/analytics", { replace: true });
        } else {
          console.log("Not authenticated, redirecting to login");
          navigate("/login", { replace: true });
        }
      } else if (Date.now() - initTime > 3000) {
        // If still loading after 3 seconds, force redirect to login
        console.log("Redirecting to login after wait");
        navigate("/login", { replace: true });
      }
    }, 300); // Reduced from 500ms to 300ms for faster response
    
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [navigate, isAuthenticated, loading, user, isRedirecting, initTime]);

  // Show loading indicator while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando autenticación...</p>
      </div>
    </div>
  );
};

export default Index;
