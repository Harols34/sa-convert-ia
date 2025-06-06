import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Cog, 
  BarChart3, 
  Phone, 
  Users, 
  BriefcaseBusiness, 
  Wrench, 
  MessageSquareText, 
  CheckSquare, 
  User, 
  Folder, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X,
  FileText,
  Building2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AccountFilter from "@/components/accounts/AccountFilter";

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

export default function Sidebar({ isOpen, closeSidebar }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [collapsed, setCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setCollapsed(savedState === 'true');
    }
  }, []);

  // Save collapsed state to localStorage and notify other components
  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
    
    // Dispatch storage event manually to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'sidebar-collapsed',
      newValue: String(newState),
      oldValue: String(collapsed),
      storageArea: localStorage,
      url: window.location.href
    }));
  };

  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const menuItems = [
    {
      name: "Analítica",
      path: "/analytics",
      icon: <BarChart3 />,
      roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"],
    },
    {
      name: "Llamadas",
      path: "/calls",
      icon: <Phone />,
      roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"],
    },
    {
      name: "Agentes",
      path: "/agents",
      icon: <Users />,
      roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"],
    },
    {
      name: "Workforce",
      path: "/workforce",
      icon: <BriefcaseBusiness />,
      roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor"],
    },
    {
      name: "Herramientas",
      path: "/tools",
      icon: <Wrench />,
      roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor"],
    },
    {
      name: "Chat IA",
      path: "/chat",
      icon: <MessageSquareText />,
      roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"],
    },
    {
      name: "Comportamientos",
      path: "/behaviors",
      icon: <CheckSquare />,
      roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor"],
    },
    {
      name: "Tipificaciones",
      path: "/tipificaciones",
      icon: <Folder />,
      roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor"],
    },
    {
      name: "Prompts",
      path: "/prompts",
      icon: <FileText />,
      roles: ["superAdmin", "admin", "qualityAnalyst"],
    },
    {
      name: "Usuarios",
      path: "/users",
      icon: <User />,
      roles: ["superAdmin", "admin"],
    },
    {
      name: "Cuentas",
      path: "/accounts",
      icon: <Building2 />,
      roles: ["superAdmin"],
    },
    {
      name: "Configuración",
      path: "/settings",
      icon: <Cog />,
      roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"],
    },
  ];

  // CORREGIDO: SuperAdmin ve TODOS los módulos sin excepción
  const filteredMenuItems = user?.role === 'superAdmin' 
    ? menuItems // SuperAdmin ve todos los módulos
    : menuItems.filter(item => {
        if (!user?.role) return false;
        return item.roles.includes(user.role);
      });

  console.log("User role:", user?.role);
  console.log("Is SuperAdmin:", user?.role === 'superAdmin');
  console.log("Filtered menu items:", filteredMenuItems.map(item => item.name));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-10"
          onClick={closeSidebar}
        />
      )}
      
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex flex-col bg-white shadow-lg transition-all duration-300 dark:bg-gray-900 lg:shadow-none",
          {
            "translate-x-0": isOpen,
            "-translate-x-full md:translate-x-0": !isOpen,
            "w-64": !collapsed,
            "w-16": collapsed,
          }
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="border-b px-4 py-4 dark:border-gray-700 flex justify-between items-center">
          <div className={cn("flex items-center transition-opacity", { 
            "opacity-0 w-0": collapsed && !isHovering,
            "opacity-100": !collapsed || (collapsed && isHovering) 
          })}>
            <img 
              src="https://www.convertia.com/favicon/favicon-convertia.png" 
              alt="Convert-IA Logo" 
              className="h-7 w-7 mr-2" 
            />
            {(!collapsed || isHovering) && (
              <div className="text-lg font-semibold transition-opacity">Convert-IA</div>
            )}
          </div>
          <div className="flex items-center">
            {isMobile ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={closeSidebar} 
                className="flex md:hidden items-center justify-center h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleCollapse} 
                className="flex items-center justify-center h-8 w-8"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Filtro de cuentas - Solo mostrar para usuarios NO SuperAdmin */}
        {(!collapsed || isHovering) && user?.role !== 'superAdmin' && (
          <div className="py-2">
            <AccountFilter />
          </div>
        )}

        <ScrollArea className="flex-1 overflow-auto py-2">
          <TooltipProvider delayDuration={0}>
            <nav className="space-y-1">
              {filteredMenuItems.map((item) => (
                <Tooltip key={item.path} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center px-4 py-2.5 text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                        {
                          "border-l-4 border-primary bg-primary/5 font-medium text-primary dark:border-primary dark:bg-primary/10 dark:text-primary-foreground":
                            isActive(item.path),
                          "justify-center": collapsed && !isHovering,
                        }
                      )}
                    >
                      <span className={cn("h-5 w-5", { "mr-3": !collapsed || isHovering })}>
                        {item.icon}
                      </span>
                      {(!collapsed || isHovering) && (
                        <span className="truncate transition-opacity">{item.name}</span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={cn({ "hidden": !collapsed || isHovering })}>
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </nav>
          </TooltipProvider>
          <Separator className="my-2" />
        </ScrollArea>
      </aside>
    </>
  );
}
