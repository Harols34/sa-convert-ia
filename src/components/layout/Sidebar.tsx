
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Phone,
  MessageSquare,
  Settings,
  Users,
  Target,
  Briefcase,
  Wrench,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation, Link } from "react-router-dom";
import { MenuItem } from "@/lib/types";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    {
      name: "Analytics",
      href: "/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    },
    {
      name: "Llamadas",
      href: "/calls",
      icon: <Phone className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    },
    {
      name: "Chat IA",
      href: "/chat",
      icon: <MessageSquare className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    },
    {
      name: "Organizaciones",
      href: "/organizations",
      icon: <Building2 className="h-5 w-5" />,
      role: ["superAdmin"]
    },
    {
      name: "Usuarios",
      href: "/users",
      icon: <Users className="h-5 w-5" />,
      role: ["superAdmin", "admin"]
    },
    {
      name: "Agentes",
      href: "/agents",
      icon: <Briefcase className="h-5 w-5" />,
      role: ["superAdmin", "admin", "supervisor"]
    },
    {
      name: "Workforce",
      href: "/workforce",
      icon: <Target className="h-5 w-5" />,
      role: ["superAdmin", "admin", "supervisor"]
    },
    {
      name: "Herramientas",
      href: "/tools",
      icon: <Wrench className="h-5 w-5" />,
      role: ["superAdmin", "admin"]
    },
    {
      name: "Comportamientos",
      href: "/behaviors",
      icon: <Target className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst"]
    },
    {
      name: "Tipificaciones",
      href: "/tipificaciones",
      icon: <FileText className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst"]
    },
    {
      name: "Prompts",
      href: "/prompts",
      icon: <MessageSquare className="h-5 w-5" />,
      role: ["superAdmin", "admin"]
    },
    {
      name: "Configuración",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    user && item.role.includes(user.role)
  );

  return (
    <div className={cn(
      "h-screen bg-sidebar-background text-sidebar-foreground transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <h1 className="text-lg font-semibold text-sidebar-foreground">
              CallCenter AI
            </h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent/10"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              
              return (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 transition-colors",
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent/10 hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.name}</span>}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Info */}
        {user && (
          <>
            <Separator className="border-sidebar-border" />
            <div className="p-4">
              <div className={cn(
                "flex items-center gap-3",
                collapsed && "justify-center"
              )}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-sidebar-foreground/70 capitalize">
                      {user.role}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
