
import React from "react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
      
      <div className="flex-1 ml-0 md:ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-4 shadow-sm dark:bg-gray-900 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden"
          >
            <Menu />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </div>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
