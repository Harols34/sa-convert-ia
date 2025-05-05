
import React, { useState, useEffect } from "react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { settings, isLoading: loadingSettings, updateSetting } = useAudioSettings();
  const { user, isLoading: loadingUser } = useUser();
  const { isAuthenticated, loading: loadingAuth } = useAuth();
  
  // Profile state
  const [fullName, setFullName] = useState("");
  const [biography, setBiography] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      
      // Fetch biography from profiles table if it exists
      const fetchBiography = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('biography')
          .eq('id', user.id)
          .single();
        
        if (!error && data && data.biography) {
          setBiography(data.biography);
        }
      };
      
      fetchBiography();
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSavingProfile(true);
    try {
      // Update profile in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          biography: biography,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      console.error("Error al guardar el perfil:", error);
      toast.error("Error al guardar el perfil");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Por favor complete todos los campos");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    
    setIsChangingPassword(true);
    try {
      // Use the updateUserPassword edge function to change password
      const { error } = await supabase.functions.invoke('updateUserPassword', {
        body: { 
          userId: user?.id,
          password: newPassword 
        }
      });
      
      if (error) throw error;
      
      toast.success("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error al cambiar la contraseña:", error);
      toast.error("Error al cambiar la contraseña");
    } finally {
      setIsChangingPassword(false);
    }
  };

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
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Perfil</CardTitle>
                  <CardDescription>
                    Actualiza tu información de perfil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" type="email" value={user?.email || ""} disabled />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre completo</Label>
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="biography">Biografía</Label>
                    <Textarea 
                      id="biography" 
                      value={biography} 
                      onChange={(e) => setBiography(e.target.value)}
                      placeholder="Cuéntanos sobre ti..." 
                      rows={4}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : "Guardar cambios"}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Cambiar Contraseña</CardTitle>
                  <CardDescription>
                    Actualiza tu contraseña de acceso
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva contraseña</Label>
                    <Input 
                      id="newPassword"
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleChangePassword}
                    disabled={isChangingPassword || !newPassword || !confirmPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cambiando...
                      </>
                    ) : "Cambiar contraseña"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="audio" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Transcripción</CardTitle>
                  <CardDescription>
                    Gestiona las opciones de procesamiento de audio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="timestamps">Mostrar Marcas de Tiempo</Label>
                      <Switch
                        id="timestamps"
                        defaultChecked={settings?.timestamps}
                        onCheckedChange={(checked) => updateSetting("timestamps", checked)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Label htmlFor="punctuation">Puntuación</Label>
                      <Switch
                        id="punctuation"
                        defaultChecked={settings?.punctuation}
                        onCheckedChange={(checked) => updateSetting("punctuation", checked)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Label htmlFor="noise_filter">Filtro de Ruido</Label>
                      <Switch
                        id="noise_filter"
                        defaultChecked={settings?.noiseFilter}
                        onCheckedChange={(checked) => updateSetting("noiseFilter", checked)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Label htmlFor="normalize">Normalizar Audio</Label>
                      <Switch
                        id="normalize"
                        defaultChecked={settings?.normalizeAudio}
                        onCheckedChange={(checked) => updateSetting("normalizeAudio", checked)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Label htmlFor="sentiment_analysis">Análisis de Sentimiento</Label>
                      <Switch
                        id="sentiment_analysis"
                        defaultChecked={settings?.sentiment_analysis}
                        onCheckedChange={(checked) => updateSetting("sentiment_analysis", checked)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Label htmlFor="keyword_spotting">Detección de Palabras Clave</Label>
                      <Switch
                        id="keyword_spotting"
                        defaultChecked={settings?.keyword_spotting}
                        onCheckedChange={(checked) => updateSetting("keyword_spotting", checked)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Label htmlFor="speaker_diarization">Diarización del Hablante</Label>
                      <Switch
                        id="speaker_diarization"
                        defaultChecked={settings?.speakerDiarization}
                        onCheckedChange={(checked) => updateSetting("speakerDiarization", checked)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Label htmlFor="speed_detection">Detección de Velocidad del Habla</Label>
                      <Switch
                        id="speed_detection"
                        defaultChecked={settings?.speechRateDetection}
                        onCheckedChange={(checked) => updateSetting("speechRateDetection", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="min_silence_duration">Duración Mínima de Silencio (ms)</Label>
                      <Input
                        id="min_silence_duration"
                        type="number"
                        defaultValue={settings?.minSilenceDuration?.toString() || "100"}
                        onChange={(e) => updateSetting("minSilenceDuration", parseInt(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="silence_threshold">Umbral de Silencio</Label>
                      <Input
                        id="silence_threshold"
                        type="number"
                        defaultValue={settings?.silenceThreshold?.toString() || "-40"}
                        onChange={(e) => updateSetting("silenceThreshold", parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Modelos de IA</CardTitle>
                  <CardDescription>
                    Selecciona los modelos utilizados para transcripción y análisis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="transcription_model">Modelo de Transcripción</Label>
                    <Select
                      defaultValue={settings?.model || "whisper-1"}
                      onValueChange={(value) => updateSetting("model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whisper-1">Whisper-1</SelectItem>
                        {/* Add more models here as needed */}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="analysis_model">Modelo de Análisis</Label>
                    <Select
                      defaultValue={settings?.analysis_model || "gpt-3.5-turbo"}
                      onValueChange={(value) => updateSetting("analysis_model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-3.5-turbo">GPT 3.5 Turbo</SelectItem>
                        {/* Add more models here as needed */}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notificaciones" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preferencias de Notificaciones</CardTitle>
                  <CardDescription>
                    Configura cómo y cuándo recibir notificaciones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed" htmlFor="auto_feedback">
                      Recibir feedback automático
                    </Label>
                    <Switch id="auto_feedback"
                      defaultChecked={settings?.auto_feedback}
                      onCheckedChange={(checked) => updateSetting("auto_feedback", checked)} />
                  </div>
                </CardContent>
              </Card>
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
