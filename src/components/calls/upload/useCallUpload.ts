
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";

export interface FileItem {
  id: string;
  file: File;
  status: "idle" | "uploading" | "processing" | "success" | "error";
  progress: number;
  error?: string;
  info?: string;
}

// Function to sanitize file names for storage
const sanitizeFileName = (fileName: string): string => {
  // Remove invalid characters and replace with underscores
  return fileName
    .replace(/[{}[\]()]/g, '_') // Remove braces, brackets, parentheses
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace other special chars with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single one
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
};

export function useCallUpload() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const { selectedAccountId } = useAccount();

  const addFiles = useCallback((newFiles: File[]) => {
    const fileItems: FileItem[] = newFiles.map((file) => ({
      id: uuidv4(),
      file,
      status: "idle",
      progress: 0,
    }));
    
    setFiles((prev) => [...prev, ...fileItems]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const uploadFiles = useCallback(async (prompts?: { summaryPrompt?: string; feedbackPrompt?: string }) => {
    if (!user) {
      toast.error("Debes estar autenticado para subir archivos");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Debes seleccionar una cuenta antes de subir archivos");
      return;
    }

    setIsUploading(true);
    
    try {
      for (const fileItem of files) {
        if (fileItem.status === "success") continue;
        
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: "uploading", progress: 10 }
            : f
        ));

        // Sanitize the file name and create a unique name
        const sanitizedName = sanitizeFileName(fileItem.file.name);
        const fileName = `${Date.now()}-${sanitizedName}`;
        
        console.log('Uploading file to storage:', fileName);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('call-recordings')
          .upload(fileName, fileItem.file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Error uploading file: ${uploadError.message}`);
        }

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, progress: 30 }
            : f
        ));

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('call-recordings')
          .getPublicUrl(fileName);

        console.log('File uploaded successfully, public URL:', publicUrl);

        // Create call record with correct schema including account_id
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .insert({
            title: fileItem.file.name.replace(/\.[^/.]+$/, ""),
            filename: fileItem.file.name,
            agent_name: user.name || user.email || 'Usuario',
            agent_id: user.id,
            account_id: selectedAccountId,
            audio_url: publicUrl,
            status: 'pending',
            progress: 0
          })
          .select()
          .single();

        if (callError) {
          console.error('Call record creation error:', callError);
          throw new Error(`Error creating call record: ${callError.message}`);
        }

        console.log('Call record created:', callData.id);

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: "processing", progress: 60 }
            : f
        ));

        // Process the call using Supabase function
        console.log('Calling process-call function with:', {
          callId: callData.id,
          audioUrl: publicUrl,
          summaryPrompt: prompts?.summaryPrompt ? 'provided' : 'not provided',
          feedbackPrompt: prompts?.feedbackPrompt ? 'provided' : 'not provided'
        });

        const { data: processResult, error: processError } = await supabase.functions.invoke('process-call', {
          body: {
            callId: callData.id,
            audioUrl: publicUrl,
            summaryPrompt: prompts?.summaryPrompt,
            feedbackPrompt: prompts?.feedbackPrompt
          }
        });

        if (processError) {
          console.error('Process call error:', processError);
          throw new Error(`Error processing call: ${processError.message}`);
        }

        console.log('Call processed successfully:', processResult);

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: "success", progress: 100 }
            : f
        ));
      }

      toast.success("Archivos procesados exitosamente");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      setFiles(prev => prev.map(f => ({
        ...f,
        status: "error",
        error: error instanceof Error ? error.message : 'Error desconocido'
      })));
    } finally {
      setIsUploading(false);
    }
  }, [files, user, selectedAccountId]);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles
  };
}
