
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  email: z.string().email("Ingrese un correo electrónico válido").min(1, "El correo electrónico es requerido"),
  password: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  role: z.string().min(1, "El rol es requerido"),
  language: z.string().default("es"),
});

export default function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  const [isLoading, setIsLoading] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      role: 'agent',
      language: 'es',
    },
  });

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
      
      // First try to get the profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (profileError) {
        console.log("Error al obtener perfil o perfil no existe:", profileError.message);
        setProfileExists(false);
      } else {
        console.log("Datos de perfil obtenidos:", profileData);
        setProfileExists(true);
      }
      
      // Get user email from auth.users via admin function
      try {
        const { data, error } = await supabase.functions.invoke('getUserEmail', {
          body: { userId: id }
        });
        
        if (!error && data?.email) {
          setUserEmail(data.email);
          
          // Get user data from getAllUserEmails to get the role
          const { data: userData, error: userDataError } = await supabase.functions.invoke('getAllUserEmails', {
            body: { timestamp: new Date().getTime() }
          });
          
          if (!userDataError && userData?.userData && userData.userData[id]) {
            const user = userData.userData[id];
            console.log("Datos de usuario obtenidos del servidor:", user);
            
            // Update form with user data
            form.reset({
              email: user.email || data.email,
              password: '',
              name: profileData?.full_name || user.email.split('@')[0],
              role: profileData?.role || user.role || 'agent',
              language: profileData?.language || 'es',
            });
          } else {
            // Only use email if getAllUserEmails failed
            form.setValue("email", data.email);
          }
        } else {
          console.error("No se pudo obtener el email del usuario:", error);
          setError("No se pudo obtener el email del usuario.");
        }
      } catch (e) {
        console.error("Error al conectar con el servidor:", e);
        setError("Error al conectar con el servidor.");
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

  const createUser = async (values: z.infer<typeof formSchema>) => {
    try {
      console.log("Creando usuario:", values);
      
      // Validate password for new users
      if (!values.password) {
        throw new Error("La contraseña es obligatoria para crear un nuevo usuario");
      }
      
      // Create user in Auth
      const { data, error: authError } = await supabase.functions.invoke('createUser', {
        body: {
          email: values.email,
          password: values.password,
          fullName: values.name,
          role: values.role,
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

  const updateUser = async (values: z.infer<typeof formSchema>) => {
    try {
      console.log("Actualizando usuario:", values);
      
      if (profileExists) {
        // Update existing profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: values.name,
            role: values.role,
            language: 'es', // Forzar español
          })
          .eq('id', id);
        
        if (profileError) throw profileError;
      } else {
        // Create profile if it doesn't exist
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: id,
            full_name: values.name,
            role: values.role,
            language: 'es', // Forzar español
          });
        
        if (profileError) throw profileError;
      }
      
      // Update password if provided
      if (values.password) {
        const { error: passwordError } = await supabase.functions.invoke('updateUserPassword', {
          body: { userId: id, password: values.password }
        });
        
        if (passwordError) throw passwordError;
      }
      
      toast.success("Usuario actualizado exitosamente", {
        description: "La información del usuario ha sido actualizada.",
        duration: 3000,
      });
      
      // Reload data to show the updated values
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    try {
      if (isEditMode) {
        await updateUser(values);
      } else {
        await createUser(values);
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      disabled={isEditMode}
                      placeholder="usuario@ejemplo.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isEditMode ? 'Nueva Contraseña (dejar en blanco para mantener la actual)' : 'Contraseña'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder={isEditMode ? '••••••••' : 'Crea una contraseña segura'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Juan Pérez"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="superAdmin">Super Administrador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="qualityAnalyst">Analista de Calidad</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="agent">Agente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
    </Form>
  );
}
