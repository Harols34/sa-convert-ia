import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Search, Plus, Filter, ArrowUpDown, Check, X, Edit, Trash2, UserPlus, Users, Calendar, Clock, Phone, Mail, Building, MapPin } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function WorkforcePage() {
  const [agents, setAgents] = useState([
    {
      id: 1,
      name: "Carlos Rodríguez",
      email: "carlos.rodriguez@example.com",
      role: "Agente Senior",
      department: "Ventas",
      status: "active",
      location: "Madrid",
      avatar: "/avatars/01.png",
      performance: 92,
      calls: 145,
      avgDuration: "5:32",
      conversionRate: "8.2%"
    },
    {
      id: 2,
      name: "María López",
      email: "maria.lopez@example.com",
      role: "Agente",
      department: "Soporte",
      status: "active",
      location: "Barcelona",
      avatar: "/avatars/02.png",
      performance: 88,
      calls: 203,
      avgDuration: "4:15",
      conversionRate: "6.7%"
    },
    {
      id: 3,
      name: "Javier Martínez",
      email: "javier.martinez@example.com",
      role: "Supervisor",
      department: "Ventas",
      status: "inactive",
      location: "Valencia",
      avatar: "/avatars/03.png",
      performance: 95,
      calls: 78,
      avgDuration: "7:45",
      conversionRate: "9.3%"
    },
    {
      id: 4,
      name: "Ana Sánchez",
      email: "ana.sanchez@example.com",
      role: "Agente",
      department: "Atención al Cliente",
      status: "active",
      location: "Sevilla",
      avatar: "/avatars/04.png",
      performance: 79,
      calls: 167,
      avgDuration: "3:50",
      conversionRate: "5.1%"
    },
    {
      id: 5,
      name: "Miguel Fernández",
      email: "miguel.fernandez@example.com",
      role: "Agente Senior",
      department: "Soporte",
      status: "active",
      location: "Madrid",
      avatar: "/avatars/05.png",
      performance: 91,
      calls: 132,
      avgDuration: "6:10",
      conversionRate: "7.8%"
    }
  ]);

  const [teams, setTeams] = useState([
    {
      id: 1,
      name: "Equipo Ventas Norte",
      department: "Ventas",
      members: 8,
      lead: "Carlos Rodríguez",
      performance: 92,
      status: "active"
    },
    {
      id: 2,
      name: "Soporte Técnico",
      department: "Soporte",
      members: 12,
      lead: "María López",
      performance: 88,
      status: "active"
    },
    {
      id: 3,
      name: "Atención Premium",
      department: "Atención al Cliente",
      members: 6,
      lead: "Javier Martínez",
      performance: 95,
      status: "active"
    },
    {
      id: 4,
      name: "Ventas Empresas",
      department: "Ventas",
      members: 10,
      lead: "Ana Sánchez",
      performance: 79,
      status: "inactive"
    }
  ]);

  const [shifts, setShifts] = useState([
    {
      id: 1,
      name: "Mañana",
      startTime: "08:00",
      endTime: "16:00",
      days: ["Lun", "Mar", "Mié", "Jue", "Vie"],
      agents: 12
    },
    {
      id: 2,
      name: "Tarde",
      startTime: "16:00",
      endTime: "00:00",
      days: ["Lun", "Mar", "Mié", "Jue", "Vie"],
      agents: 8
    },
    {
      id: 3,
      name: "Noche",
      startTime: "00:00",
      endTime: "08:00",
      days: ["Lun", "Mar", "Mié", "Jue", "Vie"],
      agents: 4
    },
    {
      id: 4,
      name: "Fin de Semana",
      startTime: "10:00",
      endTime: "22:00",
      days: ["Sáb", "Dom"],
      agents: 6
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filteredAgents = agents.filter(agent => {
    return (
      (agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterDepartment === "" || agent.department === filterDepartment) &&
      (filterStatus === "" || agent.status === filterStatus)
    );
  });

  const handleDeleteAgent = (id: number) => {
    setAgents(agents.filter(agent => agent.id !== id));
    toast.success("Agente eliminado correctamente");
  };

  const handleStatusChange = (id: number) => {
    setAgents(
      agents.map(agent =>
        agent.id === id
          ? { ...agent, status: agent.status === "active" ? "inactive" : "active" }
          : agent
      )
    );
    toast.success("Estado actualizado correctamente");
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fuerza Laboral</h2>
          <p className="text-muted-foreground">
            Gestiona agentes, equipos y turnos de trabajo
          </p>
        </div>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center">
            <Building className="mr-2 h-4 w-4" />
            Equipos
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Turnos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col md:flex-row gap-4 md:items-center flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Buscar agentes..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="Ventas">Ventas</SelectItem>
                      <SelectItem value="Soporte">Soporte</SelectItem>
                      <SelectItem value="Atención al Cliente">Atención al Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="flex-shrink-0">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Nuevo Agente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Agente</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Rendimiento</TableHead>
                      <TableHead>Llamadas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No se encontraron agentes con los filtros aplicados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAgents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={agent.avatar} alt={agent.name} />
                                <AvatarFallback>{agent.name.substring(0, 2)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{agent.name}</div>
                                <div className="text-sm text-muted-foreground">{agent.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{agent.department}</span>
                              <span className="text-sm text-muted-foreground">{agent.role}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-gray-200">
                                <div
                                  className={`h-full rounded-full ${
                                    agent.performance > 90
                                      ? "bg-green-500"
                                      : agent.performance > 80
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${agent.performance}%` }}
                                />
                              </div>
                              <span className="text-sm">{agent.performance}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{agent.calls}</span>
                              <span className="text-sm text-muted-foreground">
                                {agent.avgDuration} prom.
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {agent.status === "active" ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <Check className="mr-1 h-3 w-3" /> Activo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                <X className="mr-1 h-3 w-3" /> Inactivo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menú</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(agent.id)}>
                                  {agent.status === "active" ? (
                                    <>
                                      <X className="mr-2 h-4 w-4" /> Desactivar
                                    </>
                                  ) : (
                                    <>
                                      <Check className="mr-2 h-4 w-4" /> Activar
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                    </DropdownMenuItem>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>¿Confirmar eliminación?</DialogTitle>
                                      <DialogDescription>
                                        Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar a este agente?
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => document.getElementById('close-dialog')?.click()}>
                                        Cancelar
                                      </Button>
                                      <Button variant="destructive" onClick={() => {
                                        handleDeleteAgent(agent.id);
                                        document.getElementById('close-dialog')?.click();
                                      }}>
                                        Eliminar
                                      </Button>
                                      <button id="close-dialog" className="hidden" />
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col md:flex-row gap-4 md:items-center flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Buscar equipos..."
                      className="pl-8"
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="Ventas">Ventas</SelectItem>
                      <SelectItem value="Soporte">Soporte</SelectItem>
                      <SelectItem value="Atención al Cliente">Atención al Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="flex-shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Equipo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre del Equipo</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Miembros</TableHead>
                      <TableHead>Líder</TableHead>
                      <TableHead>Rendimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>{team.department}</TableCell>
                        <TableCell>{team.members}</TableCell>
                        <TableCell>{team.lead}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-gray-200">
                              <div
                                className={`h-full rounded-full ${
                                  team.performance > 90
                                    ? "bg-green-500"
                                    : team.performance > 80
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${team.performance}%` }}
                              />
                            </div>
                            <span className="text-sm">{team.performance}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {team.status === "active" ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Check className="mr-1 h-3 w-3" /> Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              <X className="mr-1 h-3 w-3" /> Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Users className="mr-2 h-4 w-4" /> Ver miembros
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col md:flex-row gap-4 md:items-center flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Buscar turnos..."
                      className="pl-8"
                    />
                  </div>
                </div>
                <Button className="flex-shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Turno
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre del Turno</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Agentes Asignados</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{shift.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            {shift.startTime} - {shift.endTime}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {shift.days.map((day, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {day}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{shift.agents}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Users className="mr-2 h-4 w-4" /> Ver agentes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
