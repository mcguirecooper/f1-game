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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          after_value: Json | null
          before_value: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          reason: string | null
        }
        Insert: {
          action: string
          admin_id: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: never
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: never
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["player_id"]
          },
        ]
      }
      constructor_assignments: {
        Row: {
          constructor_id: number
          driver_id: number
          race_id: number
        }
        Insert: {
          constructor_id: number
          driver_id: number
          race_id: number
        }
        Update: {
          constructor_id?: number
          driver_id?: number
          race_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "constructor_assignments_constructor_id_fkey"
            columns: ["constructor_id"]
            isOneToOne: false
            referencedRelation: "constructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "constructor_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "constructor_assignments_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      constructors: {
        Row: {
          color: string
          created_at: string
          id: number
          name: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: never
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: never
          name?: string
        }
        Relationships: []
      }
      driver_results: {
        Row: {
          driver_id: number
          finishing_position: number | null
          race_id: number
          status: string
          updated_at: string
        }
        Insert: {
          driver_id: number
          finishing_position?: number | null
          race_id: number
          status: string
          updated_at?: string
        }
        Update: {
          driver_id?: number
          finishing_position?: number | null
          race_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_results_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          code: string
          created_at: string
          id: number
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: never
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: never
          name?: string
        }
        Relationships: []
      }
      picks: {
        Row: {
          constructor_id: number
          player_id: string
          race_id: number
          submitted_at: string
        }
        Insert: {
          constructor_id: number
          player_id: string
          race_id: number
          submitted_at?: string
        }
        Update: {
          constructor_id?: number
          player_id?: string
          race_id?: number
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "picks_constructor_id_fkey"
            columns: ["constructor_id"]
            isOneToOne: false
            referencedRelation: "constructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "picks_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      races: {
        Row: {
          created_at: string
          id: number
          name: string
          round_number: number
          season_id: number
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          round_number: number
          season_id: number
          starts_at: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          round_number?: number
          season_id?: number
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "races_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_rules: {
        Row: {
          constructors_at_max: number
          max_constructor_uses: number
          points_formula: string
          season_id: number
          total_races: number
          updated_at: string
        }
        Insert: {
          constructors_at_max?: number
          max_constructor_uses?: number
          points_formula?: string
          season_id: number
          total_races: number
          updated_at?: string
        }
        Update: {
          constructors_at_max?: number
          max_constructor_uses?: number
          points_formula?: string
          season_id?: number
          total_races?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_rules_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: true
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          id: number
          status: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: never
          status?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: never
          status?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      constructor_race_scores: {
        Row: {
          constructor_id: number | null
          points: number | null
          race_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "constructor_assignments_constructor_id_fkey"
            columns: ["constructor_id"]
            isOneToOne: false
            referencedRelation: "constructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_points: {
        Row: {
          constructor_id: number | null
          driver_id: number | null
          finishing_position: number | null
          points: number | null
          race_id: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "constructor_assignments_constructor_id_fkey"
            columns: ["constructor_id"]
            isOneToOne: false
            referencedRelation: "constructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_results_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      player_race_scores: {
        Row: {
          constructor_id: number | null
          player_id: string | null
          points: number | null
          race_id: number | null
          submitted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "picks_constructor_id_fkey"
            columns: ["constructor_id"]
            isOneToOne: false
            referencedRelation: "constructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "picks_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      standings: {
        Row: {
          display_name: string | null
          picks_submitted: number | null
          player_id: string | null
          points: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_override_pick: {
        Args: {
          p_constructor_id: number
          p_player_id: string
          p_race_id: number
          p_reason: string
        }
        Returns: {
          constructor_id: number
          player_id: string
          race_id: number
          submitted_at: string
        }
        SetofOptions: {
          from: "*"
          to: "picks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_provision_profile: {
        Args: {
          p_display_name: string
          p_reason: string
          p_role: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          display_name: string
          id: string
          role: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_result: {
        Args: {
          p_driver_id: number
          p_finishing_position: number
          p_race_id: number
          p_reason: string
          p_status: string
        }
        Returns: {
          driver_id: number
          finishing_position: number | null
          race_id: number
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "driver_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      submit_pick: {
        Args: { p_constructor_id: number; p_race_id: number }
        Returns: {
          constructor_id: number
          player_id: string
          race_id: number
          submitted_at: string
        }
        SetofOptions: {
          from: "*"
          to: "picks"
          isOneToOne: true
          isSetofReturn: false
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
