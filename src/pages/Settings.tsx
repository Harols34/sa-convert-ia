
import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/hooks/useUser";
import ProfileSection from "@/components/settings/ProfileSection";
import PasswordSection from "@/components/settings/PasswordSection";
import AudioSettings from "@/components/settings/AudioSettings";

export default function Settings() {
  const { isLoading: loadingSettings } = useAudioSettings();
  const { user, isLoading: loadingUser } = useUser();
  const { isAuthenticated, loading: loadingAuth } = useAuth();
  
  // Create stable references for components using React.memo to improve performance
  const MemoizedProfileSection = React.memo(ProfileSection);
  const MemoizedPasswordSection = React.memo(PasswordSection);
  const MemoizedAudioSettings = React.memo(AudioSettings);

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
    <Layout>
      <h2 className="text-3xl font-bold tracking-tight mb-6">Configuración</h2>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-2 gap-2">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="audio">Procesamiento de Audio</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <MemoizedProfileSection />
          <MemoizedPasswordSection />
        </TabsContent>
        
        <TabsContent value="audio" className="space-y-6">
          <MemoizedAudioSettings />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
