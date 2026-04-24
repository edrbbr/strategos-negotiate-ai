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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      case_attachments: {
        Row: {
          case_id: string
          created_at: string
          extracted_text: string | null
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_attachments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_versions: {
        Row: {
          analysis: Json | null
          case_id: string
          created_at: string
          draft: string | null
          id: string
          kind: string
          model_used: string | null
          strategy: string | null
          strategy_labels: string[]
          user_id: string
          user_prompt: string | null
          version_number: number
        }
        Insert: {
          analysis?: Json | null
          case_id: string
          created_at?: string
          draft?: string | null
          id?: string
          kind: string
          model_used?: string | null
          strategy?: string | null
          strategy_labels?: string[]
          user_id: string
          user_prompt?: string | null
          version_number: number
        }
        Update: {
          analysis?: Json | null
          case_id?: string
          created_at?: string
          draft?: string | null
          id?: string
          kind?: string
          model_used?: string | null
          strategy?: string | null
          strategy_labels?: string[]
          user_id?: string
          user_prompt?: string | null
          version_number?: number
        }
        Relationships: []
      }
      cases: {
        Row: {
          analysis: Json | null
          created_at: string
          current_version_id: string | null
          draft: string | null
          icon_hint: string
          id: string
          language_code: string
          language_label: string
          last_analyzed_at: string | null
          medium: string
          model_used: string | null
          quick_suggestions: Json | null
          quick_suggestions_version_id: string | null
          situation_text: string | null
          status: string
          strategy: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          current_version_id?: string | null
          draft?: string | null
          icon_hint?: string
          id?: string
          language_code?: string
          language_label?: string
          last_analyzed_at?: string | null
          medium?: string
          model_used?: string | null
          quick_suggestions?: Json | null
          quick_suggestions_version_id?: string | null
          situation_text?: string | null
          status?: string
          strategy?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          current_version_id?: string | null
          draft?: string | null
          icon_hint?: string
          id?: string
          language_code?: string
          language_label?: string
          last_analyzed_at?: string | null
          medium?: string
          model_used?: string | null
          quick_suggestions?: Json | null
          quick_suggestions_version_id?: string | null
          situation_text?: string | null
          status?: string
          strategy?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      elite_requests: {
        Row: {
          admin_token: string
          biggest_pain_point: string
          created_at: string
          email: string
          full_name: string
          id: string
          monthly_negotiation_volume: string
          primary_use_case: string
          profession: string
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_token?: string
          biggest_pain_point: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          monthly_negotiation_volume: string
          primary_use_case: string
          profession: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_token?: string
          biggest_pain_point?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          monthly_negotiation_volume?: string
          primary_use_case?: string
          profession?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      extra_credit_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          quantity: number
          status: string
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          quantity: number
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          quantity?: number
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      negotiation_strategies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          created_at: string
          feature_text: string
          id: string
          is_highlight: boolean
          plan_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          feature_text: string
          id?: string
          is_highlight?: boolean
          plan_id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          feature_text?: string
          id?: string
          is_highlight?: boolean
          plan_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_public"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_prices: {
        Row: {
          amount_cents: number
          billing_cycle: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          plan_id: string
          stripe_price_id: string | null
        }
        Insert: {
          amount_cents: number
          billing_cycle: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_id: string
          stripe_price_id?: string | null
        }
        Update: {
          amount_cents?: number
          billing_cycle?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_id?: string
          stripe_price_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_public"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          badge: string | null
          case_limit: number | null
          case_limit_type: string
          created_at: string
          id: string
          is_active: boolean
          is_recommended: boolean
          model_id: string
          name: string
          pipeline_config: Json | null
          sort_order: number
          tagline: string | null
          tier_label: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          case_limit?: number | null
          case_limit_type?: string
          created_at?: string
          id: string
          is_active?: boolean
          is_recommended?: boolean
          model_id: string
          name: string
          pipeline_config?: Json | null
          sort_order: number
          tagline?: string | null
          tier_label: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          case_limit?: number | null
          case_limit_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          model_id?: string
          name?: string
          pipeline_config?: Json | null
          sort_order?: number
          tagline?: string | null
          tier_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aggressive_mode: boolean
          archive_mode: boolean
          avatar_url: string | null
          billing_cycle: string | null
          cases_period_start: string | null
          cases_used: number
          created_at: string
          extra_credits: number
          full_name: string | null
          id: string
          organization: string | null
          plan_id: string
          stripe_customer_id: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          aggressive_mode?: boolean
          archive_mode?: boolean
          avatar_url?: string | null
          billing_cycle?: string | null
          cases_period_start?: string | null
          cases_used?: number
          created_at?: string
          extra_credits?: number
          full_name?: string | null
          id: string
          organization?: string | null
          plan_id?: string
          stripe_customer_id?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          aggressive_mode?: boolean
          archive_mode?: boolean
          avatar_url?: string | null
          billing_cycle?: string | null
          cases_period_start?: string | null
          cases_used?: number
          created_at?: string
          extra_credits?: number
          full_name?: string | null
          id?: string
          organization?: string | null
          plan_id?: string
          stripe_customer_id?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      plans_public: {
        Row: {
          badge: string | null
          case_limit: number | null
          case_limit_type: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          is_recommended: boolean | null
          name: string | null
          sort_order: number | null
          tagline: string | null
          tier_label: string | null
          updated_at: string | null
        }
        Insert: {
          badge?: string | null
          case_limit?: number | null
          case_limit_type?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_recommended?: boolean | null
          name?: string | null
          sort_order?: number | null
          tagline?: string | null
          tier_label?: string | null
          updated_at?: string | null
        }
        Update: {
          badge?: string | null
          case_limit?: number | null
          case_limit_type?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_recommended?: boolean | null
          name?: string | null
          sort_order?: number | null
          tagline?: string | null
          tier_label?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      consume_dossier: { Args: { p_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cases_used: { Args: { p_user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
