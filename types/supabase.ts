export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          phone_number: string | null
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          phone_number?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone_number?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'doctor' | 'patient'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'doctor' | 'patient'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'doctor' | 'patient'
          created_at?: string
          updated_at?: string
        }
      }
      doctors: {
        Row: {
          id: string
          user_id: string
          title: string | null
          specialty: string | null
          license_number: string | null
          phone_number: string | null
          address: Json | null
          is_verified: boolean
          verification_documents: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          specialty?: string | null
          license_number?: string | null
          phone_number?: string | null
          address?: Json | null
          is_verified?: boolean
          verification_documents?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          specialty?: string | null
          license_number?: string | null
          phone_number?: string | null
          address?: Json | null
          is_verified?: boolean
          verification_documents?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          user_id: string
          salutation: string | null
          birth_date: string | null
          address: Json | null
          symptoms: string | null
          takes_medication: boolean | null
          medications: string | null
          has_allergies: boolean | null
          allergies: string | null
          has_chronic_diseases: boolean | null
          chronic_diseases: string | null
          payment_type: string | null
          understands_driving_restriction: boolean | null
          understands_medical_disclosure: boolean | null
          is_verified: boolean
          verification_documents: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          salutation?: string | null
          birth_date?: string | null
          address?: Json | null
          symptoms?: string | null
          takes_medication?: boolean | null
          medications?: string | null
          has_allergies?: boolean | null
          allergies?: string | null
          has_chronic_diseases?: boolean | null
          chronic_diseases?: string | null
          payment_type?: string | null
          understands_driving_restriction?: boolean | null
          understands_medical_disclosure?: boolean | null
          is_verified?: boolean
          verification_documents?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          salutation?: string | null
          birth_date?: string | null
          address?: Json | null
          symptoms?: string | null
          takes_medication?: boolean | null
          medications?: string | null
          has_allergies?: boolean | null
          allergies?: string | null
          has_chronic_diseases?: boolean | null
          chronic_diseases?: string | null
          payment_type?: string | null
          understands_driving_restriction?: boolean | null
          understands_medical_disclosure?: boolean | null
          is_verified?: boolean
          verification_documents?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      prescription_requests: {
        Row: {
          id: string
          external_id: string
          patient_id: string
          status: "new" | "approved" | "denied" | "info_requested"
          medical_condition: string
          preferences: string | null
          medication_history: string | null
          additional_notes: string | null
          doctor_id: string | null
          doctor_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_id: string
          patient_id: string
          status?: "new" | "approved" | "denied" | "info_requested"
          medical_condition: string
          preferences?: string | null
          medication_history?: string | null
          additional_notes?: string | null
          doctor_id?: string | null
          doctor_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_id?: string
          patient_id?: string
          status?: "new" | "approved" | "denied" | "info_requested"
          medical_condition?: string
          preferences?: string | null
          medication_history?: string | null
          additional_notes?: string | null
          doctor_id?: string | null
          doctor_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          thc_percentage: number | null
          cbd_percentage: number | null
          genetics: string | null
          price_per_gram: number
          effects: string[] | null
          terpenes: string[] | null
          tags: string[] | null
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          thc_percentage?: number | null
          cbd_percentage?: number | null
          genetics?: string | null
          price_per_gram: number
          effects?: string[] | null
          terpenes?: string[] | null
          tags?: string[] | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          thc_percentage?: number | null
          cbd_percentage?: number | null
          genetics?: string | null
          price_per_gram?: number
          effects?: string[] | null
          terpenes?: string[] | null
          tags?: string[] | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      pharmacies: {
        Row: {
          id: string
          name: string
          address: Json
          city: string
          postal_code: string
          hours: Json | null
          shipping_methods: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: Json
          city: string
          postal_code: string
          hours?: Json | null
          shipping_methods?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: Json
          city?: string
          postal_code?: string
          hours?: Json | null
          shipping_methods?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      prescriptions: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          pharmacy_id: string | null
          status: "pending" | "approved" | "denied" | "completed"
          denial_reason: string | null
          prescription_plan: string | null
          prescription_date: string | null
          total_amount: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          pharmacy_id?: string | null
          status: "pending" | "approved" | "denied" | "completed"
          denial_reason?: string | null
          prescription_plan?: string | null
          prescription_date?: string | null
          total_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          pharmacy_id?: string | null
          status?: "pending" | "approved" | "denied" | "completed"
          denial_reason?: string | null
          prescription_plan?: string | null
          prescription_date?: string | null
          total_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prescription_products: {
        Row: {
          id: string
          prescription_id: string
          product_id: string
          quantity_grams: number
          price_per_gram: number
          total_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prescription_id: string
          product_id: string
          quantity_grams: number
          price_per_gram: number
          total_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prescription_id?: string
          product_id?: string
          quantity_grams?: number
          price_per_gram?: number
          total_price?: number
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          prescription_id: string
          amount: number
          payment_method: string
          status: "pending" | "completed" | "failed" | "refunded"
          transaction_id: string | null
          payment_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prescription_id: string
          amount: number
          payment_method: string
          status: "pending" | "completed" | "failed" | "refunded"
          transaction_id?: string | null
          payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prescription_id?: string
          amount?: number
          payment_method?: string
          status?: "pending" | "completed" | "failed" | "refunded"
          transaction_id?: string | null
          payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          event_type: string
          event_data: Json
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          event_data: Json
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          event_data?: Json
          user_id?: string | null
          created_at?: string
        }
      }
      carts: {
        Row: {
          id: string
          user_id: string
          items: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          items?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          items?: Json
          created_at?: string
          updated_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          table_name: string
          record_id: string
          operation: string
          changed_by: string | null
          change_data: Json | null
          changed_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          operation: string
          changed_by?: string | null
          change_data?: Json | null
          changed_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          operation?: string
          changed_by?: string | null
          change_data?: Json | null
          changed_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_modified_column: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      log_audit: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      request_status: "new" | "approved" | "denied" | "info_requested"
    }
  }
}
