
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { CallFile } from "./useCallUpload";

export default function FileItem({
  file,
  onRemove,
  disabled,
}: {
  file: CallFile;
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  // Formatea el tamaño del archivo para mostrarlo legible
  const formattedSize = formatBytes(file.file.size);

  // Función para renderizar el icono según el estado
  const renderStatusIcon = () => {
    switch (file.status) {
      case "idle":
        return <UploadCloud className="h-5 w-5 text-blue-500" />;
      case "uploading":
        return <UploadCloud className="h-5 w-5 text-blue-500" />;
      case "processing":
        return <UploadCloud className="h-5 w-5 text-amber-500 animate-pulse" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <UploadCloud className="h-5 w-5 text-blue-500" />;
    }
  };

  // Función para renderizar el mensaje de estado
  const renderStatusText = () => {
    switch (file.status) {
      case "idle":
        return "Listo para subir";
      case "uploading":
        return `Subiendo... ${file.progress || 0}%`;
      case "processing":
        return `Procesando... ${file.progress || 0}%`;
      case "success":
        return "Carga completa";
      case "error":
        return file.error || "Error en la carga";
      default:
        return "Esperando...";
    }
  };

  // Determinar el color de la barra de progreso
  const getProgressColor = () => {
    switch (file.status) {
      case "uploading":
      case "processing":
        return "bg-blue-500";
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <div className="flex flex-col p-4 rounded-lg border border-border mb-4 bg-background">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          {renderStatusIcon()}
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{file.file.name}</p>
            <p className="text-xs text-muted-foreground">{formattedSize}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onRemove(file.id)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="w-full mt-2">
        <Progress 
          value={file.progress || 0} 
          className="h-2" 
          // Aplicamos el color condicionalmente usando estilos en línea
          style={{ 
            '--progress-background': getProgressColor() 
          } as React.CSSProperties}
        />
        <p className="text-xs text-muted-foreground mt-1">{renderStatusText()}</p>
      </div>
      
      {file.status === "error" && file.error && (
        <div className="mt-2 p-2 text-xs bg-red-50 text-red-600 rounded">
          {file.error}
        </div>
      )}
      
      {file.info && (
        <div className="mt-2 p-2 text-xs bg-blue-50 text-blue-600 rounded">
          {file.info}
        </div>
      )}
    </div>
  );
}
