
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Phone,
  Users,
  UserCheck,
  Settings,
  MessageSquare,
  Brain,
  FileText,
  PenTool,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  Shield,
  Bell,
  Search,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationDropdown from "./NotificationDropdown";
import { toast } from "sonner";

interface SidebarProps {
  isOpen?: boolean;
  closeSidebar?: () => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  onSearchOpen?: () => void;
}

const Sidebar = ({ isOpen, closeSidebar, collapsed = false, setCollapsed, onSearchOpen }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    if (collapsed) return;
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isInSection = (basePath: string) => location.pathname.startsWith(basePath);

  const canManageUsers = user?.role === "superAdmin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "superAdmin";

  const handleToggleCollapse = () => {
    if (setCollapsed) {
      setCollapsed(!collapsed);
      localStorage.setItem('sidebar-collapsed', (!collapsed).toString());
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

  const menuCategories = [
    {
      label: "Operación",
      icon: Briefcase,
      items: [
        {
          icon: BarChart3,
          label: "Análisis",
          path: "/analytics",
          tooltip: "Métricas de llamadas e insights de rendimiento"
        },
        {
          icon: Phone,
          label: "Llamadas",
          path: "/calls",
          tooltip: "Ver, gestionar y analizar llamadas"
        },
        {
          icon: Users,
          label: "Agentes",
          path: "/agents",
          tooltip: "Gestión de agentes de ventas"
        },
        {
          icon: UserCheck,
          label: "Supervisión",
          path: "/workforce",
          tooltip: "Monitoreo y supervisión de equipos"
        },
      ]
    },
    {
      label: "Herramientas IA",
      icon: Brain,
      items: [
        {
          icon: MessageSquare,
          label: "Chat IA",
          path: "/chat",
          tooltip: "Asistente de inteligencia artificial"
        },
        {
          icon: Brain,
          label: "Comportamientos",
          path: "/behaviors",
          tooltip: "Análisis de patrones de comportamiento"
        },
        {
          icon: FileText,
          label: "Tipificaciones",
          path: "/tipificaciones",
          tooltip: "Categorización y etiquetado"
        },
        {
          icon: PenTool,
          label: "Prompts",
          path: "/prompts",
          hasSubmenu: true,
          tooltip: "Gestión de prompts de IA",
          submenuItems: [
            { label: "Ver Prompts", path: "/prompts" },
            { label: "Crear Prompt", path: "/prompts/new" },
          ],
        },
      ]
    }
  ];

  if (canManageUsers) {
    menuCategories.push({
      label: "Administración",
      icon: Shield,
      items: [
        {
          icon: Users,
          label: "Usuarios",
          path: "/users",
          hasSubmenu: true,
          tooltip: "Gestión de usuarios del sistema",
          submenuItems: [
            { label: "Ver Usuarios", path: "/users" },
            { label: "Crear Usuario", path: "/users/new" },
          ],
        },
      ]
    });
  }

  if (isSuperAdmin) {
    const adminCategory = menuCategories.find(cat => cat.label === "Administración");
    if (adminCategory) {
      adminCategory.items.push({
        icon: Building2,
        label: "Cuentas",
        path: "/accounts",
        hasSubmenu: true,
        tooltip: "Gestión de cuentas empresariales",
        submenuItems: [
          { label: "Ver Cuentas", path: "/accounts" },
          { label: "Crear Cuenta", path: "/accounts/new" },
          { label: "Asignar Usuarios", path: "/accounts/assign" },
        ],
      });
    }
  }

  menuCategories.push({
    label: "Configuración",
    icon: Settings,
    items: [
      {
        icon: Settings,
        label: "Configuración",
        path: "/settings",
        tooltip: "Configuración del sistema y perfil"
      },
    ]
  });

  const MenuItem = ({ item }: { item: any }) => {
    const Icon = item.icon;
    const hasSubmenu = item.hasSubmenu && item.submenuItems;
    const isExpanded = expandedSections.includes(item.path);
    const itemIsActive = hasSubmenu ? isInSection(item.path) : isActive(item.path);

    const menuButton = (
      <div>
        {hasSubmenu ? (
          <div>
            <button
              onClick={() => toggleSection(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200",
                collapsed ? "justify-center" : "justify-between",
                itemIsActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </div>
              {!collapsed && (isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              ))}
            </button>
            {isExpanded && !collapsed && item.submenuItems && (
              <div className="mt-1 ml-6 space-y-1">
                {item.submenuItems.map((subItem: any) => (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    onClick={closeSidebar}
                    className={cn(
                      "block px-3 py-2 text-sm rounded-lg transition-colors",
                      isActive(subItem.path)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link
            to={item.path}
            onClick={closeSidebar}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 font-medium",
              collapsed ? "justify-center" : "",
              itemIsActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )}
      </div>
    );

    if (collapsed && item.tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {menuButton}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            <p>{item.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuButton;
  };

  return (
    <TooltipProvider>
      <div className={cn(
        "h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
        isOpen ? "block" : "hidden md:flex"
      )}>
        {/* Header with Logo */}
        <div className={cn(
          "p-4 border-b border-gray-200 flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <img 
                src="https://www.convertia.com/favicon/favicon-convertia.png" 
                alt="Convert-IA Logo" 
                className="h-8 w-8" 
              />
              <div>
                <h1 className="text-lg font-bold text-primary">ConvertIA</h1>
                <p className="text-xs text-muted-foreground">Analytics Platform</p>
              </div>
            </div>
          ) : (
            <img 
              src="https://www.convertia.com/favicon/favicon-convertia.png" 
              alt="Convert-IA Logo" 
              className="h-8 w-8" 
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleCollapse}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Current Page Title - Desktop Only */}
        {!collapsed && (
          <div className="hidden md:block px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{getPageTitle()}</p>
            <p className="text-xs text-gray-500">Módulo actual</p>
          </div>
        )}

        {/* Search Button */}
        <div className="p-3 border-b border-gray-100">
          {!collapsed ? (
            <Button
              variant="outline"
              onClick={onSearchOpen}
              className="w-full justify-start text-muted-foreground hover:bg-gray-50"
            >
              <Search className="mr-2 h-4 w-4" />
              Buscar módulos...
              <div className="ml-auto flex items-center gap-0.5">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onSearchOpen}
                  className="w-full"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Buscar módulos</p>
                <p className="text-xs text-muted-foreground">⌘K</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          {menuCategories.map((category, categoryIndex) => {
            const CategoryIcon = category.icon;
            
            return (
              <div key={category.label}>
                {!collapsed && (
                  <div className="flex items-center gap-2 px-3 py-2 mb-2">
                    <CategoryIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {category.label}
                    </span>
                  </div>
                )}
                
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <MenuItem key={item.path} item={item} />
                  ))}
                </div>
                
                {categoryIndex < menuCategories.length - 1 && (
                  <div className={cn(
                    "border-t border-gray-200 mt-4",
                    collapsed ? "mx-1" : "mx-3"
                  )} />
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer with Notifications and User */}
        <div className="p-3 border-t border-gray-200 space-y-3">
          {/* Notifications */}
          <div className={cn("flex", collapsed ? "justify-center" : "justify-start")}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <NotificationDropdown />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Notificaciones</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <NotificationDropdown />
            )}
          </div>

          {/* User Profile */}
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
            {collapsed ? (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.avatar_url || user?.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(user?.name || user?.full_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{user?.name || user?.full_name || "Usuario"}</p>
                    <p className="text-xs text-muted-foreground">{user?.role}</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent className="w-56" align="center" forceMount>
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
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url || user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(user?.name || user?.full_name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || user?.full_name || "Usuario"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48" align="end">
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      Configuración
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
