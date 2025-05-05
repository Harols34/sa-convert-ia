export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string | null
          id: string
          join_date: string
          name: string
          status: string
          supervisor: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          join_date?: string
          name: string
          status?: string
          supervisor?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          join_date?: string
          name?: string
          status?: string
          supervisor?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      behaviors: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          prompt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      call_chat_messages: {
        Row: {
          call_id: string
          content: string
          id: string
          role: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          call_id: string
          content: string
          id?: string
          role: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          call_id?: string
          content?: string
          id?: string
          role?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_chat_messages_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_id: string | null
          agent_name: string
          audio_url: string
          created_at: string
          date: string
          duration: number
          entities: string[] | null
          filename: string
          id: string
          product: string | null
          progress: number
          reason: string | null
          result: string | null
          sentiment: string | null
          speaker_analysis: Json | null
          status: string
          status_summary: string | null
          summary: string | null
          tipificacion_id: string | null
          title: string
          topics: string[] | null
          transcription: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          agent_name: string
          audio_url: string
          created_at?: string
          date?: string
          duration?: number
          entities?: string[] | null
          filename: string
          id?: string
          product?: string | null
          progress?: number
          reason?: string | null
          result?: string | null
          sentiment?: string | null
          speaker_analysis?: Json | null
          status?: string
          status_summary?: string | null
          summary?: string | null
          tipificacion_id?: string | null
          title: string
          topics?: string[] | null
          transcription?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string
          audio_url?: string
          created_at?: string
          date?: string
          duration?: number
          entities?: string[] | null
          filename?: string
          id?: string
          product?: string | null
          progress?: number
          reason?: string | null
          result?: string | null
          sentiment?: string | null
          speaker_analysis?: Json | null
          status?: string
          status_summary?: string | null
          summary?: string | null
          tipificacion_id?: string | null
          title?: string
          topics?: string[] | null
          transcription?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_tipificacion_id_fkey"
            columns: ["tipificacion_id"]
            isOneToOne: false
            referencedRelation: "tipificaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          call_id: string | null
          content: string
          id: string
          role: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          call_id?: string | null
          content: string
          id?: string
          role: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          call_id?: string | null
          content?: string
          id?: string
          role?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          behaviors_analysis: Json | null
          call_id: string
          created_at: string
          entities: string[] | null
          id: string
          negative: string[] | null
          opportunities: string[] | null
          positive: string[] | null
          score: number
          sentiment: string | null
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          behaviors_analysis?: Json | null
          call_id: string
          created_at?: string
          entities?: string[] | null
          id?: string
          negative?: string[] | null
          opportunities?: string[] | null
          positive?: string[] | null
          score?: number
          sentiment?: string | null
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          behaviors_analysis?: Json | null
          call_id?: string
          created_at?: string
          entities?: string[] | null
          id?: string
          negative?: string[] | null
          opportunities?: string[] | null
          positive?: string[] | null
          score?: number
          sentiment?: string | null
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          biography: string | null
          created_at: string
          full_name: string | null
          id: string
          language: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          biography?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          language?: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          biography?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          active: boolean
          content: string
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tipificaciones: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          analysis_model: string | null
          auto_feedback: boolean | null
          created_at: string | null
          id: string
          keyword_spotting: boolean | null
          language: string | null
          min_silence_duration: number | null
          noise_filter: boolean | null
          normalize: boolean | null
          notifications: Json | null
          openai_key: string | null
          punctuation: boolean | null
          sentiment_analysis: boolean | null
          silence_detection: boolean | null
          silence_threshold: number | null
          speaker_diarization: boolean | null
          speed_detection: boolean | null
          timestamps: boolean | null
          transcription_model: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_model?: string | null
          auto_feedback?: boolean | null
          created_at?: string | null
          id?: string
          keyword_spotting?: boolean | null
          language?: string | null
          min_silence_duration?: number | null
          noise_filter?: boolean | null
          normalize?: boolean | null
          notifications?: Json | null
          openai_key?: string | null
          punctuation?: boolean | null
          sentiment_analysis?: boolean | null
          silence_detection?: boolean | null
          silence_threshold?: number | null
          speaker_diarization?: boolean | null
          speed_detection?: boolean | null
          timestamps?: boolean | null
          transcription_model?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_model?: string | null
          auto_feedback?: boolean | null
          created_at?: string | null
          id?: string
          keyword_spotting?: boolean | null
          language?: string | null
          min_silence_duration?: number | null
          noise_filter?: boolean | null
          normalize?: boolean | null
          notifications?: Json | null
          openai_key?: string | null
          punctuation?: boolean | null
          sentiment_analysis?: boolean | null
          silence_detection?: boolean | null
          silence_threshold?: number | null
          speaker_diarization?: boolean | null
          speed_detection?: boolean | null
          timestamps?: boolean | null
          transcription_model?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crear_comportamiento: {
        Args: {
          p_name: string
          p_description: string
          p_prompt: string
          p_is_active: boolean
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
