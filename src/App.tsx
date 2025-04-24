import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UserProvider } from "@/hooks/useUser";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Calls from "./pages/Calls";
import Analytics from "./pages/Analytics";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Behaviors from "./pages/Behaviors";
import Workforce from "./pages/Workforce";
import Tools from "./pages/Tools";
import NotFound from "./pages/NotFound";
import Agents from "./pages/Agents";
import Tipificaciones from "./pages/Tipificaciones";
import Prompts from "./pages/Prompts";
import { Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import RouteObserver from "./components/layout/RouteObserver";
import { supabase } from "./integrations/supabase/client";
import { toast } from "sonner";
import { User as AppUser } from "@/lib/types";

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, loading, user, setUser, setSession } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    console.log("ProtectedRoute check for path:", location.pathname);
    console.log("Auth state:", { isAuthenticated, loading, userRole: user?.role });
    
    if (!isAuthenticated && !loading) {
      const checkSession = async () => {
        try {
          console.log("Checking session status in ProtectedRoute");
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error("Error checking session:", error);
            return;
          }
          
          if (data.session) {
            console.log("Valid session found in ProtectedRoute");
            
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
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
              updated_at: profile?.updated_at || data.session.user.updated_at
            };

            console.log("User data loaded in ProtectedRoute:", userData);
            
            setSession(data.session);
            setUser(userData);
            
            localStorage.setItem('supabase.auth.token', JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: Math.floor(Date.now() / 1000) + data.session.expires_in
            }));
          } else {
            console.log("No valid session found in ProtectedRoute");
          }
        } catch (err) {
          console.error("Error checking session:", err);
        }
      };
      
      checkSession();
    }
  }, [isAuthenticated, loading, setUser, setSession, location.pathname]);
  
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        localStorage.setItem('lastPath', currentPath);
        console.log("Saved path for redirect:", currentPath);
      }
    }
  }, [isAuthenticated, loading, location]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    const alreadyShown = sessionStorage.getItem('session_expired_shown');
    if (!alreadyShown && location.pathname !== '/' && location.pathname !== '/login') {
      sessionStorage.setItem('session_expired_shown', 'true');
      
      setTimeout(() => {
        sessionStorage.removeItem('session_expired_shown');
      }, 10000);
      
      toast.error("Sesión expirada", {
        description: "Por favor inicia sesión para continuar",
        id: "session-expired",
      });
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  sessionStorage.removeItem('session_expired_shown');
  
  return <>{children}</>;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '';
  document.head.appendChild(style);
  setTimeout(() => document.head.removeChild(style), 10);
}

const AppContent = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <SonnerToaster />
            <RouteObserver />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Navigate to="/analytics" replace />} />
              <Route 
                path="/calls/*" 
                element={
                  <ProtectedRoute>
                    <Calls />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/workforce" 
                element={
                  <ProtectedRoute>
                    <Workforce />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/agents" 
                element={
                  <ProtectedRoute>
                    <Agents />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tools" 
                element={
                  <ProtectedRoute>
                    <Tools />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chat/*" 
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/users/*" 
                element={
                  <ProtectedRoute>
                    <Users />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/behaviors/*" 
                element={
                  <ProtectedRoute>
                    <Behaviors />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tipificaciones" 
                element={
                  <ProtectedRoute>
                    <Tipificaciones />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/prompts" 
                element={
                  <ProtectedRoute>
                    <Prompts />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
