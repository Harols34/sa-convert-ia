
import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Agent type definition
interface Agent {
  id: string;
  name: string;
  supervisor: string;
  joinDate: string;
  status: "active" | "inactive" | "vacation" | "training";
  user_id?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  // Form state
  const [newAgent, setNewAgent] = useState({
    name: "",
    supervisor: "",
    joinDate: new Date().toISOString().split('T')[0],
    status: "active" as const,
    user_id: ""
  });

  // CSV template content
  const csvTemplate = 'nombre,supervisor,fecha_ingreso,estado,id_usuario\nJuan Pérez,María García,2023-01-15,active,\nAna López,Carlos Rodríguez,2023-03-22,inactive,';

  // Load agents from Supabase on component mount
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*');
      
      if (error) {
        throw error;
      }
      
      // Transform the data to match our Agent interface
      const formattedAgents: Agent[] = data.map(agent => ({
        id: agent.id,
        name: agent.name,
        supervisor: agent.supervisor || '',
        joinDate: agent.join_date,
        status: agent.status as "active" | "inactive" | "vacation" | "training",
        user_id: agent.user_id || undefined
      }));
      
      setAgents(formattedAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Error al cargar los agentes");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter agents based on search term
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.supervisor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle form submission for adding a new agent
  const handleAddAgent = async () => {
    if (!newAgent.name || !newAgent.supervisor) {
      toast.error("Por favor complete todos los campos obligatorios");
      return;
    }

    setIsLoading(true);
    try {
      // Validate user_id is a valid UUID or empty
      if (newAgent.user_id && !isValidUUID(newAgent.user_id)) {
        toast.error("El ID de usuario debe ser un UUID válido o estar vacío");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: newAgent.name,
          supervisor: newAgent.supervisor,
          join_date: newAgent.joinDate,
          status: newAgent.status,
          user_id: newAgent.user_id || null
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      if (data && data[0]) {
        const addedAgent: Agent = {
          id: data[0].id,
          name: data[0].name,
          supervisor: data[0].supervisor || '',
          joinDate: data[0].join_date,
          status: data[0].status as "active" | "inactive" | "vacation" | "training",
          user_id: data[0].user_id
        };
        
        setAgents(prev => [...prev, addedAgent]);
        setNewAgent({
          name: "",
          supervisor: "",
          joinDate: new Date().toISOString().split('T')[0],
          status: "active",
          user_id: ""
        });
        setIsAddDialogOpen(false);
        toast.success("Agente añadido correctamente");
      }
    } catch (error) {
      console.error("Error adding agent:", error);
      toast.error("Error al añadir el agente");
    } finally {
      setIsLoading(false);
    }
  };

  // UUID validation helper
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Handle form submission for editing an agent
  const handleEditAgent = async () => {
    if (!currentAgent) return;
    
    setIsLoading(true);
    try {
      // Validate user_id is a valid UUID or empty
      if (currentAgent.user_id && !isValidUUID(currentAgent.user_id)) {
        toast.error("El ID de usuario debe ser un UUID válido o estar vacío");
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from('agents')
        .update({
          name: currentAgent.name,
          supervisor: currentAgent.supervisor,
          join_date: currentAgent.joinDate,
          status: currentAgent.status,
          user_id: currentAgent.user_id || null
        })
        .eq('id', currentAgent.id);
      
      if (error) {
        throw error;
      }
      
      setAgents(prev => prev.map(agent => 
        agent.id === currentAgent.id ? currentAgent : agent
      ));
      setIsEditDialogOpen(false);
      toast.success("Agente actualizado correctamente");
    } catch (error) {
      console.error("Error updating agent:", error);
      toast.error("Error al actualizar el agente");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle agent deletion
  const handleDeleteAgent = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este agente? Esta acción no se puede deshacer.")) {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('agents')
          .delete()
          .eq('id', id);
        
        if (error) {
          throw error;
        }
        
        setAgents(prev => prev.filter(agent => agent.id !== id));
        toast.success("Agente eliminado correctamente");
      } catch (error) {
        console.error("Error deleting agent:", error);
        toast.error("Error al eliminar el agente");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle CSV download
  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'plantilla_agentes.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle CSV import
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      const lines = csvText.split('\n');
      
      // Skip header row
      const agentsToImport = lines.slice(1).filter(line => line.trim()).map(line => {
        const [name, supervisor, joinDate, status, user_id] = line.split(',');
        return {
          name,
          supervisor,
          join_date: joinDate,
          status: status as "active" | "inactive" | "vacation" | "training",
          user_id: user_id && user_id.trim() ? user_id.trim() : null
        };
      });

      if (agentsToImport.length === 0) {
        toast.error("No se encontraron agentes para importar");
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('agents')
          .insert(agentsToImport)
          .select();
          
        if (error) throw error;
        
        await fetchAgents(); // Reload agents after import
        setIsImportDialogOpen(false);
        toast.success(`${agentsToImport.length} agentes importados correctamente`);
      } catch (error) {
        console.error("Error importing agents:", error);
        toast.error("Error al importar agentes");
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.readAsText(file);
  };

  // Get status badge color based on status
  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-red-100 text-red-800";
      case "vacation": return "bg-blue-100 text-blue-800";
      case "training": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agentes</h2>
          <p className="text-muted-foreground">
            Gestiona los agentes de tu call center
          </p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Importar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar agentes desde CSV</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Sube un archivo CSV con los datos de los agentes. Puedes descargar una plantilla con el formato correcto.
                </p>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" /> Descargar Plantilla
                </Button>
                <Input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleImportCSV} 
                  disabled={isLoading}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancelar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Añadir Agente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir nuevo agente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right">Nombre</label>
                  <Input 
                    id="name" 
                    value={newAgent.name} 
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="supervisor" className="text-right">Supervisor</label>
                  <Input 
                    id="supervisor" 
                    value={newAgent.supervisor} 
                    onChange={(e) => setNewAgent({...newAgent, supervisor: e.target.value})}
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="joinDate" className="text-right">Fecha Ingreso</label>
                  <Input 
                    id="joinDate" 
                    type="date" 
                    value={newAgent.joinDate} 
                    onChange={(e) => setNewAgent({...newAgent, joinDate: e.target.value})}
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="status" className="text-right">Estado</label>
                  <Select 
                    value={newAgent.status} 
                    onValueChange={(value: any) => setNewAgent({...newAgent, status: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="vacation">Vacaciones</SelectItem>
                      <SelectItem value="training">Formación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="user_id" className="text-right">ID Usuario</label>
                  <Input 
                    id="user_id" 
                    value={newAgent.user_id} 
                    onChange={(e) => setNewAgent({...newAgent, user_id: e.target.value})}
                    className="col-span-3" 
                    placeholder="Opcional - UUID del usuario asociado"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddAgent} disabled={isLoading}>
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <CardTitle>Lista de Agentes</CardTitle>
            <div className="relative mt-2 md:mt-0">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar agentes..."
                className="pl-8 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>ID Usuario</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAgents.length > 0 ? (
                  filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.id.slice(0, 8)}</TableCell>
                      <TableCell>{agent.name}</TableCell>
                      <TableCell>{agent.supervisor}</TableCell>
                      <TableCell>{new Date(agent.joinDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(agent.status)}`}>
                          {agent.status === "active" && "Activo"}
                          {agent.status === "inactive" && "Inactivo"}
                          {agent.status === "vacation" && "Vacaciones"}
                          {agent.status === "training" && "Formación"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {agent.user_id ? agent.user_id.slice(0, 8) + '...' : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setCurrentAgent(agent);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteAgent(agent.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron agentes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Agent Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar agente</DialogTitle>
          </DialogHeader>
          {currentAgent && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-name" className="text-right">Nombre</label>
                <Input 
                  id="edit-name" 
                  value={currentAgent.name} 
                  onChange={(e) => setCurrentAgent({...currentAgent, name: e.target.value})}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-supervisor" className="text-right">Supervisor</label>
                <Input 
                  id="edit-supervisor" 
                  value={currentAgent.supervisor} 
                  onChange={(e) => setCurrentAgent({...currentAgent, supervisor: e.target.value})}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-joinDate" className="text-right">Fecha Ingreso</label>
                <Input 
                  id="edit-joinDate" 
                  type="date" 
                  value={currentAgent.joinDate} 
                  onChange={(e) => setCurrentAgent({...currentAgent, joinDate: e.target.value})}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-status" className="text-right">Estado</label>
                <Select 
                  value={currentAgent.status} 
                  onValueChange={(value: any) => setCurrentAgent({...currentAgent, status: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="vacation">Vacaciones</SelectItem>
                    <SelectItem value="training">Formación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-user-id" className="text-right">ID Usuario</label>
                <Input 
                  id="edit-user-id" 
                  value={currentAgent.user_id || ''} 
                  onChange={(e) => setCurrentAgent({...currentAgent, user_id: e.target.value || undefined})}
                  className="col-span-3" 
                  placeholder="Opcional - UUID del usuario asociado"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditAgent} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
