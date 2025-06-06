
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import GlobalSearch from "./GlobalSearch";
import { Button } from "@/components/ui/button";
import { Menu, Search } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    
    // Load sidebar state from localStorage
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      
      // Ctrl/Cmd + B for sidebar toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => {
          const newState = !prev;
          localStorage.setItem('sidebar-collapsed', newState.toString());
          return newState;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);
  
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static md:inset-0
      `}>
        <Sidebar 
          isOpen={sidebarOpen} 
          closeSidebar={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main content */}
      <div className={`
        flex-1 flex flex-col transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}
      `}>
        {/* Top bar for mobile */}
        <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 shadow-sm dark:bg-gray-900 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src="https://www.convertia.com/favicon/favicon-convertia.png" 
                alt="Convert-IA Logo" 
                className="h-6 w-6" 
              />
              <span className="font-bold text-lg text-primary">Convert-IA</span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="h-9 w-9"
            >
              <Search className="h-4 w-4" />
              <span className="sr-only">Buscar</span>
            </Button>
          </div>
        </div>

        {/* Desktop search bar */}
        <div className="hidden md:block sticky top-0 z-30 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex h-14 items-center gap-4 px-6">
            <Button
              variant="outline"
              onClick={() => setSearchOpen(true)}
              className="h-9 w-64 justify-start text-muted-foreground hover:bg-gray-50"
            >
              <Search className="mr-2 h-4 w-4" />
              Buscar módulos...
              <div className="ml-auto flex items-center gap-0.5">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearch 
        open={searchOpen} 
        onOpenChange={setSearchOpen}
      />
    </div>
  );
};

export default Layout;
