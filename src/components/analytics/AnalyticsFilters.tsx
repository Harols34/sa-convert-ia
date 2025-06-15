
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
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAccount } from "@/context/AccountContext";

export interface AnalyticsFilters {
  search: string;
  status: string;
  result: string;
  agentId: string;
  dateRange: DateRange | undefined;
  sentiment: string;
  durationRange: string;
}

export interface AnalyticsFiltersProps {
  onFilterChange: (filters: AnalyticsFilters) => void;
}

const initialFilters: AnalyticsFilters = {
  search: "",
  status: "all",
  result: "all",
  agentId: "all",
  dateRange: undefined,
  sentiment: "all",
  durationRange: "all"
};

export default function AnalyticsFilters({ onFilterChange }: AnalyticsFiltersProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [searchInputValue, setSearchInputValue] = useState(""); 
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const { selectedAccountId } = useAccount();
  
  // Load agents for filters
  useEffect(() => {
    const loadAgents = async () => {
      try {
        let query = supabase
          .from('calls')
          .select('agent_name, agent_id')
          .not('agent_name', 'is', null);
          
        if (selectedAccountId && selectedAccountId !== 'all') {
          query = query.eq('account_id', selectedAccountId);
        }
        
        const { data, error } = await query;
        
        if (!error && data) {
          // Get unique agents
          const uniqueAgents = data.reduce((acc: any[], call) => {
            if (call.agent_name && !acc.find(a => a.name === call.agent_name)) {
              acc.push({
                id: call.agent_id || call.agent_name,
                name: call.agent_name
              });
            }
            return acc;
          }, []);
          setAgents(uniqueAgents);
        }
      } catch (error) {
        console.error("Error loading agents:", error);
      }
    };
    
    loadAgents();
  }, [selectedAccountId]);
  
  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.status && filters.status !== "all") count++;
    if (filters.result && filters.result !== "all") count++;
    if (filters.agentId && filters.agentId !== "all") count++;
    if (filters.sentiment && filters.sentiment !== "all") count++;
    if (filters.durationRange && filters.durationRange !== "all") count++;
    if (filters.dateRange) count++;
    if (filters.search) count++;
    setActiveFilterCount(count);
  }, [filters]);
  
  // Apply filters whenever they change
  useEffect(() => {
    console.log("Aplicando filtros de analytics:", filters);
    onFilterChange(filters);
  }, [filters, onFilterChange]);
  
  // Optimized search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchInputValue(newValue);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      console.log("Aplicando búsqueda de analytics:", newValue);
      setFilters(prev => ({ ...prev, search: newValue }));
    }, 300);
    
    setSearchTimeout(newTimeout);
  };
  
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      setFilters(prev => ({ ...prev, search: searchInputValue }));
    }
  };
  
  const updateFilter = (key: keyof AnalyticsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const clearFilters = () => {
    setFilters(initialFilters);
    setSearchInputValue(""); 
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar llamadas por título, agente..."
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
              aria-label="Limpiar búsqueda"
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
                <h4 className="font-medium">Filtrar análisis</h4>
                
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
                  <label className="text-sm font-medium">Resultado</label>
                  <Select 
                    value={filters.result} 
                    onValueChange={(value) => updateFilter('result', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los resultados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los resultados</SelectItem>
                      <SelectItem value="venta">Venta</SelectItem>
                      <SelectItem value="no venta">No Venta</SelectItem>
                      <SelectItem value="">Sin Resultado</SelectItem>
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
                      <SelectItem value="all">Todos los asesores</SelectItem>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.name}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sentimiento</label>
                  <Select 
                    value={filters.sentiment} 
                    onValueChange={(value) => updateFilter('sentiment', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los sentimientos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="positive">Positivo</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Duración</label>
                  <Select 
                    value={filters.durationRange} 
                    onValueChange={(value) => updateFilter('durationRange', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las duraciones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="short">Corta (< 2 min)</SelectItem>
                      <SelectItem value="medium">Media (2-10 min)</SelectItem>
                      <SelectItem value="long">Larga (> 10 min)</SelectItem>
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
              Estado: {filters.status}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('status', 'all')} 
              />
            </Badge>
          )}
          
          {filters.result && filters.result !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Resultado: {filters.result || 'Sin resultado'}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('result', 'all')} 
              />
            </Badge>
          )}
          
          {filters.agentId && filters.agentId !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Asesor: {filters.agentId}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('agentId', 'all')} 
              />
            </Badge>
          )}

          {filters.sentiment && filters.sentiment !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Sentimiento: {filters.sentiment}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('sentiment', 'all')} 
              />
            </Badge>
          )}

          {filters.durationRange && filters.durationRange !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Duración: {filters.durationRange}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('durationRange', 'all')} 
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
