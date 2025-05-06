
import React, { useState } from "react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/hooks/useUser";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import ProfileSection from "@/components/settings/ProfileSection";
import PasswordSection from "@/components/settings/PasswordSection";
import AudioSettings from "@/components/settings/AudioSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading: loadingSettings } = useAudioSettings();
  const { user, isLoading: loadingUser } = useUser();
  const { isAuthenticated, loading: loadingAuth } = useAuth();
  
  // Activate automatic reload prevention by timeout (30 minutes instead of 60)
  useSessionTimeout(30); // 30 minutes timeout

  if (loadingAuth || loadingUser || loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 md:p-6 ml-0 md:ml-64 transition-all duration-300">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Configuración</h2>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="audio">Procesamiento de Audio</TabsTrigger>
              <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <ProfileSection />
              <PasswordSection />
            </TabsContent>
            
            <TabsContent value="audio" className="space-y-6">
              <AudioSettings />
            </TabsContent>

            <TabsContent value="notificaciones" className="space-y-6">
              <NotificationSettings />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <div className="ml-0 md:ml-64 transition-all duration-300">
        <Footer />
      </div>
    </div>
  );
}
