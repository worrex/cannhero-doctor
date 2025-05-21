"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

// Helper function to get patient names from user IDs
export async function getPatientNames(patientIds: string[]) {
  try {
    if (!patientIds || patientIds.length === 0) {
      return { success: true, data: new Map() }
    }

    const supabase = await createServerSupabaseClient()
    
    // First get the patients with their user_ids
    const { data: patients, error: patientError } = await supabase
      .from("patients")
      .select("id, user_id")
      .in("id", patientIds)
    
    if (patientError) {
      console.error("Error fetching patients:", patientError)
      return { success: false, error: patientError.message }
    }
    
    // Exit early if no patients found
    if (!patients || patients.length === 0) {
      console.log("No patients found for IDs:", patientIds)
      return { success: true, data: new Map() }
    }
    
    // Get all valid user IDs
    const userIds = patients
      .map(p => p.user_id)
      .filter(Boolean) // Remove any null/undefined IDs
    
    console.log(`Found ${patients.length} patients with ${userIds.length} valid user IDs`)
    
    if (userIds.length === 0) {
      return { success: true, data: new Map() }
    }
    
    // Get user names
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", userIds)
    
    if (userError) {
      console.error("Error fetching users:", userError)
      return { success: false, error: userError.message }
    }
    
    console.log(`Found ${users?.length || 0} users for the patients`)
    
    // Create a patient to user mapping
    const patientToUserMap = new Map()
    patients.forEach(patient => {
      patientToUserMap.set(patient.id, patient.user_id)
    })
    
    // Create a user map for quick lookup
    const userMap = new Map()
    users?.forEach(user => {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim()
      userMap.set(user.id, fullName || "Unknown")
    })
    
    // Create the final patient to name mapping
    const patientNameMap = new Map()
    patientIds.forEach(patientId => {
      const userId = patientToUserMap.get(patientId)
      if (userId) {
        patientNameMap.set(patientId, userMap.get(userId) || "Unknown")
      } else {
        patientNameMap.set(patientId, "Unknown")
      }
    })
    
    return { success: true, data: patientNameMap }
  } catch (error) {
    console.error("Error in getPatientNames:", error)
    return { success: false, error: String(error) }
  }
}

// Function to get a single patient's information including name
export async function getPatientInfo(patientId: string) {
  try {
    if (!patientId) {
      return { success: false, error: "No patient ID provided" }
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Get the patient record
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, user_id, birth_date")
      .eq("id", patientId)
      .single()
    
    if (patientError) {
      console.error("Error fetching patient:", patientError)
      return { success: false, error: patientError.message }
    }
    
    if (!patient || !patient.user_id) {
      return { success: false, error: "Patient not found or no user associated" }
    }
    
    // Get the user record
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .eq("id", patient.user_id)
      .single()
    
    if (userError) {
      console.error("Error fetching user:", userError)
      return { success: false, error: userError.message }
    }
    
    const fullName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Unknown"
    
    // Calculate age if we have birth date
    let age = 0
    if (patient.birth_date) {
      const birthDate = new Date(patient.birth_date)
      age = new Date().getFullYear() - birthDate.getFullYear()
    }
    
    return {
      success: true,
      data: {
        id: patient.id,
        userId: patient.user_id,
        name: fullName,
        age,
        email: user?.email || "",
        firstName: user?.first_name || "",
        lastName: user?.last_name || ""
      }
    }
  } catch (error) {
    console.error("Error in getPatientInfo:", error)
    return { success: false, error: String(error) }
  }
}
