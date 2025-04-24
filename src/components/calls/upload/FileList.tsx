
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileItem, { FileWithProgress } from "./FileItem";

interface FileListProps {
  files: FileWithProgress[];
  onRemoveFile: (id: string) => void;
  isUploading: boolean;
  onUploadFiles: () => void;
}

export default function FileList({ 
  files, 
  onRemoveFile, 
  isUploading, 
  onUploadFiles 
}: FileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="glass-card dark:glass-card-dark p-6 animate-slide-in-bottom">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Archivos seleccionados</h3>
        <Button
          variant="default"
          size="sm"
          onClick={onUploadFiles}
          disabled={isUploading || files.every((f) => f.status === "success")}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir todos
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            onRemove={onRemoveFile}
            disabled={isUploading}
          />
        ))}
      </div>
    </div>
  );
}
