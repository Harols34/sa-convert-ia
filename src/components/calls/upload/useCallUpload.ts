
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";

export interface FileItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  callId?: string;
  error?: string;
}

export function useCallUpload() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();

  const addFiles = (newFiles: File[]) => {
    const fileItems: FileItem[] = newFiles.map(file => ({
      id: `${Date.now()}-${file.name}`,
      file,
      progress: 0,
      status: "pending"
    }));
    setFiles(prev => [...prev, ...fileItems]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const uploadFiles = async (selectedPrompts?: { summaryPrompt?: string; feedbackPrompt?: string }) => {
    if (files.length === 0) return;
    
    // Ensure account is selected
    if (!selectedAccountId) {
      toast.error("Por favor selecciona una cuenta antes de subir archivos");
      return;
    }

    if (!user) {
      toast.error("Usuario no autenticado");
      return;
    }

    setIsUploading(true);
    
    for (const fileItem of files) {
      if (fileItem.status !== "pending") continue;

      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: "uploading" as const, progress: 10 }
            : f
        ));

        // Upload file to Supabase Storage
        const fileExt = fileItem.file.name.split('.').pop();
        const fileName = `${Date.now()}-${fileItem.file.name}`;
        const filePath = `calls/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('call-recordings')
          .upload(filePath, fileItem.file);

        if (uploadError) {
          throw new Error(`Error uploading file: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('call-recordings')
          .getPublicUrl(filePath);

        // Update progress
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, progress: 50 }
            : f
        ));

        // Extract agent name from filename (assuming format includes agent name)
        const agentName = fileItem.file.name.split('.')[0].replace(/^\d+[-_]/, '').replace(/[-_]/g, ' ') || 'Sin asignar';

        // Create call record with selected account
        const { data: call, error: callError } = await supabase
          .from('calls')
          .insert({
            title: fileItem.file.name.replace(/\.[^/.]+$/, ""),
            agent_name: agentName,
            filename: fileItem.file.name,
            audio_url: publicUrl,
            duration: 0, // Will be updated after processing
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            progress: 0,
            account_id: selectedAccountId // Ensure account is assigned
          })
          .select()
          .single();

        if (callError) {
          throw new Error(`Error creating call record: ${callError.message}`);
        }

        // Update with call ID and processing status
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, callId: call.id, status: "processing" as const, progress: 70 }
            : f
        ));

        // Process the call
        const { error: processError } = await supabase.functions.invoke("process-call", {
          body: {
            callId: call.id,
            audioUrl: publicUrl,
            summaryPrompt: selectedPrompts?.summaryPrompt,
            feedbackPrompt: selectedPrompts?.feedbackPrompt
          }
        });

        if (processError) {
          throw new Error(`Error processing call: ${processError.message}`);
        }

        // Mark as complete
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: "complete" as const, progress: 100 }
            : f
        ));

        toast.success(`Archivo ${fileItem.file.name} procesado exitosamente`);

      } catch (error) {
        console.error(`Error processing file ${fileItem.file.name}:`, error);
        
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { 
                ...f, 
                status: "error" as const, 
                error: error instanceof Error ? error.message : "Error desconocido",
                progress: 0 
              }
            : f
        ));

        toast.error(`Error procesando ${fileItem.file.name}: ${error instanceof Error ? error.message : "Error desconocido"}`);
      }
    }

    setIsUploading(false);
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(file => file.status !== "complete"));
  };

  const clearAll = () => {
    setFiles([]);
  };

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles,
    clearCompleted,
    clearAll
  };
}
