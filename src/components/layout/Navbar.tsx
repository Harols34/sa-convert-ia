
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Menu, X, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import NotificationDropdown from "./NotificationDropdown";

interface NavbarProps {
  toggleSidebar: () => void;
  sidebarCollapsed?: boolean;
  onSearchOpen?: () => void;
}

const Navbar = ({
  toggleSidebar,
  sidebarCollapsed = false,
  onSearchOpen
}: NavbarProps) => {
  // Safe way to access router
  let navigate: (path: string) => void;
  try {
    const { useNavigate } = require('react-router-dom');
    const nav = useNavigate();
    navigate = nav;
  } catch (e) {
    navigate = (path: string) => {
      console.warn('Navigation attempted outside Router context:', path);
      window.location.href = path;
    };
  }

  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  
  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    switch (true) {
      case path === '/analytics':
        return 'Análisis';
      case path.startsWith('/calls'):
        return 'Llamadas';
      case path === '/agents':
        return 'Agentes';
      case path === '/workforce':
        return 'Supervisión';
      case path === '/chat':
        return 'Chat IA';
      case path === '/behaviors':
        return 'Comportamientos';
      case path === '/tipificaciones':
        return 'Tipificaciones';
      case path.startsWith('/prompts'):
        return 'Prompts';
      case path.startsWith('/users'):
        return 'Usuarios';
      case path.startsWith('/accounts'):
        return 'Cuentas';
      case path === '/settings':
        return 'Configuración';
      default:
        return 'ConvertIA Analytics';
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      toast.success("Sesión cerrada correctamente");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <header className="bg-background border-b sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/95">
      <div className={`
        px-4 flex h-16 items-center justify-between transition-all duration-300
        ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}
      `}>
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="md:hidden h-9 w-9"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          
          {/* Page title and breadcrumb */}
          <div className="hidden md:flex items-center gap-2">
            <img 
              src="https://www.convertia.com/favicon/favicon-convertia.png" 
              alt="Convert-IA Logo" 
              className="h-6 w-6" 
            />
            <div>
              <h1 className="font-semibold text-lg text-foreground">
                {getPageTitle()}
              </h1>
              {location.pathname !== '/' && (
                <p className="text-xs text-muted-foreground">
                  ConvertIA Analytics
                </p>
              )}
            </div>
          </div>

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2">
            <img 
              src="https://www.convertia.com/favicon/favicon-convertia.png" 
              alt="Convert-IA Logo" 
              className="h-6 w-6" 
            />
            <span className="font-bold text-lg text-primary">Convert-IA</span>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Search button for mobile */}
          {isMobile && onSearchOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchOpen}
              className="h-9 w-9"
            >
              <Search className="h-4 w-4" />
              <span className="sr-only">Buscar</span>
            </Button>
          )}

          {/* Search button for desktop */}
          {!isMobile && onSearchOpen && (
            <Button
              variant="outline"
              onClick={onSearchOpen}
              className="h-9 w-48 justify-start text-muted-foreground"
            >
              <Search className="mr-2 h-4 w-4" />
              Buscar...
              <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                ⌘K
              </kbd>
            </Button>
          )}

          {/* Notifications */}
          <NotificationDropdown />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url || user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(user?.name || user?.full_name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || user?.full_name || "Usuario"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {user?.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                Perfil y Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
