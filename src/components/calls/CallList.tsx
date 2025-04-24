
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, RefreshCcw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import CallUploadButton from "./CallUploadButton";
import CallListFilters from "./CallListFilters";
import CallListExport from "./CallListExport";
import { useCallList } from "@/hooks/useCallList";
import { CallTable } from "./CallTable";

export default function CallList() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  
  const {
    calls,
    isLoading,
    selectedCalls,
    isRefreshing,
    multiSelectMode,
    setMultiSelectMode,
    fetchCalls,
    handleRefresh,
    deleteCall,
    deleteMultipleCalls,
    toggleCallSelection,
    toggleAllCalls,
  } = useCallList();

  const handleFilterChange = (filters: any) => {
    fetchCalls(filters);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Llamadas</h2>
        <div className="flex gap-2">
          {multiSelectMode ? (
            <>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setIsMultiDeleteDialogOpen(true)}
                disabled={selectedCalls.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar ({selectedCalls.length})
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setMultiSelectMode(false);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMultiSelectMode(true)}
              >
                <Check className="mr-2 h-4 w-4" />
                Seleccionar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <CallListExport 
                selectedCalls={selectedCalls.length > 0 ? 
                  calls.filter(call => selectedCalls.includes(call.id)) : 
                  undefined
                } 
                filteredCalls={calls}
              />
              <CallUploadButton />
            </>
          )}
        </div>
      </div>

      <CallListFilters onFilterChange={handleFilterChange} />

      <div className="rounded-md border">
        <ScrollArea>
          <CallTable
            calls={calls}
            isLoading={isLoading}
            selectedCalls={selectedCalls}
            multiSelectMode={multiSelectMode}
            onDeleteCall={(id) => {
              setSelectedCallId(id);
              setIsDeleteDialogOpen(true);
            }}
            onToggleCallSelection={toggleCallSelection}
            onToggleAllCalls={toggleAllCalls}
          />
        </ScrollArea>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Deseas eliminar esta llamada?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (selectedCallId) {
                  deleteCall(selectedCallId);
                }
                setIsDeleteDialogOpen(false);
                setSelectedCallId(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isMultiDeleteDialogOpen} onOpenChange={setIsMultiDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar {selectedCalls.length} llamadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteMultipleCalls}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
