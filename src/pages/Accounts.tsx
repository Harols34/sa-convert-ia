
import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import AccountList from "@/components/accounts/AccountList";
import AccountForm from "@/components/accounts/AccountForm";
import UserAccountAssignment from "@/components/accounts/UserAccountAssignment";
import { ArrowLeft, Building2, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AccountsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();

  // Get sidebar collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
    
    // Listen for changes to localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed') {
        setSidebarCollapsed(e.newValue === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // CORREGIDO: Verificar permisos para SuperAdmin únicamente
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      console.log("Checking access for user:", user.email, "role:", user.role);
      
      if (user.role !== 'superAdmin') {
        console.log("Access denied - user is not SuperAdmin");
        toast.error("Acceso denegado", {
          description: "Solo los SuperAdmins pueden acceder a la gestión de cuentas"
        });
        navigate("/analytics");
      } else {
        console.log("Access granted - user is SuperAdmin");
      }
    }
  }, [user, isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Debes iniciar sesión para acceder a esta página</p>
          <Button onClick={() => navigate("/login")}>Iniciar Sesión</Button>
        </div>
      </div>
    );
  }

  if (user?.role !== 'superAdmin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página</p>
          <Button onClick={() => navigate("/analytics")}>Volver al Inicio</Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'superAdmin') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        <main className={`flex-1 p-4 md:p-6 transition-all duration-300 bg-white ${sidebarCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'}`}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">Gestión de Cuentas</h2>
                      <p className="text-muted-foreground">
                        Administrar cuentas y asignaciones de usuarios
                      </p>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0">
                      <Button onClick={() => navigate("/accounts/assign")} variant="outline">
                        <Users className="mr-2 h-4 w-4" /> Asignar Usuarios
                      </Button>
                      <Button onClick={() => navigate("/accounts/new")}>
                        <Building2 className="mr-2 h-4 w-4" /> Nueva Cuenta
                      </Button>
                    </div>
                  </div>
                  <AccountList />
                </>
              }
            />
            <Route
              path="/new"
              element={
                <>
                  <div className="flex items-center mb-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/accounts")}
                      className="mr-4"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                    </Button>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">Crear Nueva Cuenta</h2>
                      <p className="text-muted-foreground">
                        Agregar una nueva cuenta al sistema
                      </p>
                    </div>
                  </div>
                  <AccountForm />
                </>
              }
            />
            <Route
              path="/assign"
              element={
                <>
                  <div className="flex items-center mb-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/accounts")}
                      className="mr-4"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                    </Button>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">Asignar Usuarios a Cuentas</h2>
                      <p className="text-muted-foreground">
                        Gestionar las asignaciones de usuarios a cuentas
                      </p>
                    </div>
                  </div>
                  <UserAccountAssignment />
                </>
              }
            />
          </Routes>
        </main>
      </div>
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'}`}>
        <Footer />
      </div>
    </div>
  );
}
