
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart3, 
  Phone, 
  Users, 
  Cog, 
  MessageSquare, 
  Brain,
  Building,
  MessageCircle,
  FileText,
  UserPlus,
  Tag
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const navigation = [
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
  },
  {
    name: "Llamadas",
    href: "/calls",
    icon: Phone,
    roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
  },
  {
    name: "Agentes",
    href: "/agents",
    icon: Users,
    roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor"]
  },
  {
    name: "Chat IA",
    href: "/chat",
    icon: MessageSquare,
    roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
  },
  {
    name: "Comportamientos",
    href: "/behaviors",
    icon: Brain,
    roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
  },
  {
    name: "Prompts",
    href: "/prompts",
    icon: MessageCircle,
    roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
  },
  {
    name: "Tipificaciones",
    href: "/tipificaciones",
    icon: Tag,
    roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor"]
  },
  {
    name: "Usuarios",
    href: "/users",
    icon: UserPlus,
    roles: ["superAdmin", "admin"]
  },
  {
    name: "Cuentas",
    href: "/accounts",
    icon: Building,
    roles: ["superAdmin"]
  },
  {
    name: "Configuración",
    href: "/settings",
    icon: Cog,
    roles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
  }
];

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const filteredNavigation = navigation.filter(item => {
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  });

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Speech Analytics
          </h2>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive && "bg-muted font-medium"
                    )}
                    onClick={() => navigate(item.href)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
