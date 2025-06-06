
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  UserPlus,
  PlusCircle,
  ChevronLeft,
  Menu,
  Home,
  Shield,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  isOpen?: boolean;
  closeSidebar?: () => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

const Sidebar = ({ isOpen, closeSidebar, collapsed = false, setCollapsed }: SidebarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    if (collapsed) return; // Don't expand sections when collapsed
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isInSection = (basePath: string) => location.pathname.startsWith(basePath);

  // Check if user is superAdmin or admin
  const canManageUsers = user?.role === "superAdmin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "superAdmin";

  const handleToggleCollapse = () => {
    if (setCollapsed) {
      setCollapsed(!collapsed);
      localStorage.setItem('sidebar-collapsed', (!collapsed).toString());
    }
  };

  // Organize menu items by categories
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

  // Add admin categories
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

  // Settings category
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

  const MenuItem = ({ item, categoryCollapsed = false }: { item: any; categoryCollapsed?: boolean }) => {
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
    <div className={cn(
      "h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64",
      isOpen ? "block" : "hidden md:flex"
    )}>
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-gray-200 flex items-center",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold text-primary">ConvertIA</h1>
            <p className="text-xs text-muted-foreground">Analytics Platform</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleCollapse}
          className={cn(
            "h-8 w-8 p-0 hover:bg-gray-100",
            collapsed ? "mx-auto" : ""
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {menuCategories.map((category, categoryIndex) => {
          const CategoryIcon = category.icon;
          
          return (
            <div key={category.label}>
              {/* Category Header */}
              {!collapsed && (
                <div className="flex items-center gap-2 px-3 py-2 mb-2">
                  <CategoryIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {category.label}
                  </span>
                </div>
              )}
              
              {/* Category Items */}
              <div className="space-y-1">
                {category.items.map((item) => (
                  <MenuItem key={item.path} item={item} categoryCollapsed={collapsed} />
                ))}
              </div>
              
              {/* Divider between categories */}
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

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {(user?.name || user?.full_name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || user?.full_name || "Usuario"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
