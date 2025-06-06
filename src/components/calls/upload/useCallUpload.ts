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
  const [processedFiles, setProcessedFiles] = useState<Set<string>>(new Set());
  const [selectedPrompts, setSelectedPrompts] = useState<{ summary?: string; feedback?: string }>({});
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
      file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a')
    );
    
    if (validFiles.length !== uniqueFiles.length) {
      toast.warning(`Se han omitido ${uniqueFiles.length - validFiles.length} archivos no válidos`, {
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
  }, [files]);

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

  // Verificar si una llamada ya existe para evitar duplicados
  const checkCallExists = async (callTitle: string) => {
    try {
      const { data: existingCalls, error: checkError } = await supabase
        .from('calls')
        .select('id')
        .eq('title', callTitle);
        
      if (checkError) throw checkError;
      
      return existingCalls && existingCalls.length > 0;
    } catch (error) {
      console.error("Error al verificar llamadas existentes:", error);
      return false;
    }
  };

  // Procesar llamada individual - ACTUALIZADO para usar prompts seleccionados
  const processCall = async (fileData: FileWithProgress) => {
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
      
      // Obtener la cuenta seleccionada del contexto
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");
      
      // Obtener información del usuario y sus cuentas
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      const { data: userAccounts } = await supabase
        .from('user_accounts')
        .select(`
          accounts!inner (
            id,
            name
          )
        `)
        .eq('user_id', user.id);
      
      // Determinar la carpeta de destino basada en la cuenta seleccionada
      let folderPath = 'Audio'; // Default para SuperAdmin o compatibilidad
      let selectedAccountId = null;
      
      // Si es SuperAdmin, usar carpeta Audio por defecto
      if (profile?.role !== 'superAdmin' && userAccounts && userAccounts.length > 0) {
        // Para usuarios normales, usar la primera cuenta disponible o la seleccionada
        const firstAccount = userAccounts[0].accounts;
        folderPath = firstAccount.name;
        selectedAccountId = firstAccount.id;
        
        // Intentar obtener la cuenta seleccionada del AccountContext si está disponible
        const selectedAccountFromContext = localStorage.getItem('selectedAccountId');
        if (selectedAccountFromContext) {
          const selectedAccount = userAccounts.find(ua => ua.accounts.id === selectedAccountFromContext);
          if (selectedAccount) {
            folderPath = selectedAccount.accounts.name;
            selectedAccountId = selectedAccount.accounts.id;
          }
        }
      }
      
      // Create a unique filename with timestamp to avoid collisions
      const originalFileName = fileData.file.name;
      const safeFileName = originalFileName
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_');
      
      const fileName = `${Date.now()}-${safeFileName}`;
      const filePath = `${folderPath}/${fileName}`;
      
      // Extract call title from original filename
      const callTitle = originalFileName.replace(/\.[^/.]+$/, "");
      
      // Check if a call with this title already exists
      const callExists = await checkCallExists(callTitle);
        
      if (callExists) {
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
      
      setProcessedFiles(prev => new Set(prev).add(fileData.file.name));
      
      const arrayBuffer = await fileData.file.arrayBuffer();
      const fileData8 = new Uint8Array(arrayBuffer);
      
      // Upload to Supabase Storage
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
      
      // Create a record in the calls table with account_id
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
            progress: 20,
            account_id: selectedAccountId  // Asignar la cuenta correspondiente
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
          
          // Procesar llamada con prompts seleccionados
          const processPayload: any = { 
            callId, 
            audioUrl: publicUrlData.publicUrl 
          };
          
          // Agregar prompts seleccionados al payload
          if (selectedPrompts.summary) {
            processPayload.summaryPrompt = selectedPrompts.summary;
          }
          if (selectedPrompts.feedback) {
            processPayload.feedbackPrompt = selectedPrompts.feedback;
          }
          
          console.log("Procesando llamada con prompts:", processPayload);
          
          supabase.functions.invoke('process-call', {
            body: processPayload
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

  // Procesar archivos en lotes para mejor rendimiento
  const processFileBatch = async (filesToProcess: FileWithProgress[]) => {
    setIsProcessing(true);
    setTotalCount(filesToProcess.length);
    const results = [];
    const total = filesToProcess.length;
    const batchSize = 10; // Tamaño de lote para procesamiento interno
    
    // Reiniciar contador de procesados
    setProcessedCount(0);
    
    // Procesar en lotes más pequeños internamente para mejor estabilidad
    for (let i = 0; i < total; i += batchSize) {
      const batch = filesToProcess.slice(i, i + batchSize);
      console.log(`Procesando lote ${Math.floor(i/batchSize) + 1}, con ${batch.length} archivos`);
      
      try {
        // Procesar archivos en paralelo pero con límite de concurrencia
        const promises = batch.map(fileData => {
          return new Promise<any>(async (resolve) => {
            try {
              const callId = await processCall(fileData);
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
              // Actualizar contador después de cada archivo
              setProcessedCount(prev => prev + 1);
            }
          });
        });
        
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      } catch (batchError) {
        console.error("Error en el procesamiento del lote:", batchError);
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

  const uploadFiles = async (prompts?: { summary?: string; feedback?: string }) => {
    if (!currentUser) {
      console.error("No hay usuario autenticado");
      toast.error("No hay usuario autenticado", {
        description: "Por favor inicie sesión para subir archivos"
      });
      navigate("/login");
      return;
    }

    // Guardar los prompts seleccionados
    if (prompts) {
      setSelectedPrompts(prompts);
      console.log("Prompts seleccionados para procesamiento:", prompts);
    }
    
    console.log("Iniciando proceso de carga con usuario:", currentUser.id);
    
    if (files.length === 0) {
      toast.error("No hay archivos seleccionados", {
        description: "Por favor seleccione archivos para subir"
      });
      return;
    }

    // Evitar iniciar una nueva carga si ya hay una en progreso
    if (isUploading) {
      toast.warning("Hay una carga en progreso", {
        description: "Por favor espere a que finalice la carga actual"
      });
      return;
    }

    setIsUploading(true);

    try {
      setProcessedCount(0);
      
      // Mostrar mensaje informativo según la cantidad de archivos
      const filesMessage = files.length > 1 ? `${files.length} archivos` : "1 archivo";
      toast.info(`Procesando ${filesMessage}`, {
        description: files.length > 50 
          ? "Se procesarán en lotes para mejorar la estabilidad" 
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
          // Procesar archivos en lotes
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
      
      // Dividir archivos en lotes de máximo 100 para procesar
      const MAX_BATCH_SIZE = 100;
      let processedTotal = 0;
      let totalSuccess = 0;
      let totalErrors = 0;
      let totalDupes = 0;
      
      // Procesar en lotes de hasta 100 archivos
      for (let i = 0; i < files.length; i += MAX_BATCH_SIZE) {
        const currentBatch = files.slice(i, i + MAX_BATCH_SIZE);
        console.log(`Procesando lote principal ${Math.floor(i/MAX_BATCH_SIZE) + 1} de ${Math.ceil(files.length/MAX_BATCH_SIZE)})`);
        
        // Mostrar progreso de lote actual
        if (files.length > MAX_BATCH_SIZE) {
          toast.info(`Procesando lote ${Math.floor(i/MAX_BATCH_SIZE) + 1} de ${Math.ceil(files.length/MAX_BATCH_SIZE)}`, {
            description: `${processedTotal} de ${files.length} archivos procesados`
          });
        }
        
        // Procesar lote actual
        const batchResults = await processFileBatch(currentBatch);
        
        // Actualizar contadores
        processedTotal += currentBatch.length;
        totalSuccess += batchResults.filter(r => r.success).length;
        totalErrors += batchResults.filter(r => !r.success && !r.dupeTitleError).length;
        totalDupes += batchResults.filter(r => r.dupeTitleError).length;
        
        // Pequeña pausa entre lotes para dar tiempo al servidor
        if (i + MAX_BATCH_SIZE < files.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Mostrar resumen final
      if (totalSuccess > 0) {
        toast.success(`Carga completa`, {
          description: `Se ${totalSuccess === 1 ? 'subió 1 archivo' : `subieron ${totalSuccess} archivos`}${totalErrors > 0 ? `, ${totalErrors} con ${totalErrors === 1 ? 'error' : 'errores'}` : ''}${totalDupes > 0 ? `, ${totalDupes} ya ${totalDupes === 1 ? 'existente' : 'existentes'}` : ''}`
        });
      } else if (totalDupes === files.length) {
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
