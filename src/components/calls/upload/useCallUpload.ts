
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";

export interface UploadFile {
  file: File;
  agentId: string;
  agentName: string;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  error?: string;
  duration?: number;
}

export function useCallUpload() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();

  const updateFileStatus = useCallback((fileId: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
  }, []);

  const getAudioDuration = useCallback((file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      const objectUrl = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        URL.revokeObjectURL(objectUrl);
        resolve(isNaN(duration) ? 0 : duration);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(0);
      });
      
      audio.src = objectUrl;
    });
  }, []);

  const uploadFile = useCallback(async (uploadFile: UploadFile) => {
    if (!selectedAccountId || selectedAccountId === 'all') {
      updateFileStatus(uploadFile.id, { 
        status: "error", 
        error: "Debe seleccionar una cuenta específica para subir archivos" 
      });
      return;
    }

    try {
      // Calculate audio duration
      const duration = await getAudioDuration(uploadFile.file);
      console.log(`Audio duration calculated: ${duration} seconds for file ${uploadFile.file.name}`);
      
      updateFileStatus(uploadFile.id, { 
        status: "uploading", 
        progress: 10,
        duration: duration 
      });

      const timestamp = Date.now();
      const fileName = `${timestamp}-${uploadFile.file.name}`;
      const filePath = `${selectedAccountId}/${fileName}`;

      updateFileStatus(uploadFile.id, { progress: 30 });

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(filePath, uploadFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      updateFileStatus(uploadFile.id, { progress: 50 });

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('call-recordings')
        .getPublicUrl(filePath);

      updateFileStatus(uploadFile.id, { progress: 70 });

      // Create call record in database with duration
      const { data: callData, error: dbError } = await supabase
        .from('calls')
        .insert({
          title: uploadFile.file.name.replace(/\.[^/.]+$/, ''),
          filename: uploadFile.file.name,
          agent_name: uploadFile.agentName,
          agent_id: uploadFile.agentId === "manual" ? null : uploadFile.agentId,
          duration: Math.round(duration), // Store duration in seconds as integer
          date: new Date().toISOString(),
          status: 'pending',
          progress: 0,
          audio_url: urlData.publicUrl,
          account_id: selectedAccountId
        })
        .select()
        .single();

      if (dbError) throw dbError;

      updateFileStatus(uploadFile.id, { 
        status: "processing", 
        progress: 80 
      });

      console.log(`Call created with duration: ${duration} seconds`);

      // Start processing
      const { error: processError } = await supabase.functions.invoke('process-call', {
        body: {
          callId: callData.id,
          audioUrl: urlData.publicUrl,
          selectedBehaviorIds: []
        }
      });

      if (processError) {
        console.error('Processing error:', processError);
        updateFileStatus(uploadFile.id, { 
          status: "error", 
          error: `Error al procesar: ${processError.message}` 
        });
        return;
      }

      updateFileStatus(uploadFile.id, { 
        status: "complete", 
        progress: 100 
      });

      toast.success(`Archivo ${uploadFile.file.name} procesado exitosamente`);

    } catch (error: any) {
      console.error('Upload error:', error);
      updateFileStatus(uploadFile.id, { 
        status: "error", 
        error: error.message || "Error desconocido" 
      });
      toast.error(`Error al subir ${uploadFile.file.name}: ${error.message}`);
    }
  }, [selectedAccountId, updateFileStatus, getAudioDuration]);

  const uploadFiles = useCallback(async () => {
    if (files.length === 0) {
      toast.error("No hay archivos para subir");
      return;
    }

    if (!selectedAccountId || selectedAccountId === 'all') {
      toast.error("Debe seleccionar una cuenta específica para subir archivos");
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload files sequentially to avoid overwhelming the system
      for (const file of files.filter(f => f.status === "pending")) {
        await uploadFile(file);
      }
    } finally {
      setIsUploading(false);
    }
  }, [files, selectedAccountId, uploadFile]);

  const addFiles = useCallback((newFiles: File[]) => {
    const uploadFiles = newFiles.map(file => ({
      file,
      agentId: "",
      agentName: "",
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: "pending" as const
    }));
    
    setFiles(prev => [...prev, ...uploadFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const updateFile = useCallback((fileId: string, updates: Partial<UploadFile>) => {
    updateFileStatus(fileId, updates);
  }, [updateFileStatus]);

  const clearCompletedFiles = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== "complete"));
  }, []);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    updateFile,
    uploadFiles,
    clearCompletedFiles
  };
}
