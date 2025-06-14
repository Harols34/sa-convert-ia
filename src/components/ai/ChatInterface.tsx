
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedAccountId } = useAccount();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: `👋 ¡Hola! Soy tu asistente de análisis de llamadas de Convertia. 

${selectedAccountId && selectedAccountId !== 'all' 
  ? `Estoy trabajando con los datos de la cuenta seleccionada: ${selectedAccountId}` 
  : 'Tengo acceso a los datos de las cuentas que tienes disponibles.'}

Puedo ayudarte con:
• Análisis de calidad de llamadas
• Métricas de desempeño de agentes  
• Tendencias en resultados de ventas
• Feedback y recomendaciones de mejora

¿En qué puedo ayudarte hoy?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [selectedAccountId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      console.log('Sending message with account context:', selectedAccountId);
      
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: inputValue,
          context: "calls",
          accountId: selectedAccountId
        }
      });

      if (error) {
        console.error("Error calling AI chat function:", error);
        throw new Error(error.message || "Error al procesar la consulta");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Error in chat:", error);
      toast.error("Error al procesar tu consulta");
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto">
      {/* Account Context Indicator */}
      {selectedAccountId && selectedAccountId !== 'all' && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            🔍 Consultando datos de la cuenta: <strong>{selectedAccountId}</strong>
          </p>
        </div>
      )}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg mb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Asistente de ConvertIA</h3>
              <p className="text-muted-foreground">
                Tengo acceso a los datos de tus llamadas. Pregúntame sobre insights, tendencias y análisis.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white'}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    {message.role === 'assistant' && <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                    {message.role === 'user' && <User className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-white">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Analizando...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Escribe tu consulta sobre las llamadas..."
          className="flex-1 min-h-[60px] max-h-[120px] resize-none"
          disabled={isLoading}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          size="lg"
          className="px-4"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
