
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

/**
 * Component that observes route changes and stores last visited route
 * for recovery after login or refresh
 */
export default function RouteObserver() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshUserSession } = useAuth();
  const initialLoadRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSessionCheck, setLastSessionCheck] = useState<number>(Date.now());
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastAuthState, setLastAuthState] = useState<boolean | null>(null);
  const toastShownRef = useRef(false);
  const sessionToastDisplayedRef = useRef(false);
  
  // Log for debugging
  useEffect(() => {
    console.log("RouteObserver - Current path:", location.pathname);
    console.log("RouteObserver - Auth state:", { isAuthenticated, userRole: user?.role });
    
    // Track auth state changes to prevent unnecessary redirects
    if (lastAuthState !== isAuthenticated) {
      setLastAuthState(isAuthenticated);
      // Reset toast shown flag when auth state changes
      toastShownRef.current = false;
      sessionToastDisplayedRef.current = false;
    }
  }, [location, isAuthenticated, user, lastAuthState]);
  
  // Save path for later recovery
  useEffect(() => {
    // No guardar rutas de login o index o rutas con errores 404
    const excludedRoutes = ['/login', '/', '/404'];
    if (!excludedRoutes.includes(location.pathname)) {
      // Guardar ruta completa con parámetros
      const fullPath = location.search 
        ? `${location.pathname}${location.search}` 
        : location.pathname;
      
      localStorage.setItem('lastPath', fullPath);
      console.log("Route saved:", fullPath);
    }
    
    // Reset transitioning state
    setIsTransitioning(false);
  }, [location]);

  // Periodic session validation for protected routes
  useEffect(() => {
    // Only set up interval on protected routes and when authenticated
    if (isAuthenticated && isProtectedRoute(location.pathname)) {
      // Clear any existing interval
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
      
      // Set up interval to check session validity every 10 minutes
      sessionCheckIntervalRef.current = setInterval(async () => {
        const now = Date.now();
        // Only check if it's been more than 8 minutes since last check
        if (now - lastSessionCheck > 8 * 60 * 1000) {
          console.log("Performing periodic session validation");
          setLastSessionCheck(now);
          
          try {
            await refreshUserSession();
          } catch (error) {
            console.error("Session validation failed:", error);
          }
        }
      }, 10 * 60 * 1000); // Check every 10 minutes
    }
    
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, location.pathname, lastSessionCheck, refreshUserSession]);

  // Helper function to determine if a path is a protected route
  const isProtectedRoute = (path: string) => {
    return path.startsWith('/behaviors') || 
           path.startsWith('/calls') ||
           path.startsWith('/analytics') ||
           path.startsWith('/chat') ||
           path.startsWith('/dashboard') ||
           path.startsWith('/workforce') ||
           path.startsWith('/agents') ||
           path.startsWith('/tools') ||
           path.startsWith('/settings') ||
           path.startsWith('/users') ||
           path.startsWith('/tipificaciones');
  };

  // Handle special case for protected routes - prevent reloads on transitions
  useEffect(() => {
    // Skip if we're already transitioning to avoid duplicate work
    if (isTransitioning) return;
    
    // Limpiar el estado inicial cuando cambia la ruta
    if (location.pathname === '/login' || location.pathname === '/') {
      initialLoadRef.current = true;
      return;
    }
    
    // Solo ejecutar una vez para cada navegación a ruta protegida
    const protectedRoute = isProtectedRoute(location.pathname);
    
    if (initialLoadRef.current && protectedRoute) {
      initialLoadRef.current = false;
      
      console.log("Handling protected route navigation...");
      
      // Limpiar cualquier timeout existente
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Pequeño retraso para asegurar que el estado de autenticación esté cargado
      timeoutRef.current = setTimeout(() => {
        // Only refresh session state if authenticated, don't force reload the page
        if (isAuthenticated && user) {
          console.log("Auth confirmed, refreshing session state only");
          refreshUserSession();
        }
      }, 300);
    }
    
    // Limpieza al desmontar
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [location.pathname, navigate, isAuthenticated, user, refreshUserSession, isTransitioning]);

  // Handle auth errors and prevent multiple session expiration toasts
  useEffect(() => {
    if (!isAuthenticated && lastAuthState === true && !sessionToastDisplayedRef.current) {
      // Only show the toast once per session expiration
      if (isProtectedRoute(location.pathname) && location.pathname !== '/login') {
        sessionToastDisplayedRef.current = true;
        toast.error("Sesión expirada", {
          description: "Por favor inicia sesión para continuar",
          id: "session-expired", // Use ID to prevent duplicates
        });
        
        // Navigate to login with return path
        navigate("/login", { 
          replace: true, 
          state: { returnTo: location.pathname } 
        });
      }
    }
  }, [isAuthenticated, lastAuthState, location.pathname, navigate]);
  
  return null;
}
