
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";

// Re-defining AudioSettings here to fix the missing type issue
export interface AudioSettings {
  silenceDetection: boolean;
  silenceThreshold: number;
  minSilenceDuration: number;
  normalizeAudio: boolean;
  noiseFilter: boolean;
  speechRateDetection: boolean;
  language: string;
  model: string;
  speakerDiarization: boolean;
  punctuation: boolean;
  timestamps: boolean;
  sentiment_analysis?: boolean;
  keyword_spotting?: boolean;
  analysis_model?: string;
  auto_feedback?: boolean;
}

// Configuración por defecto
const defaultSettings: AudioSettings = {
  silenceDetection: true,
  silenceThreshold: 0.2,
  minSilenceDuration: 2,
  normalizeAudio: false,
  noiseFilter: false,
  speechRateDetection: false,
  language: "es-ES",
  model: "standard",
  speakerDiarization: true,
  punctuation: true,
  timestamps: false,
  sentiment_analysis: true,
  keyword_spotting: true,
  analysis_model: "gpt-3.5-turbo",
  auto_feedback: true
};

export function useAudioSettings() {
  const [settings, setSettings] = useState<AudioSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    async function loadSettings() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const cachedSettings = localStorage.getItem('audio-settings');
        if (cachedSettings) {
          try {
            const parsed = JSON.parse(cachedSettings);
            setSettings(parsed);
            console.log("Configuraciones cargadas desde caché local");
          } catch (e) {
            console.error("Error al parsear configuraciones de localStorage:", e);
          }
        }
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') {
          console.error("Error al cargar configuraciones:", error);
        }
        if (data) {
          const loadedSettings: AudioSettings = {
            silenceDetection: data.silence_detection ?? defaultSettings.silenceDetection,
            silenceThreshold: data.silence_threshold ?? defaultSettings.silenceThreshold,
            minSilenceDuration: data.min_silence_duration ?? defaultSettings.minSilenceDuration,
            normalizeAudio: data.normalize ?? defaultSettings.normalizeAudio, 
            noiseFilter: data.noise_filter ?? defaultSettings.noiseFilter,
            speechRateDetection: data.speed_detection ?? defaultSettings.speechRateDetection, 
            language: data.language ?? defaultSettings.language,
            model: data.transcription_model ?? defaultSettings.model,
            speakerDiarization: data.speaker_diarization ?? defaultSettings.speakerDiarization,
            punctuation: data.punctuation ?? defaultSettings.punctuation,
            timestamps: data.timestamps ?? defaultSettings.timestamps,
            sentiment_analysis: data.sentiment_analysis,
            keyword_spotting: data.keyword_spotting,
            analysis_model: data.analysis_model,
            auto_feedback: data.auto_feedback
          };
          setSettings(loadedSettings);
          localStorage.setItem('audio-settings', JSON.stringify(loadedSettings));
          console.log("Configuraciones cargadas desde base de datos y actualizadas en caché");
        }
      } catch (err) {
        console.error("Error al cargar configuraciones:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [user?.id]);
  
  const saveSettings = useCallback(async (newSettings: AudioSettings) => {
    if (!user?.id) {
      toast.error("Debes iniciar sesión para guardar configuraciones");
      return;
    }
    try {
      setIsSaving(true);
      const dbData = {
        user_id: user.id,
        silence_detection: newSettings.silenceDetection,
        silence_threshold: newSettings.silenceThreshold,
        min_silence_duration: newSettings.minSilenceDuration,
        normalize: newSettings.normalizeAudio, 
        noise_filter: newSettings.noiseFilter,
        speed_detection: newSettings.speechRateDetection,
        language: newSettings.language,
        transcription_model: newSettings.model,
        speaker_diarization: newSettings.speakerDiarization,
        punctuation: newSettings.punctuation,
        timestamps: newSettings.timestamps,
        sentiment_analysis: newSettings.sentiment_analysis,
        keyword_spotting: newSettings.keyword_spotting,
        analysis_model: newSettings.analysis_model,
        auto_feedback: newSettings.auto_feedback,
        updated_at: new Date().toISOString()
      };
      
      console.log("Guardando configuraciones:", dbData);
      
      // Primero, verifica si ya existe una configuración para este usuario
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      let error;
        
      if (existingSettings) {
        // Si existe, actualízala
        const result = await supabase
          .from('user_settings')
          .update(dbData)
          .eq('user_id', user.id);
          
        error = result.error;
      } else {
        // Si no existe, créala
        const result = await supabase
          .from('user_settings')
          .insert([dbData]);
          
        error = result.error;
      }
      
      if (error) {
        throw error;
      }
      
      setSettings(newSettings);
      localStorage.setItem('audio-settings', JSON.stringify(newSettings));
      toast.success("Configuraciones guardadas correctamente");
    } catch (error: any) {
      console.error("Error al guardar configuraciones:", error);
      toast.error("Error al guardar configuraciones");
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);
  
  const updateSetting = useCallback(<K extends keyof AudioSettings>(key: K, value: AudioSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    toast.info("Configuraciones restablecidas a los valores predeterminados");
  }, []);
  
  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
    updateSetting,
    resetSettings
  };
}
