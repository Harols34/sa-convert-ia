
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FormData {
  email: string;
  password: string;
  name: string;
  role: string;
  language: string;
}

export default function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    role: 'agent',
    language: 'es',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode) {
      fetchUserData();
    }
  }, [id]);

  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Obteniendo datos de usuario con ID:", id);
      // First get the profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (profileError) {
        console.error("Error al obtener perfil:", profileError);
        throw profileError;
      }
      
      console.log("Datos de perfil obtenidos:", profileData);
      
      // Then get user email from auth.users via admin function
      let userEmail = '';
      try {
        const { data, error } = await supabase.functions.invoke('getUserEmail', {
          body: { userId: id }
        });
        
        if (!error && data?.email) {
          userEmail = data.email;
        }
      } catch (e) {
        console.error("No se pudo obtener el email del usuario:", e);
      }
      
      if (profileData) {
        setFormData({
          email: userEmail || '', // Use the email from the admin function or empty string
          password: '', // No poblar contraseña en modo edición
          name: profileData.full_name || '',
          role: profileData.role || 'agent',
          language: 'es', // Forzar español
        });
      }
    } catch (error) {
      console.error("Error al obtener datos del usuario:", error);
      setError("Hubo un problema al cargar los datos del usuario.");
      toast.error("Error al cargar usuario", {
        description: "Hubo un problema al cargar los datos del usuario.",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const createUser = async () => {
    try {
      console.log("Creando usuario:", formData);
      
      // Validar datos antes de enviar
      if (!formData.email || !formData.password || !formData.name) {
        throw new Error("Todos los campos obligatorios deben ser completados");
      }
      
      // Create user in Auth
      const { data, error: authError } = await supabase.functions.invoke('createUser', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.name,
          role: formData.role,
          language: 'es'
        }
      });
      
      if (authError) {
        console.error("Error al crear usuario:", authError);
        throw authError;
      }
      
      toast.success("Usuario creado exitosamente", {
        description: "El nuevo usuario ha sido creado y ahora puede iniciar sesión.",
        duration: 3000,
      });
      
      navigate('/users');
    } catch (error) {
      console.error("Error al crear usuario:", error);
      
      let errorMessage = "Hubo un problema al crear el usuario. Por favor, inténtalo de nuevo.";
      
      // Mensajes de error más específicos según el tipo de error
      if (error.message?.includes("duplicate key")) {
        errorMessage = "Este correo electrónico ya está registrado. Por favor, utiliza otro.";
      }
      
      toast.error("Error al crear usuario", {
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  const updateUser = async () => {
    try {
      if (!formData.name) {
        throw new Error("El nombre es obligatorio");
      }
      
      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.name,
          role: formData.role,
          language: 'es', // Forzar español
        })
        .eq('id', id);
      
      if (profileError) throw profileError;
      
      // Update password if provided
      if (formData.password) {
        const { error: passwordError } = await supabase.functions.invoke('updateUserPassword', {
          body: { userId: id, password: formData.password }
        });
        
        if (passwordError) throw passwordError;
      }
      
      toast.success("Usuario actualizado exitosamente", {
        description: "La información del usuario ha sido actualizada.",
        duration: 3000,
      });
      
      // Recargar datos para mostrar los cambios actualizados
      if (isEditMode) {
        await fetchUserData();
      }
      
      navigate('/users');
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      toast.error("Error al actualizar usuario", {
        description: "Hubo un problema al actualizar el usuario. Por favor, inténtalo de nuevo.",
        duration: 5000,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isEditMode) {
        await updateUser();
      } else {
        await createUser();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => isEditMode ? fetchUserData() : navigate('/users')}>
          {isEditMode ? "Intentar de nuevo" : "Volver a la lista"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</CardTitle>
          <CardDescription>
            {isEditMode 
              ? 'Actualiza la información del usuario a continuación.' 
              : 'Completa los detalles para crear una nueva cuenta de usuario.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isEditMode} // El email no puede cambiarse en modo edición
              placeholder="usuario@ejemplo.com"
            />
          </div>
          
          <div>
            <Label htmlFor="password">
              {isEditMode ? 'Nueva Contraseña (dejar en blanco para mantener la actual)' : 'Contraseña'}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              required={!isEditMode} // Solo requerido en modo creación
              placeholder={isEditMode ? '••••••••' : 'Crea una contraseña segura'}
            />
          </div>
          
          <div>
            <Label htmlFor="name">Nombre Completo</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Juan Pérez"
            />
          </div>
          
          <div>
            <Label htmlFor="role">Rol</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleSelectChange('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="superAdmin">Super Administrador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="qualityAnalyst">Analista de Calidad</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="agent">Agente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/users')}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Procesando...' : isEditMode ? 'Actualizar Usuario' : 'Crear Usuario'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};
