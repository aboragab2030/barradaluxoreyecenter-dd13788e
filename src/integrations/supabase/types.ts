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
      app_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          addresses: string[] | null
          app_name: string
          created_at: string
          facebook_url: string | null
          hero_description: string | null
          hero_title: string | null
          id: string
          language: string | null
          logo_url: string | null
          map_location_url: string | null
          patient_mode: boolean | null
          payment_methods: Json | null
          phones: string[] | null
          reminder_settings: Json | null
          stats: Json | null
          terms_ar: string | null
          terms_en: string | null
          updated_at: string
          whatsapp_number: string | null
          working_hours: Json | null
        }
        Insert: {
          addresses?: string[] | null
          app_name?: string
          created_at?: string
          facebook_url?: string | null
          hero_description?: string | null
          hero_title?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          map_location_url?: string | null
          patient_mode?: boolean | null
          payment_methods?: Json | null
          phones?: string[] | null
          reminder_settings?: Json | null
          stats?: Json | null
          terms_ar?: string | null
          terms_en?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          working_hours?: Json | null
        }
        Update: {
          addresses?: string[] | null
          app_name?: string
          created_at?: string
          facebook_url?: string | null
          hero_description?: string | null
          hero_title?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          map_location_url?: string | null
          patient_mode?: boolean | null
          payment_methods?: Json | null
          phones?: string[] | null
          reminder_settings?: Json | null
          stats?: Json | null
          terms_ar?: string | null
          terms_en?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          address: string | null
          contracting_company_id: number | null
          contracting_docs: Json | null
          created_at: string
          date: string
          doctor_id: string | null
          doctor_name: string
          id: string
          patient_email: string | null
          patient_name: string
          payment_method: string | null
          payment_status: string | null
          phone: string
          phone2: string | null
          reminder_sent: boolean | null
          reminder_type: string | null
          service: string
          status: string
          time: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contracting_company_id?: number | null
          contracting_docs?: Json | null
          created_at?: string
          date: string
          doctor_id?: string | null
          doctor_name: string
          id?: string
          patient_email?: string | null
          patient_name: string
          payment_method?: string | null
          payment_status?: string | null
          phone: string
          phone2?: string | null
          reminder_sent?: boolean | null
          reminder_type?: string | null
          service: string
          status?: string
          time: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contracting_company_id?: number | null
          contracting_docs?: Json | null
          created_at?: string
          date?: string
          doctor_id?: string | null
          doctor_name?: string
          id?: string
          patient_email?: string | null
          patient_name?: string
          payment_method?: string | null
          payment_status?: string | null
          phone?: string
          phone2?: string | null
          reminder_sent?: boolean | null
          reminder_type?: string | null
          service?: string
          status?: string
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          created_at: string
          date: string
          id: string
          message: string
          name: string
          phone: string
          type: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          message: string
          name: string
          phone: string
          type: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          message?: string
          name?: string
          phone?: string
          type?: string
        }
        Relationships: []
      }
      contracting_companies: {
        Row: {
          created_at: string
          documents: string[] | null
          id: number
          manager_name: string | null
          manager_phone: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documents?: string[] | null
          id?: number
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documents?: string[] | null
          id?: number
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          available_dates: string[] | null
          created_at: string
          current_bookings: number
          education: string | null
          experience: number | null
          fee: number
          follow_up_exam_count: number | null
          follow_up_surgery_count: number | null
          id: string
          image: string | null
          max_patients: number
          name: string
          patients_per_hour: number | null
          rating: number | null
          specialty: string
          top_specialties: string[] | null
          updated_at: string
        }
        Insert: {
          available_dates?: string[] | null
          created_at?: string
          current_bookings?: number
          education?: string | null
          experience?: number | null
          fee?: number
          follow_up_exam_count?: number | null
          follow_up_surgery_count?: number | null
          id?: string
          image?: string | null
          max_patients?: number
          name: string
          patients_per_hour?: number | null
          rating?: number | null
          specialty: string
          top_specialties?: string[] | null
          updated_at?: string
        }
        Update: {
          available_dates?: string[] | null
          created_at?: string
          current_bookings?: number
          education?: string | null
          experience?: number | null
          fee?: number
          follow_up_exam_count?: number | null
          follow_up_surgery_count?: number | null
          id?: string
          image?: string | null
          max_patients?: number
          name?: string
          patients_per_hour?: number | null
          rating?: number | null
          specialty?: string
          top_specialties?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      hero_images: {
        Row: {
          created_at: string
          id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          contracting_company_id: number | null
          cost: number
          created_at: string
          date: string
          doctor_name: string
          id: string
          notes: string | null
          patient_email: string | null
          patient_name: string
          patient_phone: string
          patient_phone2: string | null
          reminder_sent: boolean | null
          status: string
          surgery_type: string
          updated_at: string
        }
        Insert: {
          contracting_company_id?: number | null
          cost?: number
          created_at?: string
          date: string
          doctor_name: string
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name: string
          patient_phone: string
          patient_phone2?: string | null
          reminder_sent?: boolean | null
          status?: string
          surgery_type: string
          updated_at?: string
        }
        Update: {
          contracting_company_id?: number | null
          cost?: number
          created_at?: string
          date?: string
          doctor_name?: string
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name?: string
          patient_phone?: string
          patient_phone2?: string | null
          reminder_sent?: boolean | null
          status?: string
          surgery_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_notifications: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_read: boolean
          message: string
          patient_name: string
          payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          patient_name: string
          payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          patient_name?: string
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_notifications_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          id: string
          matched_at: string | null
          notes: string | null
          patient_name: string
          patient_phone: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          payment_type_detail: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          id?: string
          matched_at?: string | null
          notes?: string | null
          patient_name: string
          patient_phone?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          payment_type_detail?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          matched_at?: string | null
          notes?: string | null
          patient_name?: string
          patient_phone?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          payment_type_detail?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          login_username: string | null
          name: string
          permissions: Json | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          login_username?: string | null
          name: string
          permissions?: Json | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          login_username?: string | null
          name?: string
          permissions?: Json | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          price: number
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          price?: number
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          price?: number
          title?: string
          updated_at?: string
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
      app_settings_public: {
        Row: {
          app_name: string | null
          created_at: string | null
          hero_description: string | null
          hero_title: string | null
          id: string | null
          language: string | null
          logo_url: string | null
          patient_mode: boolean | null
          stats: Json | null
          terms_ar: string | null
          terms_en: string | null
          working_hours: Json | null
        }
        Insert: {
          app_name?: string | null
          created_at?: string | null
          hero_description?: string | null
          hero_title?: string | null
          id?: string | null
          language?: string | null
          logo_url?: string | null
          patient_mode?: boolean | null
          stats?: Json | null
          terms_ar?: string | null
          terms_en?: string | null
          working_hours?: Json | null
        }
        Update: {
          app_name?: string | null
          created_at?: string | null
          hero_description?: string | null
          hero_title?: string | null
          id?: string | null
          language?: string | null
          logo_url?: string | null
          patient_mode?: boolean | null
          stats?: Json | null
          terms_ar?: string | null
          terms_en?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_bookings_by_phone: {
        Args: { phone_number: string }
        Returns: {
          booking_date: string
          booking_id: string
          booking_status: string
          booking_time: string
          created_at: string
          doctor_name: string
          service: string
        }[]
      }
      get_user_by_login_username: {
        Args: { p_login_username: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
      payment_status: "pending" | "paid" | "failed"
      payment_type: "wallet" | "instapay" | "fawry" | "other"
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
      app_role: ["admin", "staff"],
      payment_status: ["pending", "paid", "failed"],
      payment_type: ["wallet", "instapay", "fawry", "other"],
    },
  },
} as const
