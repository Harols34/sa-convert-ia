
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CallTable from "./CallTable";
import CallListFilters from "./CallListFilters";
import { useCallList } from "@/hooks/useCallList";
import { RefreshCw, Trash2, Grid3x3, List } from "lucide-react";

export default function CallList() {
  const {
    calls,
    loading,
    selectedCalls,
    multiSelectMode,
    setMultiSelectMode,
    handleRefresh,
    deleteCall,
    deleteMultipleCalls,
    toggleCallSelection,
    toggleAllCalls,
    isRefreshing,
  } = useCallList();

  const [filters, setFilters] = useState({
    dateRange: { from: undefined, to: undefined },
    status: "all",
    agent: "all",
    result: "all",
  });

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMultiSelectMode(!multiSelectMode)}
          >
            {multiSelectMode ? (
              <>
                <List className="h-4 w-4 mr-2" />
                Salir de selección
              </>
            ) : (
              <>
                <Grid3x3 className="h-4 w-4 mr-2" />
                Selección múltiple
              </>
            )}
          </Button>

          {multiSelectMode && selectedCalls.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteMultipleCalls}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar seleccionadas ({selectedCalls.length})
            </Button>
          )}
        </div>
      </div>

      <CallListFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        totalCalls={calls.length}
      />

      <Card className="overflow-hidden shadow-md border-gray-200">
        <CallTable
          calls={calls}
          selectedCalls={selectedCalls}
          multiSelectMode={multiSelectMode}
          onToggleCallSelection={toggleCallSelection}
          onToggleAllCalls={toggleAllCalls}
          onDeleteCall={deleteCall}
          loading={loading}
        />
      </Card>
    </div>
  );
}
