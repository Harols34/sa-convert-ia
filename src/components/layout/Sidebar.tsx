
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  isOpen?: boolean;
  closeSidebar?: () => void;
}

const Sidebar = ({ isOpen, closeSidebar }: SidebarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
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

  const menuItems = [
    {
      icon: BarChart3,
      label: "Análisis",
      path: "/analytics",
    },
    {
      icon: Phone,
      label: "Llamadas",
      path: "/calls",
    },
    {
      icon: Users,
      label: "Agentes",
      path: "/agents",
    },
    {
      icon: UserCheck,
      label: "Supervisión",
      path: "/workforce",
    },
    {
      icon: MessageSquare,
      label: "Chat IA",
      path: "/chat",
    },
    {
      icon: Brain,
      label: "Comportamientos",
      path: "/behaviors",
    },
    {
      icon: FileText,
      label: "Tipificaciones",
      path: "/tipificaciones",
    },
    {
      icon: PenTool,
      label: "Prompts",
      path: "/prompts",
      hasSubmenu: true,
      submenuItems: [
        { label: "Ver Prompts", path: "/prompts" },
        { label: "Crear Prompt", path: "/prompts/new" },
      ],
    },
  ];

  // Add admin/superAdmin specific menu items
  if (canManageUsers) {
    menuItems.push({
      icon: Users,
      label: "Usuarios",
      path: "/users",
      hasSubmenu: true,
      submenuItems: [
        { label: "Ver Usuarios", path: "/users" },
        { label: "Crear Usuario", path: "/users/new" },
      ],
    });
  }

  if (isSuperAdmin) {
    menuItems.push({
      icon: Building2,
      label: "Cuentas",
      path: "/accounts",
      hasSubmenu: true,
      submenuItems: [
        { label: "Ver Cuentas", path: "/accounts" },
        { label: "Crear Cuenta", path: "/accounts/new" },
        { label: "Asignar Usuarios", path: "/accounts/assign" },
      ],
    });
  }

  menuItems.push({
    icon: Settings,
    label: "Configuración",
    path: "/settings",
  });

  return (
    <div className={cn(
      "h-full bg-white border-r border-gray-200 w-64 flex flex-col",
      isOpen ? "block" : "hidden md:flex"
    )}>
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary">ConvertIA</h1>
        <p className="text-sm text-muted-foreground">Analytics Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasSubmenu = item.hasSubmenu && item.submenuItems;
          const isExpanded = expandedSections.includes(item.path);
          const itemIsActive = hasSubmenu ? isInSection(item.path) : isActive(item.path);

          return (
            <div key={item.path}>
              {hasSubmenu ? (
                <div>
                  <button
                    onClick={() => toggleSection(item.path)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors",
                      itemIsActive
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isExpanded && item.submenuItems && (
                    <div className="mt-1 ml-6 space-y-1">
                      {item.submenuItems.map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={closeSidebar}
                          className={cn(
                            "block px-3 py-2 text-sm rounded-lg transition-colors",
                            isActive(subItem.path)
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-gray-600 hover:bg-gray-50"
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
                    "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                    itemIsActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
