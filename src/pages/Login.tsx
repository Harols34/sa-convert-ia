
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

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
        console.log("Already authenticated, redirecting to analytics");
        navigate("/analytics", { replace: true });
      }
    }
  }, [isAuthenticated, loading, navigate]);

  // Si todavía está cargando o ya autenticado, mostrar spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  // Si ya está autenticado, no mostrar nada mientras redirige
  if (isAuthenticated) {
    return null;
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
