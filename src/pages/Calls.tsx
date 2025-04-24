
import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import CallList from "@/components/calls/CallList";
import CallUpload from "@/components/calls/CallUpload";
import CallDetail from "@/components/calls/CallDetail";
import CallControlPanel from "@/components/calls/CallControlPanel";
import { Edit, MessageSquare, Plus, ArrowLeft, Settings, RefreshCcw } from "lucide-react";
import { useUser } from "@/hooks/useUser";

export default function CallsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();

  // Check if user is admin or supervisor
  const isAdmin = user && (user.role === "admin" || user.role === "superAdmin" || user.role === "supervisor");
  
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
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        <main className={`flex-1 p-4 md:p-6 transition-all duration-300 ${sidebarCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'}`}>
          <Routes>
            <Route path="/" element={<>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">Llamadas</h2>
                      <p className="text-muted-foreground">
                        Ver, gestionar y analizar tus llamadas
                      </p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0">
                      {isAdmin && <Button variant="outline" onClick={() => setShowAdminPanel(!showAdminPanel)}>
                          <Settings className="mr-2 h-4 w-4" /> 
                          {showAdminPanel ? "Ocultar Panel" : "Panel Admin"}
                        </Button>}
                      <Button onClick={() => navigate("/calls/upload")}>
                        <Plus className="mr-2 h-4 w-4" /> Subir Llamadas
                      </Button>
                    </div>
                  </div>
                  
                  {isAdmin && showAdminPanel && <div className="mb-6">
                      <CallControlPanel />
                    </div>}
                  
                  <CallList />
                </>} />
            <Route path="/upload" element={<>
                  <div className="flex items-center mb-6">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/calls")} className="mr-4">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                    </Button>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">Subir Llamadas</h2>
                      <p className="text-muted-foreground">
                        Sube grabaciones de llamadas para análisis
                      </p>
                    </div>
                  </div>
                  <CallUpload />
                </>} />
            <Route path="/:id" element={<>
                  <div className="flex items-center mb-6">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/calls")} className="mr-4">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                    </Button>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">Detalles de la Llamada</h2>
                      <p className="text-muted-foreground">transcripción, análisis y feedback</p>
                    </div>
                  </div>
                  <CallDetail />
                </>} />
          </Routes>
        </main>
      </div>
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'}`}>
        <Footer />
      </div>
    </div>
  );
}
