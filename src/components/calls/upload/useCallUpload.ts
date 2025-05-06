
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileWithProgress } from "./FileItem";

export default function useCallUpload() {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  // Verificar sesión al cargar el componente
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Verificando sesión en CallUpload...");
        const { data } = await supabase.auth.getSession();
        console.log("Estado de sesión en CallUpload:", data.session ? "Activa" : "No hay sesión");
        
        if (data.session && data.session.user) {
          console.log("Usuario en sesión:", data.session.user.id);
          setCurrentUser(data.session.user);
        } else {
          // Si no hay sesión activa, redirigir al login
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
        setSessionChecked(true);
      }
    };

    checkSession();
  }, [navigate]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validar tipos de archivos
    const validFiles = acceptedFiles.filter(file => 
      file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a')
    );
    
    if (validFiles.length !== acceptedFiles.length) {
      toast.warning(`Se han omitido ${acceptedFiles.length - validFiles.length} archivos no válidos`, {
        description: "Solo se permiten archivos de audio (.mp3, .wav, .m4a)"
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
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const simulateProgress = (fileId: string, startProgress: number, endProgress: number, duration: number = 10000) => {
    const intervalTime = 500; // Actualizar cada 500ms
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

  // Procesar llamada individual
  const processCall = async (fileData: FileWithProgress) => {
    let callId = null;
    let progressInterval: any = null;
    
    try {
      // Update progress to show we're starting
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id ? { ...f, progress: 10, status: "uploading" } : f
        )
      );
      
      // Create a unique filename with timestamp to avoid collisions
      // Use a safe filename - replace special characters
      const originalFileName = fileData.file.name;
      const safeFileName = originalFileName
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
        .replace(/_{2,}/g, '_');         // Replace multiple underscores with single
      
      const fileName = `${Date.now()}-${safeFileName}`;
      const filePath = `audio/${fileName}`;
      
      // Extract call title from original filename - remove extension
      const callTitle = originalFileName.replace(/\.[^/.]+$/, "");
      
      // Check if a call with this title already exists
      const { data: existingCalls, error: checkError } = await supabase
        .from('calls')
        .select('id')
        .eq('title', callTitle);
        
      if (checkError) {
        console.error("Error al verificar llamadas existentes:", checkError);
      }
      
      // If call with this title already exists, mark as duplicate and skip
      if (existingCalls && existingCalls.length > 0) {
        console.log(`Llamada con título "${callTitle}" ya existe`);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { 
              ...f, 
              progress: 100, 
              status: "error",
              error: "Grabación ya cargada" 
            } : f
          )
        );
        const error: any = new Error("Título de llamada duplicado");
        error.dupeTitleError = true;
        throw error;
      }
      
      console.log("Subiendo archivo a bucket 'calls':", filePath);
      
      // Convertir file a Uint8Array para mayor compatibilidad con Supabase Storage
      const arrayBuffer = await fileData.file.arrayBuffer();
      const fileData8 = new Uint8Array(arrayBuffer);
      
      // Upload to Supabase Storage con opciones mejoradas
      const { data: storageData, error: storageError } = await supabase.storage
        .from('calls')
        .upload(filePath, fileData8, {
          contentType: fileData.file.type,
          cacheControl: '3600',
          upsert: false
        });
        
      if (storageError) {
        console.error("Error en la carga:", storageError);
        throw storageError;
      }
      
      console.log("Carga exitosa:", storageData);
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('calls')
        .getPublicUrl(filePath);
        
      console.log("URL pública:", publicUrlData);
      
      // Update progress to 50%
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id ? { ...f, progress: 50 } : f
        )
      );
      
      // Create a record in the calls table with current date
      const currentDate = new Date().toISOString();
      
      console.log("Insertando registro en la tabla calls...");
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert([
          {
            title: callTitle,
            filename: fileName,
            agent_name: "Sin asignar",
            duration: 0,
            date: currentDate,
            audio_url: publicUrlData.publicUrl,
            status: 'transcribing',
            progress: 20
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
          f.id === fileData.id ? { ...f, progress: 60, status: "processing" } : f
        )
      );
      
      // Simular progreso mientras se procesa la llamada
      progressInterval = simulateProgress(fileData.id, 60, 95);
      
      // Actualizar progreso en la base de datos
      await updateCallProgress(callId, 50, 'transcribing');
      
      // Enviar a procesar pero no esperar respuesta para permitir procesamiento asíncrono
      if (callData && callData.length > 0) {
        try {
          // Mostrar progreso de transcripción
          await updateCallProgress(callId, 70, 'analyzing');
          
          // Procesar llamada sin esperar el resultado completo
          supabase.functions.invoke('process-call', {
            body: { callId, audioUrl: publicUrlData.publicUrl }
          }).catch(e => console.error("Error en procesamiento background:", e));
          
          // Limpiar intervalo de simulación
          if (progressInterval) clearInterval(progressInterval);
          
          // Mark as completed
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileData.id ? { ...f, progress: 100, status: "success" } : f
            )
          );
          
          // Actualizar estado en la base de datos (asumimos que fue exitoso)
          await updateCallProgress(callId, 90, 'processing');
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
                error: "La carga se completó, pero el procesamiento automático falló. Se procesará manualmente." 
              } : f
            )
          );
          
          // Actualizar estado en la base de datos
          await updateCallProgress(callId, 90, 'error');
        }
      } else {
        // Limpiar intervalo de simulación
        if (progressInterval) clearInterval(progressInterval);
        
        // Mark as completed
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, progress: 100, status: "success" } : f
          )
        );
      }
      
      return callId;
    } catch (error: any) {
      console.error("Error en la carga:", error);
      
      // Limpiar intervalo de simulación
      if (progressInterval) clearInterval(progressInterval);
      
      // Mark as failed unless it's a duplicate title error (which is already handled)
      if (!error.dupeTitleError) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, status: "error", error: error.message } : f
          )
        );
      }
      
      throw error;
    }
  };

  // Procesar archivos en lotes para mejor rendimiento
  const processFileBatch = async (filesToProcess: FileWithProgress[]) => {
    setIsProcessing(true);
    setTotalCount(filesToProcess.length);
    const results = [];
    const total = filesToProcess.length;
    const batchSize = 100; // Aumentado a 100 para procesar más archivos a la vez
    
    // Reiniciar contador de procesados
    setProcessedCount(0);
    
    // Procesar en lotes de 100
    for (let i = 0; i < total; i += batchSize) {
      const batch = filesToProcess.slice(i, i + batchSize);
      console.log(`Procesando lote ${Math.floor(i/batchSize) + 1}, con ${batch.length} archivos`);
      
      // Procesar cada archivo en el lote en paralelo con límite de concurrencia
      const promises = batch.map(fileData => processCall(fileData));
      
      try {
        // Ejecutar procesamiento en paralelo con un límite de 10 operaciones concurrentes
        // para evitar sobrecargar el sistema
        const batchResults = [];
        const concurrencyLimit = 10;
        
        for (let j = 0; j < batch.length; j += concurrencyLimit) {
          const concurrentBatch = batch.slice(j, j + concurrencyLimit);
          const concurrentPromises = concurrentBatch.map(fileData => {
            return processCall(fileData)
              .then(callId => ({ id: fileData.id, success: true, callId }))
              .catch(error => ({ 
                id: fileData.id, 
                success: false, 
                error,
                dupeTitleError: error?.dupeTitleError || false 
              }));
          });
          
          const concurrentResults = await Promise.all(concurrentPromises);
          batchResults.push(...concurrentResults);
          
          // Actualizar contador después de cada lote concurrente
          setProcessedCount(prev => prev + concurrentResults.length);
        }
        
        results.push(...batchResults);
      } catch (error) {
        console.error("Error en el lote:", error);
        // Continuar con el siguiente lote incluso si este falla
      }
      
      // Pequeña pausa entre lotes para evitar sobrecarga
      if (i + batchSize < total) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsProcessing(false);
    return results;
  };

  const updateCallProgress = async (callId: string, progress: number, status: string) => {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ progress, status })
        .eq('id', callId);
        
      if (error) {
        console.error("Error al actualizar progreso:", error);
      }
    } catch (e) {
      console.error("Error al actualizar progreso:", e);
    }
  };

  const uploadFiles = async () => {
    if (!currentUser) {
      console.error("No hay usuario autenticado");
      toast.error("No hay usuario autenticado", {
        description: "Por favor inicie sesión para subir archivos"
      });
      navigate("/login");
      return;
    }
    
    console.log("Iniciando proceso de carga con usuario:", currentUser.id);
    
    if (files.length === 0) {
      toast.error("No hay archivos seleccionados", {
        description: "Por favor seleccione archivos para subir"
      });
      return;
    }

    setIsUploading(true);

    try {
      setProcessedCount(0);
      
      toast.info(`Procesando ${files.length} ${files.length === 1 ? 'archivo' : 'archivos'}`, {
        description: files.length > 3 
          ? "Se procesarán en lotes pequeños para mejorar la estabilidad" 
          : "Esto puede tomar algunos minutos"
      });
      
      // Verificar que el bucket existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error("Error al listar buckets:", bucketsError);
        throw new Error(`Error al listar buckets: ${bucketsError.message}`);
      }
      
      const callsBucketExists = buckets?.some(bucket => bucket.id === 'calls');
      
      if (!callsBucketExists) {
        console.log("El bucket 'calls' no existe, verificando SQL migrations...");
        toast.warning("Verificando configuración de almacenamiento...");
        
        // Intentar de todos modos
        try {
          // Procesar todos los archivos sin límite fijo
          const results = await processFileBatch(files);
          
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
              description: "Ningún archivo fue subido correctamente. Intente nuevamente con archivos más pequeños o menos archivos a la vez."
            });
          }
          
          return;
        } catch (e) {
          console.error("Error durante el reintento de carga:", e);
          throw new Error("El bucket 'calls' no está configurado correctamente en Supabase");
        }
      }
      
      console.log("Bucket 'calls' encontrado, procediendo con la carga...");
      
      // Procesar todos los archivos sin límite fijo
      const results = await processFileBatch(files);
      
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
          description: "Ningún archivo fue subido correctamente. Intente nuevamente con archivos más pequeños o menos archivos a la vez."
        });
      }
    } catch (error: any) {
      console.error("Error en el proceso de carga:", error);
      toast.error("Error en el proceso de carga", {
        description: error.message || "Hubo un problema durante la carga. Intente con menos archivos a la vez."
      });
    } finally {
      setIsUploading(false);
      
      // Solo redirigir si hubo algún archivo cargado con éxito
      if (files.some(f => f.status === "success")) {
        setTimeout(() => {
          navigate("/calls");
        }, 2000);
      }
    }
  };

  return {
    files,
    isUploading,
    sessionChecked,
    currentUser,
    isProcessing,
    processedCount,
    totalCount,
    onDrop,
    removeFile,
    uploadFiles
  };
}
