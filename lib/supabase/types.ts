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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      box_types: {
        Row: {
          created_at: string
          description: string | null
          frequency: string | null
          id: string
          is_enabled: boolean
          is_premium: boolean
          is_subscription: boolean
          name: string
          price_eur: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency?: string | null
          id: string
          is_enabled?: boolean
          is_premium?: boolean
          is_subscription?: boolean
          name: string
          price_eur: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          is_enabled?: boolean
          is_premium?: boolean
          is_subscription?: boolean
          name?: string
          price_eur?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string
          created_by: string
          failed_sends: number
          html_content: string
          id: string
          sent_at: string | null
          status: string
          subject: string
          successful_sends: number
          text_content: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          failed_sends?: number
          html_content: string
          id?: string
          sent_at?: string | null
          status?: string
          subject: string
          successful_sends?: number
          text_content: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          failed_sends?: number
          html_content?: string
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          successful_sends?: number
          text_content?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          full_name: string
          id: string
          marketing_consent: boolean
          marketing_consent_date: string | null
          phone: string | null
          preferred_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          marketing_consent?: boolean
          marketing_consent_date?: string | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          marketing_consent?: boolean
          marketing_consent_date?: string | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          confirmation_token: string
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          ip_address: unknown
          source: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          unsubscribe_token: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          confirmation_token?: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown
          source?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          unsubscribe_token?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          confirmation_token?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          source?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          unsubscribe_token?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      options: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          label: string
          option_set_id: string
          sort_order: number
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id: string
          is_enabled?: boolean
          label: string
          option_set_id: string
          sort_order?: number
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          label?: string
          option_set_id?: string
          sort_order?: number
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      preorder_edit_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          preorder_id: string
          purpose: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          preorder_id: string
          purpose: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          preorder_id?: string
          purpose?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preorder_edit_tokens_preorder_id_fkey"
            columns: ["preorder_id"]
            isOneToOne: false
            referencedRelation: "preorders"
            referencedColumns: ["id"]
          },
        ]
      }
      preorders: {
        Row: {
          additional_notes: string | null
          box_type: Database["public"]["Enums"]["box_type"]
          colors: string[] | null
          created_at: string
          dietary: string[] | null
          dietary_other: string | null
          discount_percent: number | null
          edit_count: number | null
          email: string
          final_price_eur: number | null
          flavor_other: string | null
          flavors: string[] | null
          full_name: string
          id: string
          ip_address: unknown
          last_edited_at: string | null
          order_id: string
          original_price_eur: number | null
          phone: string | null
          promo_code: string | null
          size_lower: string | null
          size_upper: string | null
          sport_other: string | null
          sports: string[] | null
          updated_at: string
          user_agent: string | null
          wants_personalization: boolean
        }
        Insert: {
          additional_notes?: string | null
          box_type: Database["public"]["Enums"]["box_type"]
          colors?: string[] | null
          created_at?: string
          dietary?: string[] | null
          dietary_other?: string | null
          discount_percent?: number | null
          edit_count?: number | null
          email: string
          final_price_eur?: number | null
          flavor_other?: string | null
          flavors?: string[] | null
          full_name: string
          id?: string
          ip_address?: unknown
          last_edited_at?: string | null
          order_id?: string
          original_price_eur?: number | null
          phone?: string | null
          promo_code?: string | null
          size_lower?: string | null
          size_upper?: string | null
          sport_other?: string | null
          sports?: string[] | null
          updated_at?: string
          user_agent?: string | null
          wants_personalization?: boolean
        }
        Update: {
          additional_notes?: string | null
          box_type?: Database["public"]["Enums"]["box_type"]
          colors?: string[] | null
          created_at?: string
          dietary?: string[] | null
          dietary_other?: string | null
          discount_percent?: number | null
          edit_count?: number | null
          email?: string
          final_price_eur?: number | null
          flavor_other?: string | null
          flavors?: string[] | null
          full_name?: string
          id?: string
          ip_address?: unknown
          last_edited_at?: string | null
          order_id?: string
          original_price_eur?: number | null
          phone?: string | null
          promo_code?: string | null
          size_lower?: string | null
          size_upper?: string | null
          sport_other?: string | null
          sports?: string[] | null
          updated_at?: string
          user_agent?: string | null
          wants_personalization?: boolean
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          applicable_box_types: string[] | null
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_percent: number
          ends_at: string | null
          id: string
          is_enabled: boolean
          max_uses: number | null
          min_order_value_eur: number | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          applicable_box_types?: string[] | null
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_percent: number
          ends_at?: string | null
          id?: string
          is_enabled?: boolean
          max_uses?: number | null
          min_order_value_eur?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          applicable_box_types?: string[] | null
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_percent?: number
          ends_at?: string | null
          id?: string
          is_enabled?: boolean
          max_uses?: number | null
          min_order_value_eur?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_config: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
          value_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
          value_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
          value_type?: string
        }
        Relationships: []
      }
      staff_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          staff_user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          staff_user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_role_assignments_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          requires_password_reset: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          requires_password_reset?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          requires_password_reset?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_old_audit_logs: { Args: never; Returns: number }
      assign_role_to_staff: {
        Args: {
          p_assigned_by?: string
          p_role_id: string
          p_staff_user_id: string
        }
        Returns: string
      }
      calculate_box_prices: {
        Args: { p_promo_code?: string }
        Returns: Database["public"]["CompositeTypes"]["box_price_info"][]
        SetofOptions: {
          from: "*"
          to: "box_price_info"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_expired_newsletter_pending: { Args: never; Returns: number }
      cleanup_expired_preorder_tokens: { Args: never; Returns: number }
      create_audit_log: {
        Args: {
          p_action: string
          p_actor_email: string
          p_actor_id: string
          p_actor_type: Database["public"]["Enums"]["actor_type"]
          p_ip_address?: unknown
          p_metadata?: Json
          p_resource_id: string
          p_resource_type: string
          p_user_agent?: string
        }
        Returns: string
      }
      generate_order_id: { Args: never; Returns: string }
      get_user_roles: {
        Args: { p_user_id: string }
        Returns: {
          role_description: string
          role_name: string
        }[]
      }
      has_any_role: {
        Args: { p_role_names: string[]; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: { p_role_name: string; p_user_id: string }
        Returns: boolean
      }
      is_staff_user: { Args: { p_user_id: string }; Returns: boolean }
      remove_role_from_staff: {
        Args: { p_role_id: string; p_staff_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      actor_type: "staff" | "customer" | "system" | "anonymous"
      box_type:
        | "monthly-standard"
        | "monthly-premium"
        | "monthly-premium-monthly"
        | "monthly-premium-seasonal"
        | "onetime-standard"
        | "onetime-premium"
      subscription_status: "pending" | "subscribed" | "unsubscribed"
    }
    CompositeTypes: {
      box_price_info: {
        box_type_id: string | null
        box_type_name: string | null
        original_price_eur: number | null
        original_price_bgn: number | null
        discount_percent: number | null
        discount_amount_eur: number | null
        discount_amount_bgn: number | null
        final_price_eur: number | null
        final_price_bgn: number | null
      }
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
      actor_type: ["staff", "customer", "system", "anonymous"],
      box_type: [
        "monthly-standard",
        "monthly-premium",
        "monthly-premium-monthly",
        "monthly-premium-seasonal",
        "onetime-standard",
        "onetime-premium",
      ],
      subscription_status: ["pending", "subscribed", "unsubscribed"],
    },
  },
} as const
