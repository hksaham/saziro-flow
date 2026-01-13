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
      coachings: {
        Row: {
          created_at: string
          id: string
          invite_token: string
          name: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_token?: string
          name: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_token?: string
          name?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_test_attempts: {
        Row: {
          coaching_id: string
          completed_at: string
          daily_test_id: string
          id: string
          performance_id: string | null
          test_date: string
          user_id: string
        }
        Insert: {
          coaching_id: string
          completed_at?: string
          daily_test_id: string
          id?: string
          performance_id?: string | null
          test_date?: string
          user_id: string
        }
        Update: {
          coaching_id?: string
          completed_at?: string
          daily_test_id?: string
          id?: string
          performance_id?: string | null
          test_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_test_attempts_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coachings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_test_attempts_daily_test_id_fkey"
            columns: ["daily_test_id"]
            isOneToOne: false
            referencedRelation: "daily_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_test_attempts_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "mcq_performance"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tests: {
        Row: {
          coaching_id: string
          created_at: string
          id: string
          mcq_set_id: string
          question_ids: Json
          test_date: string
        }
        Insert: {
          coaching_id: string
          created_at?: string
          id?: string
          mcq_set_id: string
          question_ids: Json
          test_date?: string
        }
        Update: {
          coaching_id?: string
          created_at?: string
          id?: string
          mcq_set_id?: string
          question_ids?: Json
          test_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tests_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coachings"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_performance: {
        Row: {
          coaching_id: string | null
          correct_answers: number
          created_at: string
          id: string
          mode: string
          score_percentage: number
          time_taken_seconds: number
          total_questions: number
          user_id: string
          wrong_answers: number
          xp_earned: number
        }
        Insert: {
          coaching_id?: string | null
          correct_answers: number
          created_at?: string
          id?: string
          mode: string
          score_percentage: number
          time_taken_seconds?: number
          total_questions: number
          user_id: string
          wrong_answers: number
          xp_earned?: number
        }
        Update: {
          coaching_id?: string | null
          correct_answers?: number
          created_at?: string
          id?: string
          mode?: string
          score_percentage?: number
          time_taken_seconds?: number
          total_questions?: number
          user_id?: string
          wrong_answers?: number
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "mcq_performance_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coachings"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_wrong_answers: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          mode: string | null
          options: Json
          performance_id: string | null
          question_text: string
          selected_answer: string
          subject: string | null
          user_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          mode?: string | null
          options: Json
          performance_id?: string | null
          question_text: string
          selected_answer: string
          subject?: string | null
          user_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          mode?: string | null
          options?: Json
          performance_id?: string | null
          question_text?: string
          selected_answer?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcq_wrong_answers_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "mcq_performance"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_attempts: {
        Row: {
          attempt_date: string
          coaching_id: string | null
          created_at: string
          id: string
          performance_id: string | null
          set_number: number
          user_id: string
        }
        Insert: {
          attempt_date?: string
          coaching_id?: string | null
          created_at?: string
          id?: string
          performance_id?: string | null
          set_number: number
          user_id: string
        }
        Update: {
          attempt_date?: string
          coaching_id?: string | null
          created_at?: string
          id?: string
          performance_id?: string | null
          set_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_attempts_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coachings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_attempts_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "mcq_performance"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          coaching_id: string | null
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          student_status: Database["public"]["Enums"]["student_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coaching_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          student_status?: Database["public"]["Enums"]["student_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coaching_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          student_status?: Database["public"]["Enums"]["student_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coachings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          coaching_id: string | null
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coaching_id?: string | null
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coaching_id?: string | null
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coachings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_coaching_id: { Args: never; Returns: string }
      get_my_user_id: { Args: never; Returns: string }
      get_user_coaching_id: { Args: never; Returns: string }
      is_approved_user: { Args: never; Returns: boolean }
      is_coaching_teacher: { Args: { coaching_uuid: string }; Returns: boolean }
      is_teacher_of_coaching: {
        Args: { p_coaching_id: string }
        Returns: boolean
      }
    }
    Enums: {
      student_status: "pending" | "approved" | "rejected"
      user_role: "teacher" | "student"
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
      student_status: ["pending", "approved", "rejected"],
      user_role: ["teacher", "student"],
    },
  },
} as const
