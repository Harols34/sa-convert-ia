import { useState, useEffect, useCallback } from "react";
import { User } from "@/lib/types";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserPlus,
  Search,
  RefreshCw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch all user emails at once using the edge function
  const fetchUserEmails = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('getAllUserEmails');
      
      if (error) {
        console.error("Error al obtener correos de usuarios:", error);
        toast.error("Error al obtener correos de usuarios");
        return {};
      }
      
      console.log("User emails data:", data);
      return data?.userEmails || {};
    } catch (e) {
      console.error("Error al invocar la función getAllUserEmails:", e);
      toast.error("Error al conectar con el servidor");
      return {};
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Obteniendo usuarios...");
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) {
        console.error("Error al obtener perfiles:", profilesError);
        throw profilesError;
      }
      
      console.log("Perfiles obtenidos:", profiles);
      
      if (!profiles || profiles.length === 0) {
        console.log("No se encontraron perfiles de usuario");
        setUsers([]);
        setIsLoading(false);
        return;
      }

      // Fetch all emails at once
      const userEmailsMap = await fetchUserEmails();
      console.log("Mapa de emails obtenido:", userEmailsMap);
      
      // Map the profile data to match the User interface and include emails
      const mappedUsers: User[] = profiles.map(profile => {
        return {
          id: profile.id,
          name: profile.full_name || '',
          email: userEmailsMap[profile.id] || '',
          role: (profile.role as User["role"]) || 'agent',
          avatar: profile.avatar_url,
          dailyQueryLimit: 100, // Default values
          queriesUsed: 0,
          language: (profile.language as 'es' | 'en') || 'es',
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        };
      });
      
      console.log("Usuarios mapeados:", mappedUsers);
      setUsers(mappedUsers);
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);
      setError("Hubo un problema al cargar la lista de usuarios.");
      toast.error("Error al cargar usuarios", {
        description: "Hubo un problema al cargar la lista de usuarios.",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserEmails]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const deleteUser = async (userId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.")) {
      try {
        // Delete user from auth
        const { error } = await supabase.functions.invoke('deleteUser', {
          body: { userId }
        });
        
        if (error) throw error;
        
        // User profile will be deleted automatically through RLS cascade
        setUsers(users.filter(user => user.id !== userId));
        
        toast.success("Usuario eliminado", {
          description: "El usuario ha sido eliminado exitosamente.",
          duration: 3000,
        });
      } catch (error) {
        console.error("Error al eliminar usuario:", error);
        toast.error("Error al eliminar usuario", {
          description: "Hubo un problema al eliminar el usuario.",
          duration: 3000,
        });
      }
    }
  };

  const filteredUsers = users.filter(
    user => 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superAdmin':
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      case 'admin':
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case 'qualityAnalyst':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case 'supervisor':
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
      case 'agent':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const translateRole = (role: string) => {
    switch (role) {
      case 'superAdmin':
        return "Super Admin";
      case 'admin':
        return "Administrador";
      case 'qualityAnalyst':
        return "Analista de Calidad";
      case 'supervisor':
        return "Supervisor";
      case 'agent':
        return "Agente";
      default:
        return role;
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center bg-white">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchUsers}>Intentar de nuevo</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 bg-white">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-secondary rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in bg-white">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full md:w-80"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={fetchUsers}
            size="icon"
            title="Refrescar usuarios"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button asChild>
          <Link to="/users/new">
            <UserPlus className="mr-2 h-4 w-4" /> Crear Usuario
          </Link>
        </Button>
      </div>

      <div className="glass-card dark:glass-card-dark p-6 animate-slide-in-bottom bg-white border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Idioma</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm text-muted-foreground mb-2">No se encontraron usuarios</p>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/users/new">
                        <UserPlus className="mr-2 h-4 w-4" /> Crear Usuario
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="mr-2 h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${getRoleBadgeColor(user.role)}`}>
                      {translateRole(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.language === 'en' ? 'Inglés' : 'Español'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white">
                        <DropdownMenuItem asChild>
                          <Link to={`/users/edit/${user.id}`} className="flex w-full cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
