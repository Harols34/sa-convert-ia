
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
import Settings from "@/pages/Settings";
import Layout from "@/components/layout/Layout";
import Index from "@/pages/Index";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Tipificaciones from "@/pages/Tipificaciones";
import Behaviors from "@/pages/Behaviors";
import ContractsPage from "@/pages/Contracts";
import RouteObserver from "@/components/layout/RouteObserver";

function App() {
  return (
    <Router>
      <AuthProvider>
        <RouteObserver />
        <AppContent />
      </AuthProvider>
    </Router>
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
      <Route path="/" element={<Layout><Index /></Layout>} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/calls" element={<Layout><Calls /></Layout>} />
      <Route path="/users" element={<Layout><Users /></Layout>} />
      <Route path="/prompts" element={<Layout><Prompts /></Layout>} />
      <Route path="/tipificaciones" element={<Layout><Tipificaciones /></Layout>} />
      <Route path="/behaviors" element={<Layout><Behaviors /></Layout>} />
      <Route path="/settings" element={<Layout><Settings /></Layout>} />
      <Route path="/contracts" element={<Layout><ContractsPage /></Layout>} />
    </Routes>
  );
}

export default App;
