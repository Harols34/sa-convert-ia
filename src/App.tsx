import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import Calls from "@/pages/Calls";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Users from "@/pages/Users";
import Prompts from "@/pages/Prompts";
import NewCall from "@/pages/NewCall";
import EditCall from "@/pages/EditCall";
import NewUser from "@/pages/NewUser";
import EditUser from "@/pages/EditUser";
import NewPrompt from "@/pages/NewPrompt";
import EditPrompt from "@/pages/EditPrompt";
import Settings from "@/pages/Settings";
import Layout from "@/components/layout/Layout";
import Index from "@/pages/Index";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import NewTipificacion from "@/pages/NewTipificacion";
import EditTipificacion from "@/pages/EditTipificacion";
import Tipificaciones from "@/pages/Tipificaciones";
import Behaviors from "@/pages/Behaviors";
import NewBehavior from "@/pages/NewBehavior";
import EditBehavior from "@/pages/EditBehavior";
import CallDetail from "@/pages/CallDetail";
import ContractsPage from "@/pages/Contracts";

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated && !loading) {
        toast.error("Sesión expirada", {
          description: "Por favor inicia sesión para continuar",
        });
        navigate("/login", { replace: true });
        return false;
      }
      setIsLoading(false);
      return true;
    };

    const timer = setTimeout(() => {
      checkAuth();
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, navigate]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Index />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calls" element={<Calls />} />
        <Route path="/calls/new" element={<NewCall />} />
        <Route path="/calls/:id" element={<CallDetail />} />
        <Route path="/calls/edit/:id" element={<EditCall />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/new" element={<NewUser />} />
        <Route path="/users/edit/:id" element={<EditUser />} />
        <Route path="/prompts" element={<Prompts />} />
        <Route path="/prompts/new" element={<NewPrompt />} />
        <Route path="/prompts/edit/:id" element={<EditPrompt />} />
        <Route path="/tipificaciones" element={<Tipificaciones />} />
        <Route path="/tipificaciones/new" element={<NewTipificacion />} />
        <Route path="/tipificaciones/edit/:id" element={<EditTipificacion />} />
        <Route path="/behaviors" element={<Behaviors />} />
        <Route path="/behaviors/new" element={<NewBehavior />} />
        <Route path="/behaviors/edit/:id" element={<EditBehavior />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/contracts" element={<ContractsPage />} />
      </Route>
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
