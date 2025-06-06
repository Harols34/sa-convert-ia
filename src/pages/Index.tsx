
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [initTime] = useState(Date.now());

  useEffect(() => {
    // Prevent redirect if already redirecting
    if (isRedirecting) {
      return;
    }
    
    // Simple timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!loading && !isRedirecting) {
        setIsRedirecting(true);
        
        if (isAuthenticated && user) {
          // Show welcome message
          toast.success(`Bienvenido ${user?.name || 'usuario'}`, {
            description: "Sesión iniciada correctamente",
            duration: 3000,
          });
          
          console.log("User authenticated, navigating to analytics");
          navigate("/analytics", { replace: true });
        } else {
          console.log("User not authenticated, redirecting to login");
          navigate("/login", { replace: true });
        }
      }
    }, 1000); // Reduced timeout for faster response

    // Force redirect after 5 seconds to prevent infinite loading
    const forceTimeoutId = setTimeout(() => {
      if (!isRedirecting) {
        console.log("Force redirecting after 5 seconds");
        setIsRedirecting(true);
        navigate("/login", { replace: true });
      }
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(forceTimeoutId);
    };
  }, [navigate, isAuthenticated, loading, user, isRedirecting]);

  // Show loading indicator
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {loading ? "Verificando autenticación..." : "Preparando aplicación..."}
        </p>
      </div>
    </div>
  );
};

export default Index;
