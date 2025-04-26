
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Bot } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

const EXAMPLE_QUESTIONS = [
  "¿Cuántas llamadas se han registrado en total?",
  "¿Cuál es el promedio de duración de las llamadas?",
  "¿Qué títulos de llamadas son más frecuentes?",
  "¿Cuáles son los productos más mencionados?",
  "¿Cuáles son los motivos más comunes de las llamadas?",
  "¿Qué tendencias puedes identificar en las llamadas?",
  "¿Cuál es el sentimiento general de las interacciones?",
  "¿Qué agentes tienen los mejores resultados?",
  "¿Hay llamadas con retroalimentación negativa?",
  "¿Cuáles son las quejas más recurrentes?"
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("general-chat", {
        body: { 
          query: input.trim(),
          userId: user?.id,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
      });

      if (error) throw error;

      if (data && data.response) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: data.response,
          role: "assistant",
          timestamp: new Date(),
        };
        
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
        
        // Save chat history
        await supabase.from("chat_messages").insert([{
          user_id: user?.id,
          content: userMessage.content,
          role: userMessage.role,
          timestamp: new Date().toISOString(),
        }]);

        await supabase.from("chat_messages").insert([{
          user_id: user?.id,
          content: data.response,
          role: "assistant",
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error al enviar el mensaje");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      <Card className="flex-1 overflow-y-auto p-4 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Bot size={48} className="text-primary mb-4" />
            <h3 className="text-xl font-medium">Asistente de ConvertIA</h3>
            <p className="text-muted-foreground mt-2 max-w-md mb-6">
              Tengo acceso a los datos de tus llamadas. Pregúntame sobre insights, tendencias y análisis.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              {EXAMPLE_QUESTIONS.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start text-left h-auto py-2 px-3"
                  onClick={() => {
                    setInput(question);
                  }}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-green-600 text-white"
                      : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 text-right mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>

      <div className="relative">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje..."
          className="resize-none pr-12"
          rows={3}
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="absolute right-2 bottom-2 bg-green-600 hover:bg-green-700"
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
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
