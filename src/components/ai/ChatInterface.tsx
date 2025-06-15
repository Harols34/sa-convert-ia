import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";
import { useUser } from "@/hooks/useUser";

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
  const { user } = useUser();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar historial de chat al montar el componente
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      // Calcular fecha de hace 15 días
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', fifteenDaysAgo.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        console.error("Error loading chat history:", error);
        return;
      }

      if (data && data.length > 0) {
        const chatMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const saveChatMessage = async (message: Message) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          content: message.content,
          role: message.role,
          user_id: user.id,
          timestamp: message.timestamp.toISOString(),
          account_id: selectedAccountId
        });

      if (error) {
        console.error("Error saving chat message:", error);
      }
    } catch (error) {
      console.error("Error saving chat message:", error);
    }
  };

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

    // Guardar mensaje del usuario
    await saveChatMessage(userMessage);

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

      // Guardar respuesta del asistente
      await saveChatMessage(assistantMessage);

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
      await saveChatMessage(errorMessage);
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
    <div className="flex flex-col h-full w-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50 rounded-lg mb-3 sm:mb-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[300px] sm:min-h-[400px]">
            <div className="text-center px-4">
              <Bot className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
              <h3 className="text-base sm:text-lg font-medium mb-2">Asistente de ConvertIA</h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
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
              <Card className={`max-w-[85%] sm:max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white'}`}>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-start gap-2">
                    {message.role === 'assistant' && <Bot className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />}
                    {message.role === 'user' && <User className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed break-words">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-1 sm:mt-2 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
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
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Analizando...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2 p-2 sm:p-0">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Escribe tu consulta sobre las llamadas..."
          className="flex-1 min-h-[50px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] resize-none text-sm sm:text-base"
          disabled={isLoading}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          size="lg"
          className="px-3 sm:px-4 h-auto min-h-[50px] sm:min-h-[60px]"
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
