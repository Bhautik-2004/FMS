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
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          initial_balance: number
          current_balance: number
          currency: string
          color: string | null
          icon: string | null
          institution_name: string | null
          account_number_last4: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          initial_balance?: number
          current_balance?: number
          currency?: string
          color?: string | null
          icon?: string | null
          institution_name?: string | null
          account_number_last4?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          initial_balance?: number
          current_balance?: number
          currency?: string
          color?: string | null
          icon?: string | null
          institution_name?: string | null
          account_number_last4?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          name: string
          amount: number
          period: string
          start_date: string
          end_date: string | null
          alert_threshold: number
          alert_enabled: boolean
          rollover_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          name: string
          amount: number
          period: string
          start_date: string
          end_date?: string | null
          alert_threshold?: number
          alert_enabled?: boolean
          rollover_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          name?: string
          amount?: number
          period?: string
          start_date?: string
          end_date?: string | null
          alert_threshold?: number
          alert_enabled?: boolean
          rollover_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          color: string
          icon: string | null
          parent_category_id: string | null
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          color?: string
          icon?: string | null
          parent_category_id?: string | null
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          color?: string
          icon?: string | null
          parent_category_id?: string | null
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      financial_goals: {
        Row: {
          id: string
          user_id: string
          name: string
          goal_type: string
          target_amount: number
          current_amount: number
          currency: string
          start_date: string
          target_date: string
          category_id: string | null
          account_id: string | null
          icon: string | null
          color: string
          priority: number
          is_active: boolean
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          goal_type?: string
          target_amount: number
          current_amount?: number
          currency?: string
          start_date?: string
          target_date: string
          category_id?: string | null
          account_id?: string | null
          icon?: string | null
          color?: string
          priority?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          goal_type?: string
          target_amount?: number
          current_amount?: number
          currency?: string
          start_date?: string
          target_date?: string
          category_id?: string | null
          account_id?: string | null
          icon?: string | null
          color?: string
          priority?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_goals_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_goals_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          }
        ]
      }
      goal_contributions: {
        Row: {
          id: string
          goal_id: string
          transaction_id: string | null
          amount: number
          type: string
          date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          transaction_id?: string | null
          amount: number
          type?: string
          date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          transaction_id?: string | null
          amount?: number
          type?: string
          date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_transaction_id_fkey"
            columns: ["transaction_id"]
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          }
        ]
      }
      goal_milestones: {
        Row: {
          id: string
          goal_id: string
          name: string
          target_amount: number
          is_achieved: boolean
          achieved_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          name: string
          target_amount: number
          is_achieved?: boolean
          achieved_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          name?: string
          target_amount?: number
          is_achieved?: boolean
          achieved_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          }
        ]
      }
      insights: {
        Row: {
          id: string
          user_id: string
          type: string
          severity: string
          priority: string
          title: string
          description: string
          value: number | null
          metadata: Json
          actionable: boolean
          actions: Json
          dismissed: boolean
          dismissed_at: string | null
          snoozed_until: string | null
          helpful: boolean | null
          feedback_at: string | null
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          severity: string
          priority: string
          title: string
          description: string
          value?: number | null
          metadata?: Json
          actionable?: boolean
          actions?: Json
          dismissed?: boolean
          dismissed_at?: string | null
          snoozed_until?: string | null
          helpful?: boolean | null
          feedback_at?: string | null
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          severity?: string
          priority?: string
          title?: string
          description?: string
          value?: number | null
          metadata?: Json
          actionable?: boolean
          actions?: Json
          dismissed?: boolean
          dismissed_at?: string | null
          snoozed_until?: string | null
          helpful?: boolean | null
          feedback_at?: string | null
          created_at?: string
          expires_at?: string | null
        }
        Relationships: []
      }
      insight_history: {
        Row: {
          id: string
          insight_id: string
          user_id: string
          event_type: string
          event_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          insight_id: string
          user_id: string
          event_type: string
          event_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          insight_id?: string
          user_id?: string
          event_type?: string
          event_data?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_history_insight_id_fkey"
            columns: ["insight_id"]
            referencedRelation: "insights"
            referencedColumns: ["id"]
          }
        ]
      }
      recurring_transactions: {
        Row: {
          id: string
          user_id: string
          template_transaction_id: string | null
          frequency: string
          interval: number
          day_of_month: number | null
          day_of_week: number | null
          start_date: string
          end_date: string | null
          occurrence_count: number | null
          next_occurrence_date: string
          last_generated_date: string | null
          template_data: Json
          is_active: boolean
          auto_approve: boolean
          notification_enabled: boolean
          notification_days_before: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_transaction_id?: string | null
          frequency?: string
          interval?: number
          day_of_month?: number | null
          day_of_week?: number | null
          start_date: string
          end_date?: string | null
          occurrence_count?: number | null
          next_occurrence_date: string
          last_generated_date?: string | null
          template_data: Json
          is_active?: boolean
          auto_approve?: boolean
          notification_enabled?: boolean
          notification_days_before?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_transaction_id?: string | null
          frequency?: string
          interval?: number
          day_of_month?: number | null
          day_of_week?: number | null
          start_date?: string
          end_date?: string | null
          occurrence_count?: number | null
          next_occurrence_date?: string
          last_generated_date?: string | null
          template_data?: Json
          is_active?: boolean
          auto_approve?: boolean
          notification_enabled?: boolean
          notification_days_before?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_template_transaction_id_fkey"
            columns: ["template_transaction_id"]
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      recurring_occurrences: {
        Row: {
          id: string
          recurring_id: string
          generated_transaction_id: string | null
          expected_date: string
          actual_date: string | null
          status: string
          amount_variance: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recurring_id: string
          generated_transaction_id?: string | null
          expected_date: string
          actual_date?: string | null
          status?: string
          amount_variance?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recurring_id?: string
          generated_transaction_id?: string | null
          expected_date?: string
          actual_date?: string | null
          status?: string
          amount_variance?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_occurrences_recurring_id_fkey"
            columns: ["recurring_id"]
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_occurrences_generated_transaction_id_fkey"
            columns: ["generated_transaction_id"]
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          category_id: string | null
          amount: number
          type: string
          description: string | null
          merchant_name: string | null
          date: string
          is_recurring: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          category_id?: string | null
          amount: number
          type: string
          description?: string | null
          merchant_name?: string | null
          date: string
          is_recurring?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          category_id?: string | null
          amount?: number
          type?: string
          description?: string | null
          merchant_name?: string | null
          date?: string
          is_recurring?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          currency: string
          date_format: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          currency?: string
          date_format?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          currency?: string
          date_format?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_recurring_occurrence: {
        Args: {
          p_user_id: string
          p_occurrence_id: string
          p_actual_amount?: number
          p_actual_date?: string
        }
        Returns: string
      }
      calculate_goal_progress: {
        Args: {
          p_goal_id: string
        }
        Returns: {
          goal_id: string
          target_amount: number
          current_amount: number
          progress_percentage: number
          remaining_amount: number
          is_completed: boolean
          days_remaining: number
          days_elapsed: number
          total_days: number
          average_daily_progress: number
          on_track: boolean
        }[]
      }
      calculate_next_occurrence_date: {
        Args: {
          p_current_date: string
          p_frequency: string
          p_interval: number
          p_day_of_month?: number
          p_day_of_week?: number
        }
        Returns: string
      }
      dismiss_insight: {
        Args: {
          p_insight_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      generate_pending_recurring_transactions: {
        Args: {
          p_up_to_date?: string
          p_days_ahead?: number
        }
        Returns: {
          recurring_id: string
          transaction_id: string
          expected_date: string
          status: string
          message: string
        }[]
      }
      get_active_insights: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          user_id: string
          type: string
          severity: string
          priority: string
          title: string
          description: string
          value: number | null
          metadata: Json
          actionable: boolean
          actions: Json
          dismissed: boolean
          dismissed_at: string | null
          snoozed_until: string | null
          helpful: boolean | null
          feedback_at: string | null
          created_at: string
          expires_at: string | null
        }[]
      }
      get_insight_analytics: {
        Args: {
          p_user_id: string
          p_days?: number
        }
        Returns: {
          total_insights: number
          dismissed_count: number
          helpful_count: number
          not_helpful_count: number
          actions_taken: number
          insights_by_type: Json
          insights_by_priority: Json
          engagement_rate: number
        }[]
      }
      get_pending_notifications: {
        Args: {
          p_date?: string
        }
        Returns: {
          user_id: string
          recurring_id: string
          occurrence_id: string
          expected_date: string
          days_until: string
          notification_days_before: number
          template_data: Json
          user_email: string
        }[]
      }
      get_user_goals_summary: {
        Args: {
          p_user_id: string
        }
        Returns: {
          total_goals: number
          active_goals: number
          completed_goals: number
          total_target_amount: number
          total_current_amount: number
          overall_progress: number
          on_track_goals: number
          behind_schedule_goals: number
          total_contributions_30d: number
        }[]
      }
      get_recurring_transaction_history: {
        Args: {
          p_user_id: string
          p_recurring_id: string
        }
        Returns: {
          id: string
          expected_date: string
          actual_date: string | null
          status: string
          amount_variance: number
          transaction_id: string | null
          transaction_amount: number | null
          notes: string | null
        }[]
      }
      get_upcoming_recurring_transactions: {
        Args: {
          p_user_id: string
          p_days_ahead?: number
        }
        Returns: {
          id: string
          template_data: Json
          next_occurrence_date: string
          frequency: string
          amount: number
          merchant: string
          category_id: string
          is_active: boolean
        }[]
      }
      mark_insight_helpful: {
        Args: {
          p_insight_id: string
          p_user_id: string
          p_helpful: boolean
        }
        Returns: boolean
      }
      record_insight_action: {
        Args: {
          p_insight_id: string
          p_user_id: string
          p_action_type: string
          p_action_data?: Json
        }
        Returns: boolean
      }
      project_goal_completion_date: {
        Args: {
          p_goal_id: string
          p_projection_method?: string
        }
        Returns: {
          projected_date: string
          days_until_completion: number
          confidence_level: string
          based_on: string
        }[]
      }
      skip_recurring_occurrence: {
        Args: {
          p_user_id: string
          p_occurrence_id: string
          p_reason?: string
        }
        Returns: boolean
      }
      snooze_insight: {
        Args: {
          p_insight_id: string
          p_user_id: string
          p_days: number
        }
        Returns: boolean
      }
      suggest_monthly_contribution: {
        Args: {
          p_goal_id: string
        }
        Returns: {
          required_monthly: number
          recommended_monthly: number
          current_monthly_avg: number
          months_remaining: number
          suggested_adjustment: number
          is_achievable: boolean
          notes: string
        }[]
      }
      create_standard_milestones: {
        Args: {
          p_goal_id: string
        }
        Returns: undefined
      }
      check_goal_milestones: {
        Args: {
          p_goal_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      frequency_type: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "custom"
      occurrence_status: "pending" | "generated" | "skipped" | "modified"
      goal_type: "savings" | "debt_payoff" | "net_worth" | "investment"
      contribution_type: "manual" | "automatic" | "transaction"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

// Convenient type exports
export type Account = Database['public']['Tables']['accounts']['Row'];
export type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
export type AccountUpdate = Database['public']['Tables']['accounts']['Update'];

export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

// Enums
export type AccountType = string; // Will be properly typed after migration
export type CategoryType = string;
export type TransactionType = string;
export type PaymentMethod = string;

// Extended types with relations
export interface CategoryWithStats extends Category {
  transaction_count?: number;
  total_amount?: number;
  children?: CategoryWithStats[];
}
