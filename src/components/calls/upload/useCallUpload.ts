
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

// Function to sanitize file names for storage - more aggressive sanitization
const sanitizeFileName = (fileName: string): string => {
  // Remove file extension temporarily
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
  
  // Sanitize the name part only - removing all problematic characters
  const sanitizedName = name
    .replace(/[{}[\]()]/g, '_') // Remove braces, brackets, parentheses
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace other special chars with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single one
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  return sanitizedName + extension;
};

// Batch processing utility
const processBatch = async <T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>
): Promise<void> => {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processor(batch);
  }
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

  const uploadFiles = useCallback(async (config?: { 
    summaryPrompt?: string; 
    feedbackPrompt?: string;
    selectedBehaviorIds?: string[];
  }) => {
    if (!user) {
      toast.error("Debes estar autenticado para subir archivos");
      return;
    }

    console.log("Current selectedAccountId:", selectedAccountId);
    console.log("User context:", user);

    if (!selectedAccountId || selectedAccountId === 'all') {
      toast.error("Debes seleccionar una cuenta específica antes de subir archivos");
      return;
    }

    setIsUploading(true);
    
    try {
      const filesToProcess = files.filter(f => f.status !== "success");
      const totalFiles = filesToProcess.length;
      
      if (totalFiles === 0) {
        toast.info("No hay archivos para procesar");
        return;
      }

      console.log(`Starting batch processing of ${totalFiles} files`);
      
      // Process files in batches for better performance
      const BATCH_SIZE = 5; // Process 5 files at a time to avoid overwhelming the system
      let processedCount = 0;

      await processBatch(filesToProcess, BATCH_SIZE, async (batch) => {
        // Process each file in the batch concurrently
        const uploadPromises = batch.map(async (fileItem) => {
          try {
            setFiles(prev => prev.map(f => 
              f.id === fileItem.id 
                ? { ...f, status: "uploading", progress: 10, info: "Subiendo archivo..." }
                : f
            ));

            // Sanitize the file name and create a unique name
            const sanitizedName = sanitizeFileName(fileItem.file.name);
            const fileName = `${Date.now()}-${sanitizedName}`;
            
            console.log('Processing file:', sanitizedName);
            console.log('Uploading to account folder:', selectedAccountId);
            
            // Upload to account-specific folder with retry logic
            let uploadAttempts = 0;
            let uploadData, uploadError;
            
            while (uploadAttempts < 3) {
              const result = await supabase.storage
                .from('call-recordings')
                .upload(`${selectedAccountId}/${fileName}`, fileItem.file);
              
              uploadData = result.data;
              uploadError = result.error;
              
              if (!uploadError) break;
              
              uploadAttempts++;
              if (uploadAttempts < 3) {
                console.log(`Upload attempt ${uploadAttempts} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempts));
              }
            }

            if (uploadError) {
              console.error('Storage upload error after retries:', uploadError);
              throw new Error(`Error uploading file: ${uploadError.message}`);
            }

            setFiles(prev => prev.map(f => 
              f.id === fileItem.id 
                ? { ...f, progress: 30, info: "Archivo subido, creando registro..." }
                : f
            ));

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('call-recordings')
              .getPublicUrl(`${selectedAccountId}/${fileName}`);

            console.log('File uploaded successfully, creating call record...');

            // Create call record with optimized data
            const { data: callData, error: callError } = await supabase
              .from('calls')
              .insert({
                title: sanitizedName.replace(/\.[^/.]+$/, ""), // Remove extension for title
                filename: sanitizedName,
                agent_name: user.full_name || user.name || user.email || 'Usuario',
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

            setFiles(prev => prev.map(f => 
              f.id === fileItem.id 
                ? { ...f, status: "processing", progress: 50, info: "Iniciando análisis..." }
                : f
            ));

            // Process the call using Supabase function
            const processPayload = {
              callId: callData.id,
              audioUrl: publicUrl,
              summaryPrompt: config?.summaryPrompt,
              feedbackPrompt: config?.feedbackPrompt,
              selectedBehaviorIds: config?.selectedBehaviorIds || []
            };

            console.log('Processing call with enhanced analysis...');

            const { data: processResult, error: processError } = await supabase.functions.invoke('process-call', {
              body: processPayload
            });

            if (processError) {
              console.error('Process call error:', processError);
              throw new Error(`Error processing call: ${processError.message}`);
            }

            setFiles(prev => prev.map(f => 
              f.id === fileItem.id 
                ? { ...f, status: "success", progress: 100, info: "Análisis completado" }
                : f
            ));

            processedCount++;
            console.log(`File ${processedCount}/${totalFiles} processed successfully`);

          } catch (error) {
            console.error(`Error processing file ${fileItem.file.name}:`, error);
            setFiles(prev => prev.map(f => 
              f.id === fileItem.id 
                ? { 
                    ...f, 
                    status: "error", 
                    error: error instanceof Error ? error.message : 'Error desconocido',
                    info: "Error en el procesamiento"
                  }
                : f
            ));
          }
        });

        // Wait for all files in the batch to complete
        await Promise.allSettled(uploadPromises);
        
        // Small delay between batches to prevent overwhelming the system
        if (batch.length === BATCH_SIZE) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      });

      const successCount = files.filter(f => f.status === "success").length;
      const errorCount = files.filter(f => f.status === "error").length;
      
      if (errorCount === 0) {
        toast.success(`${successCount} archivos procesados exitosamente`);
      } else {
        toast.warning(`${successCount} archivos procesados, ${errorCount} con errores`);
      }

    } catch (error) {
      console.error("Batch upload error:", error);
      toast.error(`Error en el procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
