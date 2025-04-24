
import { supabase } from "@/integrations/supabase/client";
import { Call, ChatMessage } from "@/lib/types";
import { toast } from 'sonner';

export async function loadChatHistory(callId: string): Promise<ChatMessage[]> {
  if (!callId) return [];

  try {
    // Use 'any' type for the initial response to avoid complex type inference
    const response: any = await supabase
      .from('chat_messages')
      .select('*')
      .eq('call_id', callId)
      .order('timestamp', { ascending: true });
    
    if (response.error) {
      console.error("Error loading chat history:", response.error);
      return [];
    }

    if (response.data && response.data.length > 0) {
      // Explicitly map the response to the ChatMessage type
      return response.data.map((msg: any) => ({
        id: msg.id,
        role: (msg.role === 'user' || msg.role === 'assistant') 
          ? msg.role as "user" | "assistant" 
          : "assistant", // Fallback to assistant if invalid role
        content: msg.content,
        timestamp: msg.timestamp,
        call_id: callId,
        user_id: msg.user_id
      }));
    }
    
    return [];
  } catch (e) {
    console.error("Error in loadChatHistory:", e);
    return [];
  }
}

export async function saveChatMessage(message: ChatMessage): Promise<boolean> {
  if (!message.call_id) return false;

  try {
    // Use 'any' type for the initial response to avoid complex type inference
    const response: any = await supabase
      .from('chat_messages')
      .insert({
        content: message.content,
        role: message.role,
        call_id: message.call_id,
        timestamp: new Date().toISOString(),
        user_id: message.user_id
      });
    
    if (response.error) {
      console.error("Error saving chat message:", response.error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error("Exception saving chat message:", e);
    return false;
  }
}

export async function sendMessageToAI(
  input: string, 
  messages: ChatMessage[], 
  call: Call
): Promise<string | null> {
  try {
    // Get call transcript
    let transcriptText = "";
    if (call.transcription) {
      try {
        const transcriptSegments = typeof call.transcription === 'string' 
          ? JSON.parse(call.transcription) 
          : call.transcription;
          
        if (Array.isArray(transcriptSegments)) {
          transcriptText = transcriptSegments.map(segment => {
            const speakerLabel = segment.speaker === "agent" 
              ? "Asesor: " 
              : segment.speaker === "client" 
              ? "Cliente: " 
              : "Silencio: ";
            return speakerLabel + segment.text;
          }).join('\n');
        } else {
          transcriptText = String(call.transcription);
        }
      } catch (error) {
        console.error("Error parsing transcript:", error);
        transcriptText = String(call.transcription);
      }
    }

    // Use 'any' type for the initial response to avoid complex type inference
    const response: any = await supabase.functions.invoke('ai-chat', {
      body: {
        message: input,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        context: {
          callId: call.id,
          transcription: transcriptText,
          callDate: call.date,
          agentName: call.agentName,
          result: call.result,
          summary: call.summary
        }
      }
    });
    
    if (response.error) {
      throw new Error(response.error.message || "Error al procesar tu pregunta");
    }

    return response.data?.response || null;
  } catch (error) {
    console.error("Error in chat:", error);
    toast.error("Error al procesar tu pregunta", {
      description: error instanceof Error ? error.message : "Inténtalo de nuevo más tarde"
    });
    return null;
  }
}
