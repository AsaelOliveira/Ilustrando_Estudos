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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      duels: {
        Row: {
          id: string
          challenger_id: string
          challenged_id: string | null
          mode: string
          visibility: string
          status: string
          challenger_display_name: string
          challenger_display_turma: string | null
          question_ids: Json
          turma_id: string
          discipline_id: string | null
          interclass: boolean
          num_questions: number
          time_limit: number
          challenger_answers: Json | null
          challenger_score: number
          challenger_time_seconds: number | null
          challenger_anti_cheat: Json | null
          challenged_answers: Json | null
          challenged_score: number
          challenged_time_seconds: number | null
          challenged_anti_cheat: Json | null
          winner_id: string | null
          created_at: string
          challenger_finished_at: string | null
          challenged_finished_at: string | null
          expires_at: string
        }
        Insert: {
          id?: string
          challenger_id: string
          challenged_id?: string | null
          mode?: string
          visibility?: string
          status?: string
          challenger_display_name: string
          challenger_display_turma?: string | null
          question_ids?: Json
          turma_id: string
          discipline_id?: string | null
          interclass?: boolean
          num_questions?: number
          time_limit?: number
          challenger_answers?: Json | null
          challenger_score?: number
          challenger_time_seconds?: number | null
          challenger_anti_cheat?: Json | null
          challenged_answers?: Json | null
          challenged_score?: number
          challenged_time_seconds?: number | null
          challenged_anti_cheat?: Json | null
          winner_id?: string | null
          created_at?: string
          challenger_finished_at?: string | null
          challenged_finished_at?: string | null
          expires_at?: string
        }
        Update: {
          id?: string
          challenger_id?: string
          challenged_id?: string | null
          mode?: string
          visibility?: string
          status?: string
          challenger_display_name?: string
          challenger_display_turma?: string | null
          question_ids?: Json
          turma_id?: string
          discipline_id?: string | null
          interclass?: boolean
          num_questions?: number
          time_limit?: number
          challenger_answers?: Json | null
          challenger_score?: number
          challenger_time_seconds?: number | null
          challenger_anti_cheat?: Json | null
          challenged_answers?: Json | null
          challenged_score?: number
          challenged_time_seconds?: number | null
          challenged_anti_cheat?: Json | null
          winner_id?: string | null
          created_at?: string
          challenger_finished_at?: string | null
          challenged_finished_at?: string | null
          expires_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
        activity_results: {
          Row: {
            acertos: number
            counts_for_points: boolean
            created_at: string
            disciplina_id: string
            id: string
            tema_id: string
          tipo: string
          total: number
          turma_id: string
          user_id: string
        }
          Insert: {
            acertos: number
            counts_for_points?: boolean
            created_at?: string
            disciplina_id: string
            id?: string
            tema_id: string
          tipo: string
          total: number
          turma_id: string
          user_id: string
        }
          Update: {
            acertos?: number
            counts_for_points?: boolean
            created_at?: string
            disciplina_id?: string
            id?: string
            tema_id?: string
          tipo?: string
          total?: number
          turma_id?: string
          user_id?: string
        }
        Relationships: []
      }
      mission_attempts: {
        Row: {
          anti_cheat_flags: Json | null
          completed_at: string
          correct_answers: number
          id: string
          mission_date: string
          score: number
          time_spent_seconds: number | null
          total_questions: number
          turma_id: string
          user_id: string
        }
        Insert: {
          anti_cheat_flags?: Json | null
          completed_at?: string
          correct_answers?: number
          id?: string
          mission_date?: string
          score?: number
          time_spent_seconds?: number | null
          total_questions?: number
          turma_id: string
          user_id: string
        }
        Update: {
          anti_cheat_flags?: Json | null
          completed_at?: string
          correct_answers?: number
          id?: string
          mission_date?: string
          score?: number
          time_spent_seconds?: number | null
          total_questions?: number
          turma_id?: string
          user_id?: string
        }
        Relationships: []
      }
      photo_change_requests: {
        Row: {
          created_at: string
          id: string
          new_avatar_url: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_avatar_url: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_avatar_url?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_shop_spent: number
          avatar_locked: boolean
          avatar_style: Json
          avatar_unlocks: Json
          avatar_url: string | null
          created_at: string
          id: string
          login_identifier: string | null
          nome: string
          turma_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_shop_spent?: number
          avatar_locked?: boolean
          avatar_style?: Json
          avatar_unlocks?: Json
          avatar_url?: string | null
          created_at?: string
          id?: string
          login_identifier?: string | null
          nome: string
          turma_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_shop_spent?: number
          avatar_locked?: boolean
          avatar_style?: Json
          avatar_unlocks?: Json
          avatar_url?: string | null
          created_at?: string
          id?: string
          login_identifier?: string | null
          nome?: string
          turma_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_scores: {
        Row: {
          created_at: string
          id: string
          last_mission_date: string | null
          missions_completed: number
          points: number
          streak_days: number
          turma_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_mission_date?: string | null
          missions_completed?: number
          points?: number
          streak_days?: number
          turma_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_mission_date?: string | null
          missions_completed?: number
          points?: number
          streak_days?: number
          turma_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      professor_turmas: {
        Row: {
          created_at: string
          id: string
          turma_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          turma_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          turma_id?: string
          user_id?: string
        }
        Relationships: []
      }
      professor_assignments: {
        Row: {
          created_at: string
          disciplina_id: string
          id: string
          turma_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disciplina_id: string
          id?: string
          turma_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          disciplina_id?: string
          id?: string
          turma_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_duel: {
        Args: {
          p_duel_id: string
        }
        Returns: Database["public"]["Tables"]["duels"]["Row"]
      }
      admin_reset_student_progress: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      cancel_duel: {
        Args: {
          p_duel_id: string
        }
        Returns: Database["public"]["Tables"]["duels"]["Row"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      finalize_duel: {
        Args: {
          p_duel_id: string
        }
        Returns: undefined
      }
      submit_daily_mission: {
        Args: {
          p_answers: string[]
          p_anti_cheat_flags?: Json
          p_question_ids: string[]
          p_time_spent_seconds?: number
          p_turma_id: string
        }
        Returns: Json
      }
      resolve_login_email: {
        Args: {
          p_identifier: string
        }
        Returns: string | null
      }
      submit_duel_attempt: {
        Args: {
          p_answers: string[]
          p_anti_cheat_flags?: Json
          p_duel_id: string
          p_time_spent_seconds?: number
        }
        Returns: Database["public"]["Tables"]["duels"]["Row"]
      }
    }
    Enums: {
      app_role: "admin" | "professor" | "coordenadora" | "aluno"
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
    Enums: {
      app_role: ["admin", "professor", "coordenadora", "aluno"],
    },
  },
} as const
