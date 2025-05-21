"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

// This function will help us determine why patient names aren't showing
export async function testUserFetching() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // 1. Get all prescriptions
    const { data: prescriptions } = await supabase
      .from("prescriptions")
      .select("id, patient_id")
      .limit(5)
    
    if (!prescriptions || prescriptions.length === 0) {
      return { success: false, message: "No prescriptions found" }
    }
    
    const results = []
    
    // 2. For each prescription, trace the path from prescription → patient → user
    for (const prescription of prescriptions) {
      const prescriptionId = prescription.id
      const patientId = prescription.patient_id
      
      // Get the patient record
      const { data: patient } = await supabase
        .from("patients")
        .select("id, user_id, birth_date")
        .eq("id", patientId)
        .single()
      
      if (!patient) {
        results.push({
          prescriptionId,
          patientId,
          error: "Patient not found"
        })
        continue
      }
      
      const userId = patient.user_id
      
      // Get the user record
      const { data: user } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("id", userId)
        .single()
      
      results.push({
        prescriptionId,
        patientId,
        patient,
        userId,
        user: user || "User not found"
      })
    }
    
    return { success: true, data: results }
  } catch (error) {
    console.error("Error in testUserFetching:", error)
    return { success: false, error: String(error) }
  }
}
