
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
  RefreshCw,
  AlertTriangle
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch all user emails and auth data
  const fetchUserData = useCallback(async () => {
    try {
      console.log("Fetching user data from getAllUserEmails...");
      // Add a timestamp to prevent caching
      const { data, error } = await supabase.functions.invoke('getAllUserEmails', {
        body: { timestamp: new Date().getTime() }
      });
      
      if (error) {
        console.error("Error invoking getAllUserEmails:", error);
        toast.error("Error al obtener datos de usuarios");
        return { emailMap: {}, authUsers: [] };
      }
      
      console.log("User data received:", data);
      
      if (data?.usersData) {
        setAuthUsers(data.usersData);
      }
      
      return { 
        emailMap: data?.userEmails || {}, 
        authUsers: data?.usersData || []
      };
    } catch (e) {
      console.error("Error invoking getAllUserEmails:", e);
      toast.error("Error al conectar con el servidor");
      return { emailMap: {}, authUsers: [] };
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Obteniendo usuarios...");
      
      // Get user emails and auth data first
      const { emailMap, authUsers } = await fetchUserData();
      console.log("Auth users:", authUsers);
      
      if (authUsers.length === 0) {
        console.log("No se encontraron usuarios autenticados");
        setError("No se encontraron usuarios en el sistema");
        setIsLoading(false);
        return;
      }
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error("Error al obtener perfiles:", profilesError);
        throw profilesError;
      }
      
      console.log("Perfiles obtenidos:", profiles);
      
      // Create a map of profiles by user ID for easy lookup
      const profileMap = {};
      if (profiles && profiles.length > 0) {
        profiles.forEach(profile => {
          profileMap[profile.id] = profile;
        });
      }
      
      // If we have no profiles but have auth users, create user objects from auth data
      if ((!profiles || profiles.length === 0) && authUsers.length > 0) {
        console.log("No profiles found, creating users from auth data");
        
        // Map the auth users to match the User interface
        const mappedUsers: User[] = authUsers.map(authUser => {
          return {
            id: authUser.id,
            name: authUser.email.split('@')[0] || 'Usuario',
            email: authUser.email,
            role: 'agent', // Default role
            avatar: null,
            dailyQueryLimit: 100, // Default values
            queriesUsed: 0,
            language: 'es', // Default language
            created_at: authUser.createdAt,
            updated_at: null
          };
        });
        
        console.log("Usuarios mapeados desde auth:", mappedUsers);
        setUsers(mappedUsers);
        setIsLoading(false);
        return;
      }
      
      // If we have profiles, map them with emails from auth
      if (profiles && profiles.length > 0) {
        // Map the profile data to match the User interface and include emails
        const mappedUsers: User[] = profiles.map(profile => {
          return {
            id: profile.id,
            name: profile.full_name || emailMap[profile.id]?.split('@')[0] || '',
            email: emailMap[profile.id] || '',
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
        
        console.log("Usuarios mapeados desde perfiles:", mappedUsers);
        setUsers(mappedUsers);
      } else {
        // If we have auth users but no corresponding profiles, create dummy profiles
        console.log("No profiles found for auth users, creating dummy profiles");
        
        const dummyUsers: User[] = authUsers.map(authUser => ({
          id: authUser.id,
          name: authUser.email.split('@')[0] || 'Usuario',
          email: authUser.email,
          role: 'agent',
          avatar: null,
          dailyQueryLimit: 100,
          queriesUsed: 0,
          language: 'es',
          created_at: authUser.createdAt,
          updated_at: null
        }));
        
        console.log("Usuarios mapeados desde auth (sin perfiles):", dummyUsers);
        setUsers(dummyUsers);
      }
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
  }, [fetchUserData]);

  // Fetch users on mount and when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Force refresh users
  const handleRefreshUsers = () => {
    toast.info("Actualizando lista de usuarios...");
    fetchUsers();
  };

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
      <div className="p-8 text-center bg-white rounded-lg shadow-sm border">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchUsers}>Intentar de nuevo</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 bg-white rounded-lg shadow-sm border p-6">
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
            onClick={handleRefreshUsers}
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

      {authUsers.length > 0 && users.length === 0 && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Información</AlertTitle>
          <AlertDescription>
            Se encontraron {authUsers.length} usuarios autenticados pero no hay perfiles correspondientes.
            Puede ser necesario crear perfiles para estos usuarios.
          </AlertDescription>
        </Alert>
      )}

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
                      <span className="font-medium">{user.name || 'Usuario'}</span>
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
