
import { Loader2 } from "lucide-react";
import FileDropzone from "./upload/FileDropzone";
import FileList from "./upload/FileList";
import useCallUpload from "./upload/useCallUpload";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PromptSelectionModal } from "./PromptSelectionModal";
import { useState } from "react";

export default function CallUpload() {
  const [showPromptModal, setShowPromptModal] = useState(false);
  
  const {
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
  } = useCallUpload();

  // Si no hemos terminado de verificar la sesión, mostrar un indicador de carga
  if (!sessionChecked) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  const handleUploadClick = () => {
    if (files.length === 0) return;
    setShowPromptModal(true);
  };

  const handlePromptConfirm = (prompts: { summary?: string; feedback?: string }) => {
    setShowPromptModal(false);
    uploadFiles(prompts);
  };

  return (
    <div className="space-y-6 animate-fade-in transition-all duration-300">
      {/* Información sobre formato de archivos */}
      <Alert variant="default" className="bg-muted/50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Información importante</AlertTitle>
        <AlertDescription className="text-sm">
          Se aceptan archivos de audio en formato MP3, WAV o M4A. Tamaño máximo: 100MB por archivo.
          Cada archivo subido será procesado automáticamente para su transcripción y análisis. Se pueden procesar hasta 100 archivos a la vez.
        </AlertDescription>
      </Alert>
      
      <FileDropzone onDrop={onDrop} />
      
      {isProcessing && totalCount > 0 && (
        <div className="p-4 border rounded-lg bg-secondary/10 mb-4 transition-all duration-300">
          <div className="flex justify-between mb-2">
            <p className="text-sm font-medium">Procesando archivos</p>
            <p className="text-sm text-muted-foreground">{processedCount} de {totalCount}</p>
          </div>
          <Progress value={(processedCount / totalCount) * 100} className="h-2" />
        </div>
      )}
      
      <FileList
        files={files}
        onRemoveFile={removeFile}
        isUploading={isUploading}
        onUploadFiles={handleUploadClick}
      />

      <PromptSelectionModal
        open={showPromptModal}
        onOpenChange={setShowPromptModal}
        onConfirm={handlePromptConfirm}
      />
    </div>
  );
}
