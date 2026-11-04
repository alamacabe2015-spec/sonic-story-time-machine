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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          description: string
          icon: string
          name: string
          sort: number
        }
        Insert: {
          code: string
          description: string
          icon: string
          name: string
          sort: number
        }
        Update: {
          code?: string
          description?: string
          icon?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee: string
          created_at: string
          id: string
          requester: string
          status: string
        }
        Insert: {
          addressee: string
          created_at?: string
          id?: string
          requester: string
          status?: string
        }
        Update: {
          addressee?: string
          created_at?: string
          id?: string
          requester?: string
          status?: string
        }
        Relationships: []
      }
      game_wallets: {
        Row: {
          coins: number
          user_id: string
        }
        Insert: {
          coins?: number
          user_id: string
        }
        Update: {
          coins?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_wallet_profile"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          receiver: string
          sender: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          receiver: string
          sender: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          receiver?: string
          sender?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          fetched_at: string
          id: string
          published_at: string
          source: string | null
          summary: string
          title: string
          url: string | null
        }
        Insert: {
          fetched_at?: string
          id?: string
          published_at?: string
          source?: string | null
          summary: string
          title: string
          url?: string | null
        }
        Update: {
          fetched_at?: string
          id?: string
          published_at?: string
          source?: string | null
          summary?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      owned_cosmetics: {
        Row: {
          cosmetic_id: string
          user_id: string
        }
        Insert: {
          cosmetic_id: string
          user_id: string
        }
        Update: {
          cosmetic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owned_cosmetics_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "sonic_cosmetics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owned_cosmetics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owned_titles: {
        Row: {
          title_id: string
          user_id: string
        }
        Insert: {
          title_id: string
          user_id: string
        }
        Update: {
          title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owned_title_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owned_titles_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "sonic_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_cosmetic: string | null
          avatar_url: string | null
          background_cosmetic: string | null
          bio: string
          created_at: string
          display_name: string
          equipped_title: string | null
          id: string
          name_color: string | null
          name_font: string | null
          username: string
        }
        Insert: {
          avatar_cosmetic?: string | null
          avatar_url?: string | null
          background_cosmetic?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          equipped_title?: string | null
          id: string
          name_color?: string | null
          name_font?: string | null
          username: string
        }
        Update: {
          avatar_cosmetic?: string | null
          avatar_url?: string | null
          background_cosmetic?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          equipped_title?: string | null
          id?: string
          name_color?: string | null
          name_font?: string | null
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          answer: number
          difficulty: string
          explanation: string
          id: string
          image_key: string | null
          options: Json
          prompt: string
        }
        Insert: {
          answer: number
          difficulty?: string
          explanation: string
          id: string
          image_key?: string | null
          options: Json
          prompt: string
        }
        Update: {
          answer?: number
          difficulty?: string
          explanation?: string
          id?: string
          image_key?: string | null
          options?: Json
          prompt?: string
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          correct: number
          created_at: string
          id: string
          mode: string
          position: number
          question_ids: string[]
          reward: number
          user_id: string
        }
        Insert: {
          correct?: number
          created_at?: string
          id?: string
          mode?: string
          position?: number
          question_ids: string[]
          reward?: number
          user_id: string
        }
        Update: {
          correct?: number
          created_at?: string
          id?: string
          mode?: string
          position?: number
          question_ids?: string[]
          reward?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_session_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sonic_cosmetics: {
        Row: {
          category: string
          id: string
          name: string
          price: number
          rarity: string
        }
        Insert: {
          category: string
          id: string
          name: string
          price: number
          rarity?: string
        }
        Update: {
          category?: string
          id?: string
          name?: string
          price?: number
          rarity?: string
        }
        Relationships: []
      }
      sonic_titles: {
        Row: {
          character: string
          id: string
          name: string
          price: number
          rarity: string
        }
        Insert: {
          character: string
          id: string
          name: string
          price: number
          rarity: string
        }
        Update: {
          character?: string
          id?: string
          name?: string
          price?: number
          rarity?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          code: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          code: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          code?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          chaos_played: number
          coins_earned: number
          correct_answers: number
          easy_played: number
          hard_played: number
          messages_sent: number
          news_read: number
          normal_played: number
          perfect_rounds: number
          purchases: number
          quizzes_played: number
          stickers_sent: number
          updated_at: string
          user_id: string
          years_visited: number[]
        }
        Insert: {
          chaos_played?: number
          coins_earned?: number
          correct_answers?: number
          easy_played?: number
          hard_played?: number
          messages_sent?: number
          news_read?: number
          normal_played?: number
          perfect_rounds?: number
          purchases?: number
          quizzes_played?: number
          stickers_sent?: number
          updated_at?: string
          user_id: string
          years_visited?: number[]
        }
        Update: {
          chaos_played?: number
          coins_earned?: number
          correct_answers?: number
          easy_played?: number
          hard_played?: number
          messages_sent?: number
          news_read?: number
          normal_played?: number
          perfect_rounds?: number
          purchases?: number
          quizzes_played?: number
          stickers_sent?: number
          updated_at?: string
          user_id?: string
          years_visited?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      year_news: {
        Row: {
          created_at: string
          items: Json
          year: number
        }
        Insert: {
          created_at?: string
          items: Json
          year: number
        }
        Update: {
          created_at?: string
          items?: Json
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      answer_sonic_quiz: {
        Args: { choice: number; expected_position: number; session_id: string }
        Returns: Json
      }
      check_achievements: { Args: never; Returns: string[] }
      equip_sonic_cosmetic: {
        Args: { item_id: string; kind: string }
        Returns: undefined
      }
      equip_sonic_title: {
        Args: { title_id_input: string }
        Returns: undefined
      }
      record_stat: {
        Args: { p_amount?: number; p_stat: string; p_year?: number }
        Returns: undefined
      }
      redeem_sonic_cosmetic: { Args: { item_id: string }; Returns: number }
      redeem_sonic_title: { Args: { title_id_input: string }; Returns: number }
      start_sonic_quiz: { Args: never; Returns: Json }
      start_sonic_quiz_mode: { Args: { selected_mode: string }; Returns: Json }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
