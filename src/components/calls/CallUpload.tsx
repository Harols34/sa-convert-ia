
import { Loader2 } from "lucide-react";
import FileDropzone from "./upload/FileDropzone";
import FileList from "./upload/FileList";
import { useCallUpload } from "./upload/useCallUpload";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import PromptSelectionModal from "./PromptSelectionModal";
import { useState } from "react";

export default function CallUpload() {
  const [showPromptModal, setShowPromptModal] = useState(false);
  
  const {
    files,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles
  } = useCallUpload();

  const handleUploadClick = () => {
    if (files.length === 0) return;
    setShowPromptModal(true);
  };

  const handlePromptConfirm = (config: { 
    summaryPrompt?: string; 
    feedbackPrompt?: string;
    selectedBehaviorIds?: string[];
  }) => {
    setShowPromptModal(false);
    uploadFiles(config);
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
          
          <br /><br />
          
          <strong>Proceso de análisis:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Transcripción automática con separación de hablantes (Agente/Cliente)</li>
            <li>Generación de resumen personalizable</li>
            <li>Análisis de feedback basado en prompts configurables</li>
            <li>Evaluación de comportamientos seleccionados</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      <FileDropzone onDrop={addFiles} />
      
      {isUploading && (
        <div className="p-4 border rounded-lg bg-secondary/10 mb-4 transition-all duration-300">
          <div className="flex justify-between mb-2">
            <p className="text-sm font-medium">Procesando archivos</p>
            <p className="text-sm text-muted-foreground">En progreso...</p>
          </div>
          <Progress value={50} className="h-2" />
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
