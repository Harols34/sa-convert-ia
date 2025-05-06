
import React, { useState, useEffect } from "react";
import { Search, Filter, Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tipificacion } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

export interface CallFilters {
  search: string;
  status: string;
  result: string;
  tipificacionId: string;
  agentId: string;
  dateRange: DateRange | undefined;
}

export interface CallListFiltersProps {
  onFilterChange: (filters: CallFilters) => void;
}

const initialFilters: CallFilters = {
  search: "",
  status: "all",
  result: "",
  tipificacionId: "",
  agentId: "",
  dateRange: undefined
};

export default function CallListFilters({ onFilterChange }: CallListFiltersProps) {
  const [filters, setFilters] = useState<CallFilters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [tipificaciones, setTipificaciones] = useState<Tipificacion[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [searchInputValue, setSearchInputValue] = useState(""); // Estado para controlar el campo de búsqueda
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null); // Control de tiempo para búsqueda
  
  // Load tipificaciones and agents for filters
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        // Load tipificaciones
        const { data: tipData, error: tipError } = await supabase
          .from('tipificaciones')
          .select('*')
          .eq('is_active', true);
          
        if (!tipError && tipData) {
          setTipificaciones(tipData.map(tip => ({
            id: tip.id,
            name: tip.name,
            description: tip.description,
            type: tip.type,
            isActive: tip.is_active
          })));
        }
        
        // Load agents
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('status', 'active');
          
        if (!agentError && agentData) {
          setAgents(agentData);
        }
      } catch (error) {
        console.error("Error loading filter data:", error);
      }
    };
    
    loadFilterData();
  }, []);
  
  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.status && filters.status !== "all") count++;
    if (filters.result) count++;
    if (filters.tipificacionId) count++;
    if (filters.agentId) count++;
    if (filters.dateRange) count++;
    if (filters.search) count++;
    setActiveFilterCount(count);
  }, [filters]);
  
  // Apply filters whenever they change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);
  
  // Mejorar la búsqueda con debounce para mejor rendimiento
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchInputValue(newValue);
    
    // Limpiar timeout anterior si existe
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Crear nuevo timeout para aplicar la búsqueda después de un breve retraso (250ms)
    const newTimeout = setTimeout(() => {
      console.log("Applying search:", newValue);
      setFilters(prev => ({ ...prev, search: newValue }));
    }, 250);
    
    setSearchTimeout(newTimeout);
  };
  
  // Búsqueda inmediata al presionar Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      console.log("Search on Enter:", searchInputValue);
      setFilters(prev => ({ ...prev, search: searchInputValue }));
    }
  };
  
  const updateFilter = (key: keyof CallFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const clearFilters = () => {
    setFilters(initialFilters);
    setSearchInputValue(""); // Limpiar también el campo de búsqueda
  };

  // Function to get translated status name
  const getStatusName = (status: string): string => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'transcribing': return 'Transcribiendo';
      case 'analyzing': return 'Analizando';
      case 'complete': return 'Completo';
      case 'error': return 'Error';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, nombre de agente o código..."
            value={searchInputValue}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            className="pl-8"
          />
          {searchInputValue && (
            <button 
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchInputValue('');
                setFilters(prev => ({ ...prev, search: '' }));
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <Filter className="h-4 w-4 mr-1" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <h4 className="font-medium">Filtrar llamadas</h4>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => updateFilter('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="transcribing">Transcribiendo</SelectItem>
                      <SelectItem value="analyzing">Analizando</SelectItem>
                      <SelectItem value="complete">Completo</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipificación</label>
                  <Select 
                    value={filters.tipificacionId} 
                    onValueChange={(value) => updateFilter('tipificacionId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las tipificaciones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_tipificaciones">Todas las tipificaciones</SelectItem>
                      {tipificaciones.map(tip => (
                        <SelectItem key={tip.id} value={tip.id}>
                          {tip.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Asesor</label>
                  <Select 
                    value={filters.agentId} 
                    onValueChange={(value) => updateFilter('agentId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los asesores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_agents">Todos los asesores</SelectItem>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rango de fecha</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dateRange?.from ? (
                          filters.dateRange.to ? (
                            <>
                              {filters.dateRange.from.toLocaleDateString()} -
                              {filters.dateRange.to.toLocaleDateString()}
                            </>
                          ) : (
                            filters.dateRange.from.toLocaleDateString()
                          )
                        ) : (
                          <span>Seleccionar rango de fechas</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={new Date()}
                        selected={filters.dateRange}
                        onSelect={(range) => updateFilter('dateRange', range)}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex justify-between pt-2">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Limpiar filtros
                  </Button>
                  <Button size="sm" onClick={() => setShowFilters(false)}>
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Búsqueda: {filters.search}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => {
                  updateFilter('search', '');
                  setSearchInputValue('');
                }} 
              />
            </Badge>
          )}
          
          {filters.status && filters.status !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Estado: {getStatusName(filters.status)}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('status', 'all')} 
              />
            </Badge>
          )}
          
          {filters.tipificacionId && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Tipificación: {tipificaciones.find(t => t.id === filters.tipificacionId)?.name || 'Desconocida'}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('tipificacionId', 'all_tipificaciones')} 
              />
            </Badge>
          )}
          
          {filters.agentId && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Asesor: {agents.find(a => a.id === filters.agentId)?.name || 'Desconocido'}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('agentId', 'all_agents')} 
              />
            </Badge>
          )}
          
          {filters.dateRange && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Fecha: {filters.dateRange.from?.toLocaleDateString()} - {filters.dateRange.to?.toLocaleDateString() || 'actual'}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('dateRange', undefined)} 
              />
            </Badge>
          )}
          
          {activeFilterCount > 1 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs"
              onClick={clearFilters}
            >
              Limpiar todos
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
