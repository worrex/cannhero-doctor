export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      doctors: {
        Row: {
          id: string
          email: string
          full_name: string
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          external_id: string
          full_name: string
          email: string
          date_of_birth: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_id: string
          full_name: string
          email: string
          date_of_birth: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_id?: string
          full_name?: string
          email?: string
          date_of_birth?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      request_status: "new" | "approved" | "denied" | "info_requested"
    }
  }
}
