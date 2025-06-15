
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Trash2, CheckSquare, Square, Filter, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDate, formatDuration } from "@/lib/utils";
import { useCallList } from "@/hooks/useCallList";
import { useUser } from "@/hooks/useUser";
import CallListFilters, { CallFilters } from "./CallListFilters";
import CallListExport from "./CallListExport";

export default function CallList() {
  const navigate = useNavigate();
  const { user } = useUser();
  const {
    calls,
    loading,
    error,
    selectedCalls,
    isRefreshing,
    multiSelectMode,
    setMultiSelectMode,
    handleRefresh,
    deleteCall,
    deleteMultipleCalls,
    toggleCallSelection,
    toggleAllCalls,
  } = useCallList();

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [callToDelete, setCallToDelete] = useState<string | null>(null);
  const [filters, setFilters] = useState<CallFilters>({
    search: "",
    status: "all",
    result: "",
    tipificacionId: "",
    agentId: "",
    dateRange: undefined
  });

  // Filter calls based on search term and filters
  const filteredCalls = useMemo(() => {
    let filtered = calls.filter(call => {
      const matchesSearch = filters.search === "" || 
        call.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        call.agentName.toLowerCase().includes(filters.search.toLowerCase()) ||
        call.filename.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === "all" || filters.status === "" || call.status === filters.status;
      const matchesAgent = filters.agentId === "all_agents" || filters.agentId === "" || call.agent_id === filters.agentId;
      const matchesResult = filters.result === "" || call.result === filters.result;
      
      let matchesDateRange = true;
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const callDate = new Date(call.date);
        if (filters.dateRange.from) {
          matchesDateRange = matchesDateRange && callDate >= filters.dateRange.from;
        }
        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          matchesDateRange = matchesDateRange && callDate <= toDate;
        }
      }

      return matchesSearch && matchesStatus && matchesAgent && matchesResult && matchesDateRange;
    });

    return filtered;
  }, [calls, filters]);

  const isAdmin = user && (user.role === "admin" || user.role === "superAdmin" || user.role === "supervisor");

  const handleDeleteClick = (callId: string) => {
    setCallToDelete(callId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (callToDelete) {
      await deleteCall(callToDelete);
    }
    setDeleteDialogOpen(false);
    setCallToDelete(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "analyzing": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "transcribing": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "pending": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "error": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getResultColor = (result?: string) => {
    switch (result) {
      case "venta": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "no venta": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            Error al cargar las llamadas: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lista de Llamadas</h2>
          <p className="text-muted-foreground">
            {filteredCalls.length} de {calls.length} llamadas
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
          
          <CallListExport 
            filteredCalls={filteredCalls}
            selectedCalls={selectedCalls.length > 0 ? filteredCalls.filter(call => selectedCalls.includes(call.id)) : undefined}
          />
          
          <Button onClick={() => navigate('/calls/upload')}>
            <Plus className="mr-2 h-4 w-4" />
            Subir Llamada
          </Button>
        </div>
      </div>

      {/* Filters */}
      <CallListFilters onFilterChange={setFilters} />

      {/* Multi-select controls */}
      {isAdmin && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setMultiSelectMode(!multiSelectMode)}
          >
            {multiSelectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            <span className="ml-2">Selección múltiple</span>
          </Button>
          
          {multiSelectMode && selectedCalls.length > 0 && (
            <Button
              variant="destructive"
              onClick={deleteMultipleCalls}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar ({selectedCalls.length})
            </Button>
          )}
        </div>
      )}

      {/* Multi-select all checkbox */}
      {multiSelectMode && filteredCalls.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAllCalls}
          >
            {selectedCalls.length === filteredCalls.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>
          <span className="text-sm">
            {selectedCalls.length === filteredCalls.length ? 'Deseleccionar' : 'Seleccionar'} todas las llamadas
          </span>
        </div>
      )}

      {/* Calls List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando llamadas...</p>
          </div>
        ) : filteredCalls.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                {calls.length === 0 ? "No hay llamadas disponibles" : "No se encontraron llamadas que coincidan con los filtros"}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredCalls.map((call) => (
            <Card 
              key={call.id} 
              className={`transition-all hover:shadow-md cursor-pointer ${
                selectedCalls.includes(call.id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => {
                if (multiSelectMode) {
                  toggleCallSelection(call.id);
                } else {
                  navigate(`/calls/${call.id}`);
                }
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {multiSelectMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCallSelection(call.id);
                        }}
                      >
                        {selectedCalls.includes(call.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{call.title}</h3>
                        <Badge className={getStatusColor(call.status)}>
                          {call.status === "complete" && "Completa"}
                          {call.status === "analyzing" && "Analizando"}
                          {call.status === "transcribing" && "Transcribiendo"}
                          {call.status === "pending" && "Pendiente"}
                          {call.status === "error" && "Error"}
                        </Badge>
                        {call.result && (
                          <Badge className={getResultColor(call.result)}>
                            {call.result === "venta" ? "Venta" : "No Venta"}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Agente:</span> {call.agentName}
                        </div>
                        <div>
                          <span className="font-medium">Fecha:</span> {formatDate(call.date)}
                        </div>
                        <div>
                          <span className="font-medium">Duración:</span> {formatDuration(call.duration || 0)}
                        </div>
                        <div>
                          <span className="font-medium">Archivo:</span> {call.filename}
                        </div>
                      </div>
                      
                      {call.status !== "complete" && call.status !== "error" && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all" 
                                style={{ width: `${call.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {call.progress}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isAdmin && !multiSelectMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/calls/${call.id}`);
                        }}>
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(call.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La llamada será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
