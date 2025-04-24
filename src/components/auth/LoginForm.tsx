
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface LoginFormProps {
  language?: string;
}

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "El correo es obligatorio" })
    .email({ message: "Ingresa un correo válido" }),
  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm({ language = "es" }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUserSession } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      if (data.session) {
        console.log("Login successful, session established");
        
        // Refresh authentication context
        await refreshUserSession();
        
        // Load user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
        }

        // Store user session
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + data.session.expires_in
        }));

        // Redirect to app
        const lastPath = localStorage.getItem('lastPath');
        const validLastPath = lastPath && 
                            lastPath !== '/login' && 
                            lastPath !== '/' && 
                            !lastPath.includes('undefined');
        
        if (validLastPath) {
          console.log("Redirecting to last path:", lastPath);
          localStorage.removeItem('lastPath');
          navigate(lastPath);
        } else {
          console.log("Redirecting to dashboard");
          navigate("/dashboard");
        }

        toast.success(language === "es" ? "Inicio de sesión exitoso" : "Login successful");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(
        language === "es"
          ? "Error al iniciar sesión: " + (error.message || "Credenciales incorrectas")
          : "Login error: " + (error.message || "Invalid credentials")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {language === "es" ? "Correo Electrónico" : "Email"}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={
                    language === "es" ? "tu@correo.com" : "your@email.com"
                  }
                  type="email"
                  autoComplete="email"
                  {...field}
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
                {language === "es" ? "Contraseña" : "Password"}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          {language === "es" ? "Iniciar Sesión" : "Sign In"}
        </Button>
      </form>
    </Form>
  );
}
