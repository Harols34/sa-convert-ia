
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useAccount } from "@/context/AccountContext";

export interface CallFile {
  id: string;
  file: File;
  uploadProgress: number;
  isUploading: boolean;
  error?: string;
  status?: "idle" | "uploading" | "processing" | "success" | "error";
  progress?: number;
  info?: string;
}

// Export FileItem as an alias for CallFile to maintain compatibility
export type FileItem = CallFile;

export function useCallUpload() {
  const [files, setFiles] = useState<CallFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useUser();
  const { selectedAccountId } = useAccount();

  // Get account_id from the account context
  const getAccountId = useCallback(() => {
    console.log('Getting account ID:', selectedAccountId);
    return selectedAccountId;
  }, [selectedAccountId]);

  const addFiles = useCallback((newFiles: File[]) => {
    const callFiles: CallFile[] = newFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      uploadProgress: 0,
      isUploading: false,
      status: "idle",
      progress: 0,
    }));
    
    setFiles(prev => [...prev, ...callFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const uploadFiles = useCallback(async (prompts?: { 
    summaryPrompt?: string; 
    feedbackPrompt?: string;
    selectedBehaviors?: string[];
  }) => {
    if (files.length === 0) {
      toast.error("No hay archivos para subir");
      return;
    }

    const accountId = getAccountId();
    console.log('Account ID for upload:', accountId);
    
    if (!accountId) {
      toast.error("No se ha seleccionado una cuenta");
      return;
    }

    setIsUploading(true);
    const uploadPromises = files.map(callFile => uploadSingleFile(callFile, prompts));
    
    try {
      await Promise.all(uploadPromises);
      toast.success(`${files.length} archivo(s) procesado(s) exitosamente`);
      setFiles([]);
    } catch (error) {
      console.error("Error en el procesamiento masivo:", error);
      toast.error("Error en el procesamiento de algunos archivos");
    } finally {
      setIsUploading(false);
    }
  }, [files, getAccountId]);

  const uploadSingleFile = async (
    callFile: CallFile, 
    prompts?: { 
      summaryPrompt?: string; 
      feedbackPrompt?: string;
      selectedBehaviors?: string[];
    }
  ) => {
    const updateFileProgress = (progress: number, error?: string, status?: CallFile["status"]) => {
      setFiles(prev => prev.map(f => 
        f.id === callFile.id 
          ? { 
              ...f, 
              uploadProgress: progress, 
              progress,
              error, 
              isUploading: progress < 100 && progress > 0,
              status: status || (progress === 100 ? "success" : progress > 0 ? "uploading" : "idle")
            }
          : f
      ));
    };

    try {
      updateFileProgress(10, undefined, "uploading");

      const accountId = getAccountId();
      console.log('Using account ID for file upload:', accountId);
      
      if (!accountId) {
        throw new Error("Account ID not found");
      }

      // Upload to storage
      const timestamp = Date.now();
      const filename = `${timestamp}-${callFile.file.name}`;
      const filePath = `${accountId}/${filename}`;

      updateFileProgress(20, undefined, "uploading");

      const { error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(filePath, callFile.file);

      if (uploadError) {
        throw new Error(`Error subiendo archivo: ${uploadError.message}`);
      }

      updateFileProgress(40, undefined, "uploading");

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('call-recordings')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error("No se pudo obtener la URL del archivo");
      }

      updateFileProgress(50, undefined, "processing");

      // Create call record with required fields
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert({
          title: callFile.file.name.replace(/\.[^/.]+$/, ""),
          filename: filename,
          audio_url: urlData.publicUrl,
          status: 'pending',
          progress: 0,
          account_id: accountId,
          agent_name: user?.name || user?.full_name || 'Agente Desconocido',
          date: new Date().toISOString()
        })
        .select()
        .single();

      if (callError) {
        throw new Error(`Error creando registro: ${callError.message}`);
      }

      updateFileProgress(60, undefined, "processing");

      // Process call with custom prompts and behavior selection
      const { error: processError } = await supabase.functions.invoke('process-call', {
        body: {
          callId: callData.id,
          audioUrl: urlData.publicUrl,
          summaryPrompt: prompts?.summaryPrompt,
          feedbackPrompt: prompts?.feedbackPrompt,
          selectedBehaviors: prompts?.selectedBehaviors
        }
      });

      if (processError) {
        console.error('Process call error:', processError);
        throw new Error(`Error processing call: ${processError.message}`);
      }

      updateFileProgress(100, undefined, "success");
      console.log(`Archivo ${callFile.file.name} procesado exitosamente`);

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      updateFileProgress(0, errorMessage, "error");
      throw error;
    }
  };

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles
  };
}
