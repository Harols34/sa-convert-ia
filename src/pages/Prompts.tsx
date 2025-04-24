
import React, { useState, useEffect } from "react";
import { usePrompts, PromptType, Prompt } from "@/hooks/usePrompts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";

const PROMPT_TYPES: { label: string; value: PromptType }[] = [
  { label: "Resumen", value: "summary" },
  { label: "Feedback", value: "feedback" },
];

export default function PromptsPage() {
  const [selectedType, setSelectedType] = useState<PromptType>("summary");
  const { prompts, activePrompt, createPrompt, activatePrompt, updatePrompt, loading } = usePrompts(selectedType);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Get sidebar collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
    
    // Listen for changes to localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed') {
        setSidebarCollapsed(e.newValue === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newContent) return;
    await createPrompt({
      name: newName,
      content: newContent,
      type: selectedType,
      active: false,
    });
    setNewName("");
    setNewContent("");
  };

  const handleActivate = async (id: string) => {
    await activatePrompt(id);
  };

  const handleUpdate = async (id: string) => {
    await updatePrompt(id, { name: newName, content: newContent });
    setEditingId(null);
    setNewName("");
    setNewContent("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        <main className={`flex-1 p-4 md:p-6 transition-all duration-300 ${sidebarCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Prompts Personalizados</h2>
              <p className="text-muted-foreground">
                Crea y gestiona prompts para resúmenes y análisis de llamadas
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="mb-4 flex gap-2">
              {PROMPT_TYPES.map(({ label, value }) => (
                <Button
                  key={value}
                  variant={selectedType === value ? "default" : "outline"}
                  onClick={() => setSelectedType(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            
            <div className="bg-card p-4 rounded-lg shadow-sm border mb-6">
              <h3 className="font-medium text-lg mb-2">
                {editingId ? "Editar prompt" : "Crear nuevo prompt"}
              </h3>
              <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate(editingId); } : handleCreate }>
                <Input
                  placeholder="Nombre del prompt"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="mb-2"
                  required
                />
                <Textarea
                  placeholder="Contenido del prompt"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  rows={6}
                  className="mb-3"
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" className="mb-2">
                    {editingId ? "Actualizar prompt" : "Crear nuevo prompt"}
                  </Button>
                  {editingId && (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => { setEditingId(null); setNewName(""); setNewContent(""); }}
                      className="mb-2"
                    >
                      Cancelar edición
                    </Button>
                  )}
                </div>
              </form>
            </div>
            
            <h2 className="text-xl font-semibold mb-3">Prompts {selectedType === "summary" ? "de Resumen" : "de Feedback"} ({prompts.length})</h2>
            
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : prompts.length === 0 ? (
                <div className="text-center p-8 border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">No hay prompts disponibles. Crea uno nuevo.</p>
                </div>
              ) : (
                prompts.map((prompt) => (
                  <div key={prompt.id} className="border rounded-lg p-4 flex flex-col gap-2 bg-card">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{prompt.name}</span>
                      {prompt.active && (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          Activo
                        </Badge>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md overflow-auto max-h-40">
                      {prompt.content}
                    </pre>
                    <div className="flex gap-2 mt-1">
                      {!prompt.active && (
                        <Button size="sm" variant="outline" onClick={() => handleActivate(prompt.id)}>
                          Activar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(prompt.id);
                          setNewName(prompt.name);
                          setNewContent(prompt.content);
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'}`}>
        <Footer />
      </div>
    </div>
  );
}
