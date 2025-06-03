
import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import UserList from "@/components/users/UserList";
import UserForm from "@/components/users/UserForm";
import { ArrowLeft } from "lucide-react";

export default function UsersPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Usuarios</h2>
                  <p className="text-muted-foreground">
                    Crear y administrar usuarios del sistema
                  </p>
                </div>
              </div>
              <UserList />
            </>
          }
        />
        <Route
          path="/new"
          element={
            <>
              <div className="flex items-center mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/users")}
                  className="mr-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                </Button>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Crear Usuario</h2>
                  <p className="text-muted-foreground">
                    Agregar un nuevo usuario al sistema
                  </p>
                </div>
              </div>
              <UserForm />
            </>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <>
              <div className="flex items-center mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/users")}
                  className="mr-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                </Button>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Editar Usuario</h2>
                  <p className="text-muted-foreground">
                    Modificar detalles y permisos del usuario
                  </p>
                </div>
              </div>
              <UserForm />
            </>
          }
        />
      </Routes>
    </Layout>
  );
}
