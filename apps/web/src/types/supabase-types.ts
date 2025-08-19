export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          model_config: Json | null
          model_provider: string | null
          model_used: string | null
          parts: Json
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id: string
          metadata?: Json | null
          model_config?: Json | null
          model_provider?: string | null
          model_used?: string | null
          parts?: Json
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_config?: Json | null
          model_provider?: string | null
          model_used?: string | null
          parts?: Json
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          branched_from_message_id: string | null
          branched_from_session_id: string | null
          created_at: string | null
          id: string
          is_pinned: boolean
          is_public: boolean | null
          metadata: Json | null
          share_slug: string | null
          system_prompt: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branched_from_message_id?: string | null
          branched_from_session_id?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean
          is_public?: boolean | null
          metadata?: Json | null
          share_slug?: string | null
          system_prompt?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branched_from_message_id?: string | null
          branched_from_session_id?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean
          is_public?: boolean | null
          metadata?: Json | null
          share_slug?: string | null
          system_prompt?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_branched_from_session_id_fkey"
            columns: ["branched_from_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_branched_from_message"
            columns: ["branched_from_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_stream_ids: {
        Row: {
          cancelled: boolean | null
          chat_id: string
          complete: boolean | null
          created_at: string | null
          id: string
          stream_id: string
        }
        Insert: {
          cancelled?: boolean | null
          chat_id: string
          complete?: boolean | null
          created_at?: string | null
          id?: string
          stream_id: string
        }
        Update: {
          cancelled?: boolean | null
          chat_id?: string
          complete?: boolean | null
          created_at?: string | null
          id?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_stream_ids_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_images: {
        Row: {
          created_at: string | null
          file_path: string
          id: string
          message_id: string
          prompt: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_path: string
          id?: string
          message_id: string
          prompt: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_path?: string
          id?: string
          message_id?: string
          prompt?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_message"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_server_headers: {
        Row: {
          created_at: string | null
          id: string
          key: string
          server_id: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          server_id: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          server_id?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_server_headers_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_servers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          transport: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          transport: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          transport?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      message_summaries: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          session_id: string
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          session_id: string
          summary: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          session_id?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_summaries_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_usage_logs: {
        Row: {
          completion_tokens: number
          created_at: string | null
          id: string
          model_id: string
          prompt_tokens: number
          provider: string
          session_id: string
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens: number
          created_at?: string | null
          id?: string
          model_id: string
          prompt_tokens: number
          provider: string
          session_id: string
          total_tokens: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string | null
          id?: string
          model_id?: string
          prompt_tokens?: number
          provider?: string
          session_id?: string
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_usage_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          has_completed_onboarding: boolean | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          has_completed_onboarding?: boolean | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          has_completed_onboarding?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      branch_chat_session: {
        Args: {
          p_branch_from_message_id: string
          p_new_title?: string
          p_original_session_id: string
        }
        Returns: string
      }
      generate_share_slug: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_branch_ancestry: {
        Args: { p_session_id: string }
        Returns: {
          created_at: string
          level: number
          session_id: string
          title: string
        }[]
      }
      get_session_branches: {
        Args: { p_session_id: string }
        Returns: {
          branch_created_at: string
          branch_id: string
          branch_point_message: Json
          branch_point_time: string
          branch_title: string
        }[]
      }
      get_usage_stats: {
        Args: {
          end_date_filter?: string
          model_id_filter?: string
          provider_filter?: string
          start_date_filter?: string
        }
        Returns: {
          total_completion_tokens: number
          total_prompt_tokens: number
          total_requests: number
          total_tokens: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      search_user_sessions: {
        Args: { p_search_term: string }
        Returns: {
          branched_from_message_id: string | null
          branched_from_session_id: string | null
          created_at: string | null
          id: string
          is_pinned: boolean
          is_public: boolean | null
          metadata: Json | null
          share_slug: string | null
          system_prompt: string | null
          title: string
          updated_at: string | null
          user_id: string
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
