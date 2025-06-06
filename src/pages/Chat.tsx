
import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import ChatInterface from "@/components/ai/ChatInterface";
import ChatHistory from "@/components/ai/ChatHistory";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const {
    isAuthenticated,
    loading
  } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Solo redirigir si no está autenticado y ya hemos verificado el estado (loading es false)
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Layout>
      <Routes>
        <Route path="/" element={
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Consulta tus Insights de Voz</h2>
              <p className="text-muted-foreground">Explora tus llamadas y obtén insights avanzados generados por la IA de Convertia.</p>
            </div>
            <ChatInterface />
          </div>
        } />
        <Route path="history" element={<ChatHistory />} />
      </Routes>
    </Layout>
  );
}
