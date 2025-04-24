import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreVertical, Edit, Trash2, Check, X, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

import { Call, Feedback, BehaviorAnalysis } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import CallUploadButton from "./CallUploadButton";
import CallListFilters from "./CallListFilters";
import CallListExport from "./CallListExport";
import { validateCallStatus } from "@/components/calls/detail/CallUtils";

export default function CallList() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("");
  const [filterTipificacionId, setFilterTipificacionId] = useState<string>("");
  const [filterAgentId, setFilterAgentId] = useState<string>("");
  const [filterDateRange, setFilterDateRange] = useState<any>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const fetchCalls = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("calls")
        .select(`
          *,
          feedback (*)
        `)
        .order("date", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      if (filterResult) {
        query = query.eq("result", filterResult);
      }

      if (filterTipificacionId && filterTipificacionId !== "all_tipificaciones") {
        query = query.eq("tipificacion_id", filterTipificacionId);
      }

      if (filterAgentId && filterAgentId !== "all_agents") {
        query = query.eq("agent_id", filterAgentId);
      }

      if (filterDateRange && filterDateRange.from) {
        const fromDate = new Date(filterDateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        query = query.gte("date", fromDate.toISOString());
        
        if (filterDateRange.to) {
          const toDate = new Date(filterDateRange.to);
          toDate.setHours(23, 59, 59, 999);
          query = query.lte("date", toDate.toISOString());
        }
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,agent_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching calls:", error);
        toast.error("Error al cargar las llamadas");
      } else {
        const mappedCalls: Call[] = data.map((call) => {
          let feedback: Feedback | undefined = undefined;
          
          if (call.feedback && call.feedback.length > 0) {
            const fbData = call.feedback[0];
            
            let behaviorsAnalysis: BehaviorAnalysis[] = [];
            if (fbData.behaviors_analysis) {
              if (typeof fbData.behaviors_analysis === 'string') {
                try {
                  behaviorsAnalysis = JSON.parse(fbData.behaviors_analysis);
                } catch (e) {
                  console.error("Error parsing behaviors_analysis:", e);
                }
              } else if (Array.isArray(fbData.behaviors_analysis)) {
                behaviorsAnalysis = fbData.behaviors_analysis.map((item: any) => ({
                  name: item.name || "",
                  evaluation: (item.evaluation === "cumple" || item.evaluation === "no cumple") 
                    ? item.evaluation : "no cumple",
                  comments: item.comments || ""
                }));
              }
            }
            
            feedback = {
              id: fbData.id,
              call_id: fbData.call_id,
              score: fbData.score || 0,
              positive: fbData.positive || [],
              negative: fbData.negative || [],
              opportunities: fbData.opportunities || [],
              behaviors_analysis: behaviorsAnalysis,
              created_at: fbData.created_at,
              updated_at: fbData.updated_at,
              sentiment: fbData.sentiment,
              topics: fbData.topics || [],
              entities: fbData.entities || []
            };
          }
          
          let result: "" | "venta" | "no venta" = "";
          
          let product: "" | "fijo" | "móvil" = "";
          if (call.product === "fijo" || call.product === "móvil") {
            product = call.product;
          }
          
          return {
            id: call.id,
            title: call.title,
            filename: call.filename,
            agentName: call.agent_name || "Sin asignar",
            agentId: call.agent_id,
            duration: call.duration || 0,
            date: call.date,
            status: validateCallStatus(call.status),
            progress: call.progress || 0,
            audio_url: call.audio_url,
            audioUrl: call.audio_url,
            transcription: null,
            summary: call.summary || "",
            result: result,
            product: product,
            reason: call.reason || "",
            tipificacionId: call.tipificacion_id,
            feedback: feedback,
            statusSummary: call.status_summary || ""
          };
        });
        setCalls(mappedCalls);
      }
    } catch (error) {
      console.error("Unexpected error fetching calls:", error);
      toast.error("Error inesperado al cargar las llamadas");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [filterStatus, filterResult, filterTipificacionId, filterAgentId, filterDateRange, searchQuery]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCalls();
  };

  const deleteCall = async () => {
    if (!selectedCallId) return;

    try {
      const { error } = await supabase.from("calls").delete().eq("id", selectedCallId);

      if (error) {
        console.error("Error deleting call:", error);
        toast.error("Error al eliminar la llamada");
      } else {
        setCalls((prevCalls) => prevCalls.filter((call) => call.id !== selectedCallId));
        toast.success("Llamada eliminada correctamente");
      }
    } catch (error) {
      console.error("Unexpected error deleting call:", error);
      toast.error("Error inesperado al eliminar la llamada");
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedCallId(null);
    }
  };

  const deleteMultipleCalls = async () => {
    if (selectedCalls.length === 0) return;

    try {
      toast.loading(`Eliminando ${selectedCalls.length} llamadas...`, { id: "delete-multiple" });

      const { error } = await supabase
        .from("calls")
        .delete()
        .in("id", selectedCalls);

      if (error) {
        console.error("Error deleting calls:", error);
        toast.error("Error al eliminar las llamadas", { id: "delete-multiple" });
      } else {
        setCalls((prevCalls) => prevCalls.filter((call) => !selectedCalls.includes(call.id)));
        toast.success(`${selectedCalls.length} llamadas eliminadas correctamente`, { id: "delete-multiple" });
        setSelectedCalls([]);
        setMultiSelectMode(false);
      }
    } catch (error) {
      console.error("Unexpected error deleting calls:", error);
      toast.error("Error inesperado al eliminar las llamadas", { id: "delete-multiple" });
    } finally {
      setIsMultiDeleteDialogOpen(false);
    }
  };

  const toggleCallSelection = (callId: string) => {
    setSelectedCalls(prev => {
      if (prev.includes(callId)) {
        return prev.filter(id => id !== callId);
      } else {
        return [...prev, callId];
      }
    });
  };

  const toggleAllCalls = (select: boolean) => {
    if (select) {
      setSelectedCalls(calls.map(call => call.id));
    } else {
      setSelectedCalls([]);
    }
  };

  const columns: ColumnDef<Call>[] = [
    ...(multiSelectMode ? [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox 
            checked={table.getRowModel().rows.length > 0 && selectedCalls.length === table.getRowModel().rows.length} 
            onCheckedChange={(value) => toggleAllCalls(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox 
            checked={selectedCalls.includes(row.original.id)}
            onCheckedChange={() => toggleCallSelection(row.original.id)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      }
    ] : []),
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => (
        <Link to={`/calls/${row.original.id}`} className="hover:underline">
          {row.getValue("title")}
        </Link>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duración",
      cell: ({ row }) => {
        const duration = row.getValue("duration") as number;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
      },
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => {
        const date = new Date(row.getValue("date") as string);
        return date.toLocaleDateString();
      },
    },
    {
      accessorKey: "agentName",
      header: "Agente",
    },
    {
      accessorKey: "statusSummary",
      header: "Resumen",
      cell: ({ row }) => {
        const summary = row.getValue("statusSummary") as string;
        if (!summary) return "-";
        
        return (
          <Badge variant="outline" className="font-normal">
            {summary}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        let badgeVariant: "default" | "destructive" | "outline" | "secondary" = "secondary";
        let statusText = "";
        
        if (status === "complete") {
          badgeVariant = "default";
          statusText = "Completo";
        } else if (status === "pending") {
          badgeVariant = "secondary";
          statusText = "Pendiente";
        } else if (status === "analyzing") {
          badgeVariant = "secondary";
          statusText = "Analizando";
        } else if (status === "transcribing") {
          badgeVariant = "secondary";
          statusText = "Transcribiendo";
        } else if (status === "error") {
          badgeVariant = "destructive";
          statusText = "Error";
        } else {
          statusText = status;
        }
        
        return <Badge variant={badgeVariant}>{statusText}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to={`/calls/${row.original.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedCallId(row.original.id);
                setIsDeleteDialogOpen(true);
              }}
              className="text-red-500 focus:text-red-500"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: calls,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleFilterChange = (filters: any) => {
    setFilterStatus(filters.status || 'all');
    setFilterResult(filters.result || '');
    setFilterTipificacionId(filters.tipificacionId || '');
    setFilterAgentId(filters.agentId || '');
    setFilterDateRange(filters.dateRange);
    setSearchQuery(filters.search || '');
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
                  setSelectedCalls([]);
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
              <CallListExport selectedCalls={selectedCalls.length > 0 ? 
                calls.filter(call => selectedCalls.includes(call.id)) : 
                undefined} 
              />
              <CallUploadButton />
            </>
          )}
        </div>
      </div>

      <CallListFilters 
        onFilterChange={handleFilterChange}
      />

      <div className="rounded-md border">
        <ScrollArea>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center">
                    Cargando llamadas...
                  </TableCell>
                </TableRow>
              ) : calls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center">
                    No se encontraron llamadas.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow 
                    key={row.id}
                    className={selectedCalls.includes(row.original.id) ? "bg-accent/30" : ""}
                    onClick={() => multiSelectMode && toggleCallSelection(row.original.id)}
                    style={{ cursor: multiSelectMode ? "pointer" : "default" }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
            <AlertDialogAction onClick={deleteCall}>Eliminar</AlertDialogAction>
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
            <AlertDialogAction onClick={deleteMultipleCalls}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
