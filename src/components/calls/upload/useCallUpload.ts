
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
    
    if (!selectedAccountId || selectedAccountId === 'all') {
      toast.error("Por favor selecciona una cuenta específica antes de subir archivos");
      return;
    }

    if (!user) {
      toast.error("Usuario no autenticado");
      return;
    }

    console.log("Uploading files with account:", selectedAccountId);
    console.log("Selected prompts:", selectedPrompts);

    setIsUploading(true);
    
    for (const fileItem of files) {
      if (fileItem.status !== "pending") continue;

      try {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: "uploading" as const, progress: 10 }
            : f
        ));

        // Upload file using account-specific sub-folder path
        const fileExt = fileItem.file.name.split('.').pop();
        const fileName = `${Date.now()}-${fileItem.file.name}`;
        const filePath = `${selectedAccountId}/${fileName}`;

        console.log("Uploading to path:", filePath, "in bucket: call-recordings");

        const { error: uploadError } = await supabase.storage
          .from('call-recordings')
          .upload(filePath, fileItem.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(`Error uploading file: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('call-recordings')
          .getPublicUrl(filePath);

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, progress: 50 }
            : f
        ));

        const agentName = fileItem.file.name.split('.')[0].replace(/^\d+[-_]/, '').replace(/[-_]/g, ' ') || 'Sin asignar';

        const callData = {
          title: fileItem.file.name.replace(/\.[^/.]+$/, ""),
          agent_name: agentName,
          filename: fileItem.file.name,
          audio_url: publicUrl,
          duration: 0,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          progress: 0,
          account_id: selectedAccountId
        };

        console.log("Creating call with data:", callData);

        const { data: call, error: callError } = await supabase
          .from('calls')
          .insert(callData)
          .select()
          .single();

        if (callError) {
          console.error("Call creation error:", callError);
          throw new Error(`Error creating call record: ${callError.message}`);
        }

        console.log("Call created successfully:", call.id, "for account:", call.account_id);

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, callId: call.id, status: "processing" as const, progress: 70 }
            : f
        ));

        const { error: processError } = await supabase.functions.invoke("process-call", {
          body: {
            callId: call.id,
            audioUrl: publicUrl,
            summaryPrompt: selectedPrompts?.summaryPrompt || null,
            feedbackPrompt: selectedPrompts?.feedbackPrompt || null
          }
        });

        if (processError) {
          console.error("Process call error:", processError);
          throw new Error(`Error processing call: ${processError.message}`);
        }

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: "complete" as const, progress: 100 }
            : f
        ));

        toast.success(`Archivo ${fileItem.file.name} procesado exitosamente en cuenta ${selectedAccountId}`);

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
