
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // Comprobación de token almacenado al cargar
  useEffect(() => {
    const checkStoredToken = () => {
      const storedSession = localStorage.getItem('supabase.auth.token');
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          const expiryTime = sessionData.expires_at ? sessionData.expires_at * 1000 : 0;
          
          // Add a 5-minute buffer to ensure token isn't about to expire
          if (Date.now() < expiryTime - (5 * 60 * 1000)) {
            console.log('Login page - Using stored valid session');
            // No hacemos nada, el sistema AuthContext procesará este token
          } else {
            console.log('Login page - Stored session expired or near expiry, cleaning');
            localStorage.removeItem('supabase.auth.token');
          }
        } catch (e) {
          console.error('Error parsing stored session:', e);
          localStorage.removeItem('supabase.auth.token');
        }
      }
    };
    
    checkStoredToken();
  }, []);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.log("Login page - User is authenticated, redirecting");
      // Get last path with proper default
      const lastPath = localStorage.getItem('lastPath');
      const validLastPath = lastPath && 
                          lastPath !== '/login' && 
                          lastPath !== '/' && 
                          !lastPath.includes('undefined');
      
      if (validLastPath) {
        console.log("Already authenticated, redirecting to saved path:", lastPath);
        localStorage.removeItem('lastPath');
        navigate(lastPath, { replace: true });
      } else {
        console.log("Already authenticated, redirecting to dashboard");
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, loading, navigate]);

  // Si todavía está cargando o ya autenticado, mostrar spinner
  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {loading ? "Verificando sesión..." : "Redirigiendo..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-background p-4">
      <div className="w-full max-w-md glass-card p-8 space-y-8 bg-white shadow-xl rounded-xl border border-primary/10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Bienvenido a ConvertIA Analytics</h1>
          <p className="text-muted-foreground">Inicia sesión para acceder a tu cuenta</p>
        </div>
        
        <LoginForm language="es" />
        
        <div className="pt-4 text-center text-sm text-muted-foreground">
          <p>Análisis inteligente y transformación de conversaciones</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
