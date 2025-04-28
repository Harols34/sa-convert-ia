
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Loader2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ContractList from "@/components/contracts/ContractList";

export default function ContractsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const {
    isAuthenticated,
    loading,
    user
  } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated && !loading) {
        toast.error("Sesión expirada", {
          description: "Por favor inicia sesión para continuar"
        });
        navigate("/login", {
          replace: true
        });
        return false;
      }
      setIsLoading(false);
      return true;
    };
    
    const timer = setTimeout(() => {
      checkAuth();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, navigate]);

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 md:p-6 ml-0 md:ml-64 transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Contratos</h2>
              <p className="text-muted-foreground">
                Gestiona los contratos para evaluación de cumplimiento en ventas
              </p>
            </div>
            <Button 
              onClick={() => navigate("/contracts/new")} 
              className="mt-4 md:mt-0 bg-green-600 text-white hover:bg-green-700"
            >
              <FileText className="mr-2 h-4 w-4" /> Nuevo Contrato
            </Button>
          </div>

          <ContractList />
        </main>
      </div>
      <div className="ml-0 md:ml-64 transition-all duration-300">
        <Footer />
      </div>
    </div>
  );
}
