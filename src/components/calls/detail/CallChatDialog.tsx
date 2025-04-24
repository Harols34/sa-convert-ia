
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChatMessage, Call } from "@/lib/types";
import { ChatMessageList } from "./ChatMessageList";
import { MessageInput } from "@/components/ui/message-input";
import { useUser } from "@/hooks/useUser";
import { loadChatHistory, saveChatMessage, sendMessageToAI } from "./chatService";
import { toast } from "sonner";

interface CallChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: Call;
}

export default function CallChatDialog({ open, onOpenChange, call }: CallChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  
  // Load chat history when dialog opens
  useEffect(() => {
    if (open && call.id) {
      loadChatMessages();
    }
  }, [open, call.id]);
  
  const loadChatMessages = async () => {
    if (!call.id) return;
    
    try {
      const history = await loadChatHistory(call.id);
      setMessages(history);
      
      // If no welcome message and no history, add a welcome message
      if (history.length === 0) {
        const initialMessage: ChatMessage = {
          id: "welcome",
          role: "assistant",
          content: `👋 Hola, soy tu asistente para analizar la llamada "${call.title}". ¿En qué puedo ayudarte? Puedes preguntarme sobre el contenido de la llamada, el desempeño del asesor, o solicitar un análisis específico.`,
          timestamp: new Date().toISOString(),
          call_id: call.id
        };
        
        setMessages([initialMessage]);
        await saveChatMessage(initialMessage);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      toast.error("Error cargando el historial de chat");
    }
  };
  
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading || !call.id) return;
    
    // Clear input right away for better UX
    setInputValue("");
    setIsLoading(true);
    
    try {
      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
        call_id: call.id,
        user_id: user?.id
      };
      
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      
      // Save user message to database
      await saveChatMessage(userMessage);
      
      // Get AI response
      const aiResponse = await sendMessageToAI(message, updatedMessages, call);
      
      if (aiResponse) {
        // Create AI message
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: aiResponse,
          timestamp: new Date().toISOString(),
          call_id: call.id
        };
        
        // Update UI with AI response
        setMessages([...updatedMessages, aiMessage]);
        
        // Save AI message to database
        await saveChatMessage(aiMessage);
      } else {
        toast.error("No se pudo obtener respuesta del asistente");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error enviando el mensaje");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat de consulta sobre la llamada</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <ChatMessageList messages={messages} isLoading={isLoading} />
          
          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            placeholder="Escribe tu consulta sobre la llamada..."
            disabled={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
