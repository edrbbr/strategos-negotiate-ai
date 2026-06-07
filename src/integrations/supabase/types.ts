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
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          path: string | null
          properties: Json
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          path?: string | null
          properties?: Json
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          path?: string | null
          properties?: Json
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      b2b_leads: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          email: string
          fbclid: string | null
          gclid: string | null
          id: string
          industry: string
          message: string | null
          phone: string | null
          referrer: string | null
          status: string
          store_count: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          fbclid?: string | null
          gclid?: string | null
          id?: string
          industry: string
          message?: string | null
          phone?: string | null
          referrer?: string | null
          status?: string
          store_count?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          fbclid?: string | null
          gclid?: string | null
          id?: string
          industry?: string
          message?: string | null
          phone?: string | null
          referrer?: string | null
          status?: string
          store_count?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      business_accounts: {
        Row: {
          billing_email: string
          created_at: string
          id: string
          industry: string | null
          name: string
          status: string
          store_count: number | null
          updated_at: string
        }
        Insert: {
          billing_email: string
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          status?: string
          store_count?: number | null
          updated_at?: string
        }
        Update: {
          billing_email?: string
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          status?: string
          store_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      business_approvals: {
        Row: {
          ai_recommendation: Json | null
          business_account_id: string
          case_id: string
          created_at: string
          decided_at: string | null
          decided_by_user_id: string | null
          decision_notes: string | null
          final_amount: number | null
          final_percent: number | null
          id: string
          justification: string | null
          requested_amount: number
          requested_by_role: Database["public"]["Enums"]["business_role"]
          requested_by_user_id: string
          requested_percent: number
          required_role: Database["public"]["Enums"]["business_role"]
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          ai_recommendation?: Json | null
          business_account_id: string
          case_id: string
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          decision_notes?: string | null
          final_amount?: number | null
          final_percent?: number | null
          id?: string
          justification?: string | null
          requested_amount?: number
          requested_by_role: Database["public"]["Enums"]["business_role"]
          requested_by_user_id: string
          requested_percent?: number
          required_role: Database["public"]["Enums"]["business_role"]
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          ai_recommendation?: Json | null
          business_account_id?: string
          case_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          decision_notes?: string | null
          final_amount?: number | null
          final_percent?: number | null
          id?: string
          justification?: string | null
          requested_amount?: number
          requested_by_role?: Database["public"]["Enums"]["business_role"]
          requested_by_user_id?: string
          requested_percent?: number
          required_role?: Database["public"]["Enums"]["business_role"]
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "business_approvals_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_approvals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "business_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      business_billing: {
        Row: {
          billing_model: string
          business_account_id: string
          created_at: string
          currency: string
          monthly_fee_cents: number
          payment_status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_model?: string
          business_account_id: string
          created_at?: string
          currency?: string
          monthly_fee_cents?: number
          payment_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_model?: string
          business_account_id?: string
          created_at?: string
          currency?: string
          monthly_fee_cents?: number
          payment_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_billing_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: true
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_case_logs: {
        Row: {
          action: string
          approval_role_used:
            | Database["public"]["Enums"]["business_role"]
            | null
          business_account_id: string
          case_id: string
          chosen_option: Json | null
          created_at: string
          id: string
          system_suggestion: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          approval_role_used?:
            | Database["public"]["Enums"]["business_role"]
            | null
          business_account_id: string
          case_id: string
          chosen_option?: Json | null
          created_at?: string
          id?: string
          system_suggestion?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          approval_role_used?:
            | Database["public"]["Enums"]["business_role"]
            | null
          business_account_id?: string
          case_id?: string
          chosen_option?: Json | null
          created_at?: string
          id?: string
          system_suggestion?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_case_logs_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_case_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "business_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      business_case_versions: {
        Row: {
          ai_analysis: Json | null
          ai_options: Json | null
          business_account_id: string
          case_id: string
          created_at: string
          created_by_user_id: string | null
          id: string
          kind: string
          recommended_index: number | null
          required_role: Database["public"]["Enums"]["business_role"] | null
          user_prompt: string | null
          version_number: number
        }
        Insert: {
          ai_analysis?: Json | null
          ai_options?: Json | null
          business_account_id: string
          case_id: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          kind: string
          recommended_index?: number | null
          required_role?: Database["public"]["Enums"]["business_role"] | null
          user_prompt?: string | null
          version_number: number
        }
        Update: {
          ai_analysis?: Json | null
          ai_options?: Json | null
          business_account_id?: string
          case_id?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          kind?: string
          recommended_index?: number | null
          required_role?: Database["public"]["Enums"]["business_role"] | null
          user_prompt?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_case_versions_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_case_versions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "business_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      business_cases: {
        Row: {
          ai_analysis: Json | null
          ai_options: Json | null
          business_account_id: string
          case_number: string
          channel: string
          claimed_amount: number
          closed_at: string | null
          created_at: string
          created_by_user_id: string
          current_version_id: string | null
          customer_type: string | null
          final_granted_amount: number | null
          final_granted_percent: number | null
          id: string
          notes: string | null
          product_category: string | null
          product_name: string | null
          purchase_price_total: number
          quantity: number
          required_approval_role:
            | Database["public"]["Enums"]["business_role"]
            | null
          situation_text: string | null
          sku: string | null
          status: Database["public"]["Enums"]["business_case_status"]
          suggested_offer: number | null
          suggested_offer_percent: number | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          ai_options?: Json | null
          business_account_id: string
          case_number: string
          channel?: string
          claimed_amount?: number
          closed_at?: string | null
          created_at?: string
          created_by_user_id: string
          current_version_id?: string | null
          customer_type?: string | null
          final_granted_amount?: number | null
          final_granted_percent?: number | null
          id?: string
          notes?: string | null
          product_category?: string | null
          product_name?: string | null
          purchase_price_total?: number
          quantity?: number
          required_approval_role?:
            | Database["public"]["Enums"]["business_role"]
            | null
          situation_text?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["business_case_status"]
          suggested_offer?: number | null
          suggested_offer_percent?: number | null
          title?: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          ai_options?: Json | null
          business_account_id?: string
          case_number?: string
          channel?: string
          claimed_amount?: number
          closed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          current_version_id?: string | null
          customer_type?: string | null
          final_granted_amount?: number | null
          final_granted_percent?: number | null
          id?: string
          notes?: string | null
          product_category?: string | null
          product_name?: string | null
          purchase_price_total?: number
          quantity?: number
          required_approval_role?:
            | Database["public"]["Enums"]["business_role"]
            | null
          situation_text?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["business_case_status"]
          suggested_offer?: number | null
          suggested_offer_percent?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_cases_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_cases_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "business_case_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_invoices: {
        Row: {
          amount_cents: number
          business_account_id: string
          created_at: string
          currency: string
          id: string
          pdf_url: string | null
          period_end: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          business_account_id: string
          created_at?: string
          currency?: string
          id?: string
          pdf_url?: string | null
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          business_account_id?: string
          created_at?: string
          currency?: string
          id?: string
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_invoices_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_policies: {
        Row: {
          business_account_id: string
          chunk_count: number
          content: string
          created_at: string
          id: string
          source_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_account_id: string
          chunk_count?: number
          content: string
          created_at?: string
          id?: string
          source_type?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_account_id?: string
          chunk_count?: number
          content?: string
          created_at?: string
          id?: string
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_policies_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_policy_chunks: {
        Row: {
          business_account_id: string
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          policy_id: string
        }
        Insert: {
          business_account_id: string
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          policy_id: string
        }
        Update: {
          business_account_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_policy_chunks_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_policy_chunks_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "business_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          business_account_id: string
          created_at: string
          currency: string
          default_vat_rate: number
          kulanz_rules: string | null
          max_discount_limits: Json
          updated_at: string
        }
        Insert: {
          business_account_id: string
          created_at?: string
          currency?: string
          default_vat_rate?: number
          kulanz_rules?: string | null
          max_discount_limits?: Json
          updated_at?: string
        }
        Update: {
          business_account_id?: string
          created_at?: string
          currency?: string
          default_vat_rate?: number
          kulanz_rules?: string | null
          max_discount_limits?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: true
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_support_messages: {
        Row: {
          author_type: string
          author_user_id: string
          body: string
          business_account_id: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_type: string
          author_user_id: string
          body: string
          business_account_id: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_type?: string
          author_user_id?: string
          body?: string
          business_account_id?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_support_messages_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "business_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      business_support_tickets: {
        Row: {
          business_account_id: string
          created_at: string
          created_by_user_id: string
          id: string
          last_reply_at: string
          last_reply_by: string | null
          status: string
          subject: string
        }
        Insert: {
          business_account_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          last_reply_at?: string
          last_reply_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          business_account_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          last_reply_at?: string
          last_reply_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_support_tickets_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_users: {
        Row: {
          auth_user_id: string | null
          business_account_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_primary_contact: boolean
          role: Database["public"]["Enums"]["business_role"]
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          business_account_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_primary_contact?: boolean
          role?: Database["public"]["Enums"]["business_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          business_account_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_primary_contact?: boolean
          role?: Database["public"]["Enums"]["business_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      case_attachments: {
        Row: {
          case_id: string
          created_at: string
          extracted_text: string | null
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          refinement_for_version_id: string | null
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
          refinement_for_version_id?: string | null
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
          refinement_for_version_id?: string | null
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
          change_rationale: string | null
          clarifying_questions: Json | null
          created_at: string
          draft: string | null
          id: string
          kind: string
          knowledge_sources: Json | null
          mode: string | null
          model_used: string | null
          plan_steps: Json | null
          recommended_variant: string | null
          strategy: string | null
          strategy_labels: string[]
          user_id: string
          user_prompt: string | null
          variants: Json | null
          version_number: number
        }
        Insert: {
          analysis?: Json | null
          case_id: string
          change_rationale?: string | null
          clarifying_questions?: Json | null
          created_at?: string
          draft?: string | null
          id?: string
          kind: string
          knowledge_sources?: Json | null
          mode?: string | null
          model_used?: string | null
          plan_steps?: Json | null
          recommended_variant?: string | null
          strategy?: string | null
          strategy_labels?: string[]
          user_id: string
          user_prompt?: string | null
          variants?: Json | null
          version_number: number
        }
        Update: {
          analysis?: Json | null
          case_id?: string
          change_rationale?: string | null
          clarifying_questions?: Json | null
          created_at?: string
          draft?: string | null
          id?: string
          kind?: string
          knowledge_sources?: Json | null
          mode?: string | null
          model_used?: string | null
          plan_steps?: Json | null
          recommended_variant?: string | null
          strategy?: string | null
          strategy_labels?: string[]
          user_id?: string
          user_prompt?: string | null
          variants?: Json | null
          version_number?: number
        }
        Relationships: []
      }
      cases: {
        Row: {
          analysis: Json | null
          clarifying_questions: Json | null
          created_at: string
          current_version_id: string | null
          draft: string | null
          escalation_level: string
          icon_hint: string
          id: string
          knowledge_sources: Json | null
          language_code: string
          language_label: string
          last_analyzed_at: string | null
          medium: string
          mode: string | null
          model_used: string | null
          pipeline_error: Json | null
          plan_steps: Json | null
          quick_suggestions: Json | null
          quick_suggestions_version_id: string | null
          recommended_variant: string | null
          situation_text: string | null
          status: string
          strategy: string | null
          title: string
          tonality_profile_key: string
          updated_at: string
          user_id: string
          variants: Json | null
        }
        Insert: {
          analysis?: Json | null
          clarifying_questions?: Json | null
          created_at?: string
          current_version_id?: string | null
          draft?: string | null
          escalation_level?: string
          icon_hint?: string
          id?: string
          knowledge_sources?: Json | null
          language_code?: string
          language_label?: string
          last_analyzed_at?: string | null
          medium?: string
          mode?: string | null
          model_used?: string | null
          pipeline_error?: Json | null
          plan_steps?: Json | null
          quick_suggestions?: Json | null
          quick_suggestions_version_id?: string | null
          recommended_variant?: string | null
          situation_text?: string | null
          status?: string
          strategy?: string | null
          title?: string
          tonality_profile_key?: string
          updated_at?: string
          user_id: string
          variants?: Json | null
        }
        Update: {
          analysis?: Json | null
          clarifying_questions?: Json | null
          created_at?: string
          current_version_id?: string | null
          draft?: string | null
          escalation_level?: string
          icon_hint?: string
          id?: string
          knowledge_sources?: Json | null
          language_code?: string
          language_label?: string
          last_analyzed_at?: string | null
          medium?: string
          mode?: string | null
          model_used?: string | null
          pipeline_error?: Json | null
          plan_steps?: Json | null
          quick_suggestions?: Json | null
          quick_suggestions_version_id?: string | null
          recommended_variant?: string | null
          situation_text?: string | null
          status?: string
          strategy?: string | null
          title?: string
          tonality_profile_key?: string
          updated_at?: string
          user_id?: string
          variants?: Json | null
        }
        Relationships: []
      }
      conversion_events: {
        Row: {
          business_account_id: string | null
          created_at: string
          email: string | null
          event_name: string
          id: string
          properties: Json
          user_agent: string | null
          user_id: string | null
          utm: Json
        }
        Insert: {
          business_account_id?: string | null
          created_at?: string
          email?: string | null
          event_name: string
          id?: string
          properties?: Json
          user_agent?: string | null
          user_id?: string | null
          utm?: Json
        }
        Update: {
          business_account_id?: string | null
          created_at?: string
          email?: string | null
          event_name?: string
          id?: string
          properties?: Json
          user_agent?: string | null
          user_id?: string | null
          utm?: Json
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          amount_off_cents: number | null
          applicable_billing_cycles: string[]
          applicable_plan_ids: string[]
          code: string
          created_at: string
          currency: string
          description: string | null
          duration: string
          duration_in_months: number | null
          id: string
          is_active: boolean
          max_redemptions_per_user: number
          max_total_redemptions: number | null
          percent_off: number | null
          stripe_coupon_id_live: string | null
          stripe_coupon_id_sandbox: string | null
          total_redemptions: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          amount_off_cents?: number | null
          applicable_billing_cycles?: string[]
          applicable_plan_ids?: string[]
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean
          max_redemptions_per_user?: number
          max_total_redemptions?: number | null
          percent_off?: number | null
          stripe_coupon_id_live?: string | null
          stripe_coupon_id_sandbox?: string | null
          total_redemptions?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          amount_off_cents?: number | null
          applicable_billing_cycles?: string[]
          applicable_plan_ids?: string[]
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean
          max_redemptions_per_user?: number
          max_total_redemptions?: number | null
          percent_off?: number | null
          stripe_coupon_id_live?: string | null
          stripe_coupon_id_sandbox?: string | null
          total_redemptions?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      discount_redemptions: {
        Row: {
          discount_code_id: string
          id: string
          redeemed_at: string
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          discount_code_id: string
          id?: string
          redeemed_at?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          discount_code_id?: string
          id?: string
          redeemed_at?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
      knowledge_books: {
        Row: {
          author: string | null
          book_key: string
          chunk_count: number
          created_at: string
          error_message: string | null
          file_path: string | null
          indexed_at: string | null
          progress_done: number
          progress_phase: string | null
          progress_total: number
          progress_updated_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          book_key: string
          chunk_count?: number
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          indexed_at?: string | null
          progress_done?: number
          progress_phase?: string | null
          progress_total?: number
          progress_updated_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          book_key?: string
          chunk_count?: number
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          indexed_at?: string | null
          progress_done?: number
          progress_phase?: string | null
          progress_total?: number
          progress_updated_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          book_key: string
          chapter: string | null
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          page: number | null
        }
        Insert: {
          book_key: string
          chapter?: string | null
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          page?: number | null
        }
        Update: {
          book_key?: string
          chapter?: string | null
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          page?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_book_key_fkey"
            columns: ["book_key"]
            isOneToOne: false
            referencedRelation: "knowledge_books"
            referencedColumns: ["book_key"]
          },
        ]
      }
      linkedin_pool: {
        Row: {
          anonymized_outcome: string | null
          anonymized_situation: string | null
          case_id: string
          consent_at: string | null
          created_at: string
          curated_at: string | null
          curated_by: string | null
          curator_notes: string | null
          generated_post: string | null
          id: string
          posted_at: string | null
          status: string
          template_key: string | null
          updated_at: string
          user_consent: boolean
          user_id: string
        }
        Insert: {
          anonymized_outcome?: string | null
          anonymized_situation?: string | null
          case_id: string
          consent_at?: string | null
          created_at?: string
          curated_at?: string | null
          curated_by?: string | null
          curator_notes?: string | null
          generated_post?: string | null
          id?: string
          posted_at?: string | null
          status?: string
          template_key?: string | null
          updated_at?: string
          user_consent?: boolean
          user_id: string
        }
        Update: {
          anonymized_outcome?: string | null
          anonymized_situation?: string | null
          case_id?: string
          consent_at?: string | null
          created_at?: string
          curated_at?: string | null
          curated_by?: string | null
          curator_notes?: string | null
          generated_post?: string | null
          id?: string
          posted_at?: string | null
          status?: string
          template_key?: string | null
          updated_at?: string
          user_consent?: boolean
          user_id?: string
        }
        Relationships: []
      }
      linkedin_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          prompt_skeleton: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          prompt_skeleton: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          prompt_skeleton?: string
          sort_order?: number
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
          min_tier: string
          prompt_hint: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          min_tier?: string
          prompt_hint?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          min_tier?: string
          prompt_hint?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          created_at: string
          feature_text: string
          help_text: string | null
          id: string
          is_highlight: boolean
          plan_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          feature_text: string
          help_text?: string | null
          id?: string
          is_highlight?: boolean
          plan_id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          feature_text?: string
          help_text?: string | null
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
          allows_deep_doc_analysis: boolean
          allows_tonality: boolean
          badge: string | null
          bookable_directly: boolean
          case_limit: number | null
          case_limit_type: string
          created_at: string
          id: string
          initial_attachments_limit: number
          is_active: boolean
          is_recommended: boolean
          model_id: string
          name: string
          pipeline_config: Json | null
          refinement_attachments_limit: number
          refinements_per_case: number | null
          refinements_per_month: number | null
          sort_order: number
          support_sla_hours: number | null
          tagline: string | null
          tier_key: string
          tier_label: string
          updated_at: string
        }
        Insert: {
          allows_deep_doc_analysis?: boolean
          allows_tonality?: boolean
          badge?: string | null
          bookable_directly?: boolean
          case_limit?: number | null
          case_limit_type?: string
          created_at?: string
          id: string
          initial_attachments_limit?: number
          is_active?: boolean
          is_recommended?: boolean
          model_id: string
          name: string
          pipeline_config?: Json | null
          refinement_attachments_limit?: number
          refinements_per_case?: number | null
          refinements_per_month?: number | null
          sort_order: number
          support_sla_hours?: number | null
          tagline?: string | null
          tier_key?: string
          tier_label: string
          updated_at?: string
        }
        Update: {
          allows_deep_doc_analysis?: boolean
          allows_tonality?: boolean
          badge?: string | null
          bookable_directly?: boolean
          case_limit?: number | null
          case_limit_type?: string
          created_at?: string
          id?: string
          initial_attachments_limit?: number
          is_active?: boolean
          is_recommended?: boolean
          model_id?: string
          name?: string
          pipeline_config?: Json | null
          refinement_attachments_limit?: number
          refinements_per_case?: number | null
          refinements_per_month?: number | null
          sort_order?: number
          support_sla_hours?: number | null
          tagline?: string | null
          tier_key?: string
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
          refinements_period_start: string | null
          refinements_used_period: number
          stripe_customer_id: string | null
          subscription_status: string | null
          theme_preference: string | null
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
          refinements_period_start?: string | null
          refinements_used_period?: number
          stripe_customer_id?: string | null
          subscription_status?: string | null
          theme_preference?: string | null
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
          refinements_period_start?: string | null
          refinements_used_period?: number
          stripe_customer_id?: string | null
          subscription_status?: string | null
          theme_preference?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tonality_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          min_tier: string
          prompt_instruction: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          min_tier?: string
          prompt_instruction: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          min_tier?: string
          prompt_instruction?: string
          sort_order?: number
        }
        Relationships: []
      }
      upgrade_previews: {
        Row: {
          case_id: string
          free_strategy_snapshot: string | null
          generated_at: string
          id: string
          pro_extra_insight: string | null
          pro_first_paragraph: string | null
          pro_strategy: string | null
          pro_strategy_label: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          case_id: string
          free_strategy_snapshot?: string | null
          generated_at?: string
          id?: string
          pro_extra_insight?: string | null
          pro_first_paragraph?: string | null
          pro_strategy?: string | null
          pro_strategy_label?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          case_id?: string
          free_strategy_snapshot?: string | null
          generated_at?: string
          id?: string
          pro_extra_insight?: string | null
          pro_first_paragraph?: string | null
          pro_strategy?: string | null
          pro_strategy_label?: string | null
          user_id?: string
          viewed_at?: string | null
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
      business_case_kpis: {
        Row: {
          avg_granted_percent: number | null
          business_account_id: string | null
          closed_cases: number | null
          escalated_count: number | null
          open_cases: number | null
          sum_claimed: number | null
          sum_granted: number | null
          sum_purchase: number | null
          sum_saved: number | null
          total_cases: number | null
          waiting_approval_cases: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_cases_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      plans_public: {
        Row: {
          allows_deep_doc_analysis: boolean | null
          allows_tonality: boolean | null
          badge: string | null
          bookable_directly: boolean | null
          case_limit: number | null
          case_limit_type: string | null
          created_at: string | null
          id: string | null
          initial_attachments_limit: number | null
          is_active: boolean | null
          is_recommended: boolean | null
          name: string | null
          refinement_attachments_limit: number | null
          refinements_per_case: number | null
          refinements_per_month: number | null
          sort_order: number | null
          support_sla_hours: number | null
          tagline: string | null
          tier_key: string | null
          tier_label: string | null
          updated_at: string | null
        }
        Insert: {
          allows_deep_doc_analysis?: boolean | null
          allows_tonality?: boolean | null
          badge?: string | null
          bookable_directly?: boolean | null
          case_limit?: number | null
          case_limit_type?: string | null
          created_at?: string | null
          id?: string | null
          initial_attachments_limit?: number | null
          is_active?: boolean | null
          is_recommended?: boolean | null
          name?: string | null
          refinement_attachments_limit?: number | null
          refinements_per_case?: number | null
          refinements_per_month?: number | null
          sort_order?: number | null
          support_sla_hours?: number | null
          tagline?: string | null
          tier_key?: string | null
          tier_label?: string | null
          updated_at?: string | null
        }
        Update: {
          allows_deep_doc_analysis?: boolean | null
          allows_tonality?: boolean | null
          badge?: string | null
          bookable_directly?: boolean | null
          case_limit?: number | null
          case_limit_type?: string | null
          created_at?: string | null
          id?: string | null
          initial_attachments_limit?: number | null
          is_active?: boolean | null
          is_recommended?: boolean | null
          name?: string | null
          refinement_attachments_limit?: number | null
          refinements_per_case?: number | null
          refinements_per_month?: number | null
          sort_order?: number | null
          support_sla_hours?: number | null
          tagline?: string | null
          tier_key?: string | null
          tier_label?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      business_role_rank: {
        Args: { _account: string; _user: string }
        Returns: number
      }
      consume_dossier: { Args: { p_user_id: string }; Returns: Json }
      consume_refinement: {
        Args: { p_case_id: string; p_user_id: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_business_case_number: {
        Args: { _account_id: string }
        Returns: string
      }
      get_user_business_account: { Args: { _user: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cases_used: { Args: { p_user_id: string }; Returns: number }
      is_business_member: {
        Args: { _account: string; _user: string }
        Returns: boolean
      }
      match_business_knowledge: {
        Args: {
          _account_id: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          policy_id: string
          similarity: number
        }[]
      }
      match_knowledge: {
        Args: {
          filter_books?: string[]
          match_count?: number
          query_embedding: string
        }
        Returns: {
          book_key: string
          book_title: string
          chapter: string
          content: string
          id: string
          page: number
          similarity: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      validate_discount_code: {
        Args: {
          p_billing_cycle: string
          p_code: string
          p_plan_id: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      approval_status: "pending" | "accepted" | "modified" | "rejected"
      business_case_status:
        | "open"
        | "in_review"
        | "waiting_approval"
        | "closed"
        | "rejected"
      business_role:
        | "support_readonly"
        | "sachbearbeiter"
        | "manager"
        | "leitung"
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
      approval_status: ["pending", "accepted", "modified", "rejected"],
      business_case_status: [
        "open",
        "in_review",
        "waiting_approval",
        "closed",
        "rejected",
      ],
      business_role: [
        "support_readonly",
        "sachbearbeiter",
        "manager",
        "leitung",
      ],
    },
  },
} as const
