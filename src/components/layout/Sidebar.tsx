import { useState } from "react";
import { useRouter } from 'next/router';
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Cog6Tooth, LogOut, Menu } from "lucide-react";
import { User as AuthUser } from "@supabase/supabase-js";
import { User } from "@/lib/types";
import { BarChart3, Settings, Users, Calendar, MessageSquare, FileText, Target, UserCheck, Shield, Wrench, Gauge } from "lucide-react";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  role: User["role"][];
}

interface SidebarProps {
  user: User | null;
}

export function Sidebar({ user }: SidebarProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const menuItems: MenuItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <BarChart3 className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    },
    {
      name: "Llamadas",
      href: "/calls", 
      icon: <FileText className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst", "supervisor"]
    },
    {
      name: "Chat IA",
      href: "/chat",
      icon: <MessageSquare className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    },
    {
      name: "Límites",
      href: "/limits",
      icon: <Gauge className="h-5 w-5" />,
      role: ["superAdmin"]
    },
    {
      name: "Cuentas",
      href: "/accounts",
      icon: <Shield className="h-5 w-5" />,
      role: ["superAdmin"]
    },
    {
      name: "Usuarios",
      href: "/users",
      icon: <Users className="h-5 w-5" />,
      role: ["superAdmin", "admin"]
    },
    {
      name: "Asignar Usuarios",
      href: "/assign-users",
      icon: <UserCheck className="h-5 w-5" />,
      role: ["superAdmin"]
    },
    {
      name: "Comportamientos",
      href: "/behaviors",
      icon: <Target className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst"]
    },
    {
      name: "Prompts",
      href: "/prompts",
      icon: <FileText className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst"]
    },
    {
      name: "Tipificaciones",
      href: "/tipificaciones",
      icon: <FileText className="h-5 w-5" />,
      role: ["superAdmin", "admin"]
    },
    {
      name: "Agentes",
      href: "/agents",
      icon: <Users className="h-5 w-5" />,
      role: ["superAdmin", "admin", "supervisor"]
    },
    {
      name: "Workforce",
      href: "/workforce",
      icon: <Calendar className="h-5 w-5" />,
      role: ["superAdmin", "admin", "supervisor"]
    },
    {
      name: "Herramientas",
      href: "/tools",
      icon: <Wrench className="h-5 w-5" />,
      role: ["superAdmin", "admin"]
    },
    {
      name: "Configuración",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    }
  ];

  const filteredMenuItems = menuItems.filter(item => item.role.includes(user?.role || 'agent'));

  return (
    <div className="flex flex-col h-full bg-gray-100 border-r py-4 w-60">
      <div className="px-4 mb-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.avatar_url || "/avatars/01.png"} alt={user?.name} />
          <AvatarFallback>{user?.name?.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="mt-2">
          <p className="font-semibold">{user?.full_name || user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>

      <Separator className="mb-4" />

      <ScrollArea className="flex-1 px-4">
        <nav className="flex flex-col space-y-1">
          {filteredMenuItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className={cn(
                "justify-start font-normal",
                router.pathname === item.href ? "bg-gray-200 hover:bg-gray-200" : "hover:bg-gray-100"
              )}
              onClick={() => router.push(item.href)}
            >
              {item.icon}
              <span>{item.name}</span>
            </Button>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="my-4" />

      <div className="px-4">
        <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/settings')}>
          <Cog6Tooth className="h-4 w-4 mr-2" />
          Configuración
        </Button>
        <Button variant="destructive" className="w-full justify-start mt-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>

      {/* Mobile menu */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <ScrollArea className="my-4">
            <nav className="grid gap-4">
              {filteredMenuItems.map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  className={cn(
                    "justify-start font-normal",
                    router.pathname === item.href ? "bg-gray-200 hover:bg-gray-200" : "hover:bg-gray-100"
                  )}
                  onClick={() => {
                    router.push(item.href);
                    setIsMenuOpen(false); // Close the menu after navigation
                  }}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Button>
              ))}
            </nav>
          </ScrollArea>
          <Separator className="my-4" />
          <Button variant="outline" className="w-full justify-start" onClick={() => {
            router.push('/settings');
            setIsMenuOpen(false);
          }}>
            <Cog6Tooth className="h-4 w-4 mr-2" />
            Configuración
          </Button>
          <Button variant="destructive" className="w-full justify-start mt-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
