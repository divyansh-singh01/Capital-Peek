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
      case_studies: {
        Row: {
          after_metrics: Json
          before_metrics: Json
          client_name: string
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          industry: string | null
          published: boolean
          roi_percent: number | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          after_metrics?: Json
          before_metrics?: Json
          client_name: string
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          industry?: string | null
          published?: boolean
          roi_percent?: number | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          after_metrics?: Json
          before_metrics?: Json
          client_name?: string
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          industry?: string | null
          published?: boolean
          roi_percent?: number | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_studies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          team_size: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          team_size?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          team_size?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contract_roi_calculations: {
        Row: {
          company_id: string | null
          created_at: string
          department: string | null
          id: string
          inputs: Json
          name: string
          results: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          inputs: Json
          name: string
          results: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          inputs?: Json
          name?: string
          results?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_roi_calculations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          company_id: string | null
          contract_name: string
          contract_value: number
          created_at: string
          created_by: string
          customer_name: string
          deal_id: string | null
          end_date: string | null
          id: string
          notes: string | null
          owner_name: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contract_name: string
          contract_value?: number
          created_at?: string
          created_by: string
          customer_name: string
          deal_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          owner_name?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contract_name?: string
          contract_value?: number
          created_at?: string
          created_by?: string
          customer_name?: string
          deal_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          owner_name?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          body: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          deal_id: string
          due_at: string | null
          id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          deal_id: string
          due_at?: string | null
          id?: string
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string
          due_at?: string | null
          id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_name: string
          company_id: string | null
          contact_name: string | null
          created_at: string
          created_by: string
          deal_name: string | null
          expected_close_date: string | null
          id: string
          last_activity_at: string
          next_action: string | null
          next_action_due: string | null
          owner_name: string | null
          position: number
          probability: number
          stage: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at: string
          updated_at: string
          value: number
          won_at: string | null
        }
        Insert: {
          account_name: string
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          created_by: string
          deal_name?: string | null
          expected_close_date?: string | null
          id?: string
          last_activity_at?: string
          next_action?: string | null
          next_action_due?: string | null
          owner_name?: string | null
          position?: number
          probability?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at?: string
          updated_at?: string
          value?: number
          won_at?: string | null
        }
        Update: {
          account_name?: string
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string
          deal_name?: string | null
          expected_close_date?: string | null
          id?: string
          last_activity_at?: string
          next_action?: string | null
          next_action_due?: string | null
          owner_name?: string | null
          position?: number
          probability?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at?: string
          updated_at?: string
          value?: number
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          extra_revenue_year: number | null
          full_name: string | null
          id: string
          inputs: Json | null
          roi_percent: number | null
          status: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          extra_revenue_year?: number | null
          full_name?: string | null
          id?: string
          inputs?: Json | null
          roi_percent?: number | null
          status?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          extra_revenue_year?: number | null
          full_name?: string | null
          id?: string
          inputs?: Json | null
          roi_percent?: number | null
          status?: string
        }
        Relationships: []
      }
      payment_submissions: {
        Row: {
          amount: number
          client_name: string
          contact: string | null
          created_at: string
          currency: string
          id: string
          plan: string | null
          proof_path: string | null
          status: string
          user_id: string | null
          utr: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          client_name: string
          contact?: string | null
          created_at?: string
          currency?: string
          id?: string
          plan?: string | null
          proof_path?: string | null
          status?: string
          user_id?: string | null
          utr?: string | null
        }
        Update: {
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          company_role: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          company_role?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          company_role?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      roi_calculations: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          inputs: Json
          name: string
          notes: string | null
          results: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          inputs: Json
          name: string
          notes?: string | null
          results: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          name?: string
          notes?: string | null
          results?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roi_calculations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          active: boolean
          closed_revenue: number
          company_id: string | null
          created_at: string
          created_by: string
          email: string | null
          full_name: string
          id: string
          quota: number
          role_title: string | null
          updated_at: string
          win_rate: number
        }
        Insert: {
          active?: boolean
          closed_revenue?: number
          company_id?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          full_name: string
          id?: string
          quota?: number
          role_title?: string | null
          updated_at?: string
          win_rate?: number
        }
        Update: {
          active?: boolean
          closed_revenue?: number
          company_id?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string
          id?: string
          quota?: number
          role_title?: string | null
          updated_at?: string
          win_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      can_edit: { Args: never; Returns: boolean }
      create_workspace: { Args: { p_name: string }; Returns: string }
      current_company_id: { Args: never; Returns: string }
      current_company_role: { Args: never; Returns: string }
      get_invite_code: { Args: never; Returns: string }
      is_staff: { Args: never; Returns: boolean }
      join_workspace: { Args: { p_code: string }; Returns: string }
      leave_workspace: { Args: never; Returns: undefined }
      remove_member: { Args: { p_user: string }; Returns: undefined }
      rotate_invite_code: { Args: never; Returns: string }
      set_member_role: {
        Args: { p_role: string; p_user: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "sales_manager" | "viewer"
      deal_stage:
        | "lead"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "contract"
        | "won"
        | "lost"
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
    Enums: {
      app_role: ["admin", "sales_manager", "viewer"],
      deal_stage: [
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "contract",
        "won",
        "lost",
      ],
    },
  },
} as const
