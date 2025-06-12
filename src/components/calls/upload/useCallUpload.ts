import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";

export interface FileItem {
  id: string;
  file: File;
  progress: number;
  status: "idle" | "uploading" | "processing" | "success" | "error";
  callId?: string;
  error?: string;
  info?: string;
}

export function useCallUpload() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [processedFiles, setProcessedFiles] = useState<Set<string>>(new Set());
  const { selectedAccountId } = useAccount();
  const { user, session } = useAuth();
  const navigate = useNavigate();

  // Verificar sesión al cargar el componente
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Verificando sesión en CallUpload...");
        
        // Check if we have a valid session and user from AuthContext
        if (session && user) {
          console.log("Usuario autenticado desde contexto:", user.id);
          setCurrentUser(user);
          setSessionChecked(true);
          return;
        }
        
        // Fallback: check session directly
        const { data } = await supabase.auth.getSession();
        console.log("Estado de sesión en CallUpload:", data.session ? "Activa" : "No hay sesión");
        
        if (data.session && data.session.user) {
          console.log("Usuario en sesión:", data.session.user.id);
          setCurrentUser(data.session.user);
        } else {
          toast.error("No hay sesión activa", {
            description: "Por favor inicie sesión para subir archivos"
          });
          navigate("/login");
          return;
        }
        
        setSessionChecked(true);
      } catch (error) {
        console.error("Error al verificar sesión:", error);
        toast.error("Error al verificar sesión");
        navigate("/login");
      }
    };

    checkSession();
  }, [navigate, session, user]);

  // Función para asegurar que existe la carpeta de la cuenta
  const ensureAccountFolder = async (accountId: string) => {
    try {
      console.log("Asegurando carpeta de cuenta para:", accountId);
      
      // Test if bucket exists by trying to upload a small test file
      const testPath = `${accountId}/.keep`;
      const testBlob = new Blob([''], { type: 'text/plain' });
      
      const { error: testError } = await supabase.storage
        .from('call-recordings')
        .upload(testPath, testBlob, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (testError) {
        console.warn("Error al crear carpeta de cuenta:", testError);
        
        // Try using the database function as fallback
        try {
          const { data, error: rpcError } = await supabase.rpc('ensure_account_folder', {
            account_uuid: accountId
          });
          
          if (rpcError) {
            console.warn("No se pudo asegurar la carpeta usando función RPC:", rpcError);
          } else {
            console.log("Carpeta de cuenta asegurada usando función RPC");
          }
        } catch (rpcError) {
          console.warn("Error usando función RPC:", rpcError);
        }
      } else {
        console.log("Carpeta de cuenta asegurada exitosamente para:", accountId);
      }
    } catch (error) {
      console.warn("Error asegurando carpeta de cuenta:", error);
    }
  };

  const addFiles = useCallback((acceptedFiles: File[]) => {
    // Verificar si hay archivos duplicados por nombre
    const existingFileNames = files.map(f => f.file.name);
    const uniqueFiles = acceptedFiles.filter(file => !existingFileNames.includes(file.name));
    
    if (uniqueFiles.length !== acceptedFiles.length) {
      toast.warning(`Se omitieron ${acceptedFiles.length - uniqueFiles.length} archivos duplicados`, {
        description: "Ya has agregado estos archivos a la cola"
      });
    }
    
    // Validar tipos de archivos
    const validFiles = uniqueFiles.filter(file => 
      file.type.startsWith('audio/') || 
      file.name.endsWith('.mp3') || 
      file.name.endsWith('.wav') || 
      file.name.endsWith('.m4a') ||
      file.name.endsWith('.ogg')
    );
    
    if (validFiles.length !== uniqueFiles.length) {
      toast.warning(`Se han omitido ${uniqueFiles.length - validFiles.length} archivos no válidos`, {
        description: "Solo se permiten archivos de audio (.mp3, .wav, .m4a, .ogg)"
      });
    }
    
    // Verificar tamaño máximo (100MB)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const validSizeFiles = validFiles.filter(file => file.size <= MAX_SIZE);
    
    if (validSizeFiles.length !== validFiles.length) {
      toast.warning(`Se han omitido ${validFiles.length - validSizeFiles.length} archivos demasiado grandes`, {
        description: "El tamaño máximo permitido es de 100MB por archivo"
      });
    }
    
    // Create file objects with progress
    const newFiles = validSizeFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: "idle" as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, [files]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const simulateProgress = (fileId: string, startProgress: number, endProgress: number, duration: number = 10000) => {
    const intervalTime = 500;
    const steps = duration / intervalTime;
    const increment = (endProgress - startProgress) / steps;
    let currentProgress = startProgress;
    
    const interval = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= endProgress) {
        currentProgress = endProgress;
        clearInterval(interval);
      }
      
      setFiles((prev) => 
        prev.map((f) => 
          f.id === fileId ? { ...f, progress: Math.round(currentProgress) } : f
        )
      );
    }, intervalTime);
    
    return interval;
  };

  // Verificar si una llamada ya existe para evitar duplicados
  const checkCallExists = async (callTitle: string, accountId: string) => {
    try {
      const { data: existingCalls, error: checkError } = await supabase
        .from('calls')
        .select('id')
        .eq('title', callTitle)
        .eq('account_id', accountId);
        
      if (checkError) throw checkError;
      
      return existingCalls && existingCalls.length > 0;
    } catch (error) {
      console.error("Error al verificar llamadas existentes:", error);
      return false;
    }
  };

  // Procesar llamada individual con mejor manejo de errores
  const processCall = async (fileData: FileItem, accountId: string) => {
    let callId = null;
    let progressInterval: any = null;
    
    // Si el archivo ya fue procesado, evitar procesarlo nuevamente
    if (processedFiles.has(fileData.file.name)) {
      console.log(`Archivo ${fileData.file.name} ya procesado, omitiendo`);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id ? { 
            ...f, 
            progress: 100, 
            status: "success",
            info: "Archivo ya procesado anteriormente" 
          } : f
        )
      );
      return null;
    }
    
    try {
      // Update progress to show we're starting
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id ? { ...f, progress: 10, status: "uploading" } : f
        )
      );
      
      // Create a unique filename with timestamp to avoid collisions
      const originalFileName = fileData.file.name;
      const safeFileName = originalFileName
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_');
      
      const fileName = `${Date.now()}-${safeFileName}`;
      const filePath = `${accountId}/${fileName}`;
      
      // Extract call title from original filename
      const callTitle = originalFileName.replace(/\.[^/.]+$/, "");
      
      // Check if a call with this title already exists for this account
      const callExists = await checkCallExists(callTitle, accountId);
        
      if (callExists) {
        console.log(`Llamada con título "${callTitle}" ya existe en cuenta ${accountId}`);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { 
              ...f, 
              progress: 100, 
              status: "error",
              error: "Grabación ya cargada en esta cuenta" 
            } : f
          )
        );
        const error: any = new Error("Título de llamada duplicado");
        error.dupeTitleError = true;
        throw error;
      }
      
      console.log("Subiendo archivo a bucket 'call-recordings':", filePath);
      
      // Marcar el archivo como en procesamiento
      setProcessedFiles(prev => new Set(prev).add(fileData.file.name));
      
      // Upload to Supabase Storage usando account-specific sub-folder path
      const { data: storageData, error: storageError } = await supabase.storage
        .from('call-recordings')
        .upload(filePath, fileData.file, {
          contentType: fileData.file.type || 'audio/mpeg',
          cacheControl: '3600',
          upsert: false
        });
        
      if (storageError) {
        console.error("Error en la carga del storage:", storageError);
        
        // Provide more specific error messages
        let errorMessage = "Error al subir archivo";
        if (storageError.message?.includes("Duplicate")) {
          errorMessage = "El archivo ya existe";
        } else if (storageError.message?.includes("too large")) {
          errorMessage = "Archivo demasiado grande";
        } else if (storageError.message?.includes("not allowed")) {
          errorMessage = "Tipo de archivo no permitido";
        }
        
        throw new Error(errorMessage);
      }
      
      console.log("Carga exitosa:", storageData);
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('call-recordings')
        .getPublicUrl(filePath);
        
      console.log("URL pública:", publicUrlData);
      
      // Update progress to 50%
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id ? { ...f, progress: 50 } : f
        )
      );
      
      // Extract agent name from filename
      const agentName = originalFileName.split('.')[0].replace(/^\d+[-_]/, '').replace(/[-_]/g, ' ') || 'Sin asignar';
      
      // Create a record in the calls table with account_id
      const currentDate = new Date().toISOString();
      
      console.log("Insertando registro en la tabla calls para cuenta:", accountId);
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert([
          {
            title: callTitle,
            filename: fileName,
            agent_name: agentName,
            duration: 0,
            date: currentDate,
            audio_url: publicUrlData.publicUrl,
            status: 'pending',
            progress: 0,
            account_id: accountId
          }
        ])
        .select();
        
      if (callError) {
        console.error("Error al crear registro de llamada:", callError);
        throw callError;
      }
      
      console.log("Registro de llamada creado exitosamente:", callData);
      callId = callData[0].id;
      
      // Iniciar el procesamiento de la llamada
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id ? { ...f, progress: 60, status: "processing", callId } : f
        )
      );
      
      // Simular progreso mientras se procesa la llamada
      progressInterval = simulateProgress(fileData.id, 60, 95);
      
      // Procesar llamada en background
      try {
        const { error: processError } = await supabase.functions.invoke('process-call', {
          body: { 
            callId, 
            audioUrl: publicUrlData.publicUrl
          }
        });
        
        if (processError) {
          console.error("Error al procesar la llamada:", processError);
          throw processError;
        }
        
        // Limpiar intervalo de simulación
        if (progressInterval) clearInterval(progressInterval);
        
        // Mark as completed
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, progress: 100, status: "success" } : f
          )
        );
        
        toast.success(`Archivo ${originalFileName} procesado exitosamente`);
        
      } catch (processError) {
        console.error("Error al procesar la llamada:", processError);
        
        // Limpiar intervalo de simulación
        if (progressInterval) clearInterval(progressInterval);
        
        // La carga se realizó correctamente, pero el procesamiento falló
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { 
              ...f, 
              progress: 100, 
              status: "success",
              info: "Carga completa, procesamiento en segundo plano" 
            } : f
          )
        );
        
        toast.warning(`${originalFileName}: Carga completa, procesamiento continuará en segundo plano`);
      }
      
      return callId;
    } catch (error: any) {
      console.error("Error en la carga:", error);
      
      // Limpiar intervalo de simulación
      if (progressInterval) clearInterval(progressInterval);
      
      // Mark as failed unless it's a duplicate title error
      if (!error.dupeTitleError) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, status: "error", error: error.message } : f
          )
        );
      }
      
      // Remover el archivo de los procesados si hubo error para permitir reintentar
      if (!error.dupeTitleError) {
        setProcessedFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileData.file.name);
          return newSet;
        });
      }
      
      throw error;
    }
  };

  // Procesar archivos en lotes
  const processFileBatch = async (filesToProcess: FileItem[], accountId: string) => {
    setIsProcessing(true);
    setTotalCount(filesToProcess.length);
    const results = [];
    const total = filesToProcess.length;
    const batchSize = 3; // Reducir para mejorar estabilidad
    
    setProcessedCount(0);
    
    for (let i = 0; i < total; i += batchSize) {
      const batch = filesToProcess.slice(i, i + batchSize);
      console.log(`Procesando lote ${Math.floor(i/batchSize) + 1}, con ${batch.length} archivos`);
      
      try {
        const promises = batch.map(fileData => {
          return new Promise<any>(async (resolve) => {
            try {
              const callId = await processCall(fileData, accountId);
              resolve({ id: fileData.id, success: true, callId });
            } catch (error: any) {
              console.error(`Error procesando archivo ${fileData.file.name}:`, error);
              resolve({ 
                id: fileData.id, 
                success: false, 
                error,
                dupeTitleError: error?.dupeTitleError || false 
              });
            } finally {
              setProcessedCount(prev => prev + 1);
            }
          });
        });
        
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      } catch (batchError) {
        console.error("Error en el procesamiento del lote:", batchError);
      }
      
      // Pausa entre lotes
      if (i + batchSize < total) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    setIsProcessing(false);
    return results;
  };

  const uploadFiles = async (selectedPrompts?: { summaryPrompt?: string; feedbackPrompt?: string }) => {
    if (!currentUser && !user) {
      console.error("No hay usuario autenticado");
      toast.error("No hay usuario autenticado", {
        description: "Por favor inicie sesión para subir archivos"
      });
      navigate("/login");
      return;
    }
    
    if (!selectedAccountId || selectedAccountId === 'all') {
      toast.error("Por favor selecciona una cuenta específica antes de subir archivos");
      return;
    }
    
    console.log("Iniciando proceso de carga con usuario:", (currentUser || user)?.id, "cuenta:", selectedAccountId);
    
    if (files.length === 0) {
      toast.error("No hay archivos seleccionados", {
        description: "Por favor seleccione archivos para subir"
      });
      return;
    }

    if (isUploading) {
      toast.warning("Hay una carga en progreso", {
        description: "Por favor espere a que finalice la carga actual"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Asegurar que existe la carpeta de la cuenta
      await ensureAccountFolder(selectedAccountId);
      
      setProcessedCount(0);
      
      const filesMessage = files.length > 1 ? `${files.length} archivos` : "1 archivo";
      toast.info(`Procesando ${filesMessage}`, {
        description: "Esto puede tomar algunos minutos"
      });
      
      const results = await processFileBatch(files, selectedAccountId);
      
      // Contar éxitos, errores y duplicados
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success && !r.dupeTitleError).length;
      const dupeCount = results.filter(r => r.dupeTitleError).length;
      
      // Mostrar mensaje según resultados
      if (successCount > 0) {
        toast.success(`Carga completa`, {
          description: `Se ${successCount === 1 ? 'subió 1 archivo' : `subieron ${successCount} archivos`}${errorCount > 0 ? `, ${errorCount} con ${errorCount === 1 ? 'error' : 'errores'}` : ''}${dupeCount > 0 ? `, ${dupeCount} ya ${dupeCount === 1 ? 'existente' : 'existentes'}` : ''}`
        });
      } else if (dupeCount === files.length) {
        toast.warning("Todas las grabaciones ya existen", {
          description: "No se ha cargado ningún archivo nuevo"
        });
      } else {
        toast.error("Error al subir archivos", {
          description: "Ningún archivo fue subido correctamente"
        });
      }
      
    } catch (error: any) {
      console.error("Error en el proceso de carga:", error);
      toast.error("Error en el proceso de carga", {
        description: error.message || "Hubo un problema durante la carga"
      });
    } finally {
      setIsUploading(false);
      
      // Redirigir si hubo archivos cargados con éxito
      if (files.some(f => f.status === "success")) {
        setTimeout(() => {
          navigate("/calls");
        }, 2000);
      }
    }
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(file => file.status !== "success"));
  };

  const clearAll = () => {
    setFiles([]);
  };

  return {
    files,
    isUploading,
    sessionChecked,
    currentUser,
    isProcessing,
    processedCount,
    totalCount,
    addFiles,
    removeFile,
    uploadFiles,
    clearCompleted,
    clearAll
  };
}
