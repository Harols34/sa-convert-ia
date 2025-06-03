
import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import ChatInterface from "@/components/ai/ChatInterface";
import ChatHistory from "@/components/ai/ChatHistory";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const {
    isAuthenticated,
    loading
  } = useAuth();
  const navigate = useNavigate();
  
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
  
  useEffect(() => {
    // Solo redirigir si no está autenticado y ya hemos verificado el estado (loading es false)
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>;
  }
  
  return <div className="min-h-screen flex flex-col">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        <main className={`flex-1 p-4 md:p-6 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'
        }`}>
          <Routes>
            <Route path="/" element={<>
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold tracking-tight">Consulta tus Insights de Voz
              </h2>
                    <p className="text-muted-foreground">Explora tus llamadas y obtén insights avanzados generados por la IA de Convertia.

              </p>
                  </div>
                  <ChatInterface />
                </>} />
            <Route path="history" element={<ChatHistory />} />
          </Routes>
        </main>
      </div>
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'
      }`}>
        <Footer />
      </div>
    </div>;
}
