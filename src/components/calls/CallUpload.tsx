
import { Loader2 } from "lucide-react";
import FileDropzone from "./upload/FileDropzone";
import FileList from "./upload/FileList";
import useCallUpload from "./upload/useCallUpload";
import { Progress } from "@/components/ui/progress";

export default function CallUpload() {
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

  return (
    <div className="space-y-6 animate-fade-in">
      <FileDropzone onDrop={onDrop} />
      
      {isProcessing && totalCount > 0 && (
        <div className="p-4 border rounded-lg bg-secondary/10 mb-4">
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
        onUploadFiles={uploadFiles}
      />
    </div>
  );
}
