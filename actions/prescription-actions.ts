"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function getPrescriptionRequests() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("prescription_requests")
      .select(`
        id,
        external_id,
        status,
        medical_condition,
        preferences,
        medication_history,
        additional_notes,
        doctor_notes,
        created_at,
        patient_id,
        user_id,
        total_amount
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching prescription requests:", error)
      return []
    }

    if (data.length === 0) {
      return [];
    }
    
    // Collect user IDs either from patient relationships or direct user_id
    const directUserIds = data
      .filter(request => request.user_id)
      .map(request => request.user_id);
      
    // We need to get user information separately because of the schema structure
    const patientIds = data
      .filter(request => request.patient_id)
      .map(request => request.patient_id);
    
    // Define types for better type safety
    type User = {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    };

    type Patient = {
      id: string;
      user_id: string;
      birth_date: string | null;
    };

    // Get patient data if we have patient IDs
    let patientsWithUsers: Patient[] = [];
    if (patientIds.length > 0) {
      const { data: patientsData, error: userError } = await supabase
        .from("patients")
        .select(`
          id,
          birth_date,
          user_id
        `)
        .in('id', patientIds);
  
      if (userError) {
        console.error("Error fetching patient users:", userError);
      } else {
        patientsWithUsers = patientsData;
      }
    }

    // Get user info for both direct user IDs and patient-related user IDs
    const patientUserIds = patientsWithUsers.map(patient => patient.user_id);
    const allUserIds = [...new Set([...directUserIds, ...patientUserIds])];
    
    let users: User[] = [];
    if (allUserIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          id,
          first_name,
          last_name,
          email
        `)
        .in('id', allUserIds);
  
      if (usersError) {
        console.error("Error fetching users:", usersError);
      } else {
        users = usersData;
      }
    }

    // Create lookup maps for faster access
    const userMap = new Map(users.map(u => [u.id, u]));
    const patientMap = new Map(patientsWithUsers.map(p => [p.id, p]));

    // Transform the data to match the expected format
    const transformedData = data.map((request: any) => {
      let user;
      let patient;
      let age = 0;
      
      // First check if we have a direct user_id
      if (request.user_id) {
        user = userMap.get(request.user_id) as User | undefined || { id: '', first_name: null, last_name: null, email: '' };
        patient = { id: '', user_id: request.user_id, birth_date: null };
      } 
      // Then try patient relationship
      else if (request.patient_id) {
        patient = patientMap.get(request.patient_id) as Patient | undefined || { id: '', user_id: '', birth_date: null };
        user = userMap.get(patient.user_id) as User | undefined || { id: '', first_name: null, last_name: null, email: '' };
        
        if (patient.birth_date) {
          const birthDate = new Date(patient.birth_date);
          age = new Date().getFullYear() - birthDate.getFullYear();
        }
      } 
      // Fallback to empty user if neither is available
      else {
        user = { id: '', first_name: null, last_name: null, email: '' };
        patient = { id: '', user_id: '', birth_date: null };
      }
      
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown";

      return {
        id: request.id,
        external_id: request.external_id || request.id.substring(0, 8), // Use external_id or part of UUID as external ID
        patientId: request.patient_id || '',
        userId: request.user_id || '',
        patientName: fullName,
        age: age,
        requestDate: request.created_at,
        status: request.status,
        medicalCondition: request.medical_condition,
        preferences: request.preferences || "",
        medicationHistory: request.medication_history || "",
        additionalNotes: request.additional_notes || "",
        doctorNotes: request.doctor_notes || "",
        totalAmount: request.total_amount || 0,
        profileImage: `/placeholder.svg?height=64&width=64&query=${encodeURIComponent(fullName)}`,
      }
    })

    return transformedData
  } catch (error) {
    console.error("Error in getPrescriptionRequests:", error)
    return []
  }
}

export async function getPendingPrescriptions() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("prescriptions")
      .select(`
        id,
        patient_id,
        doctor_id,
        status,
        prescription_plan,
        prescription_date,
        total_amount,
        notes,
        created_at
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching pending prescriptions:", error)
      return { success: false, error: error.message, data: [] }
    }

    // Get patient data for these prescriptions
    const patientIds = data.map(prescription => prescription.patient_id);
    
    if (patientIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get all patients
    const { data: patients, error: patientError } = await supabase
      .from("patients")
      .select(`
        id,
        user_id,
        birth_date
      `)
      .in('id', patientIds);

    if (patientError) {
      console.error("Error fetching patients:", patientError);
      return { success: false, error: patientError.message, data: [] };
    }

    // Get user data for these patients
    const userIds = patients.map(patient => patient.user_id);
    
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(`
        id,
        first_name,
        last_name,
        email
      `)
      .in('id', userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return { success: false, error: usersError.message, data: [] };
    }

    // Create lookup maps for faster access
    const userMap = new Map(users.map(u => [u.id, u]));
    const patientMap = new Map(patients.map(p => [p.id, p]));

    // Transform the data to match the expected format
    const transformedData = data.map((prescription) => {
      const patient = patientMap.get(prescription.patient_id) || { id: '', user_id: '', birth_date: null };
      const user = userMap.get(patient.user_id) || { id: '', first_name: null, last_name: null, email: '' };
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown";
      const birthDate = patient.birth_date ? new Date(patient.birth_date) : new Date();
      const age = birthDate ? new Date().getFullYear() - birthDate.getFullYear() : 0;

      return {
        id: prescription.id,
        patientId: prescription.patient_id,
        doctorId: prescription.doctor_id,
        patientName: fullName,
        patientExternalId: prescription.id.substring(0, 8), // Use part of UUID as external ID
        age: age,
        requestDate: prescription.created_at,
        status: prescription.status,
        prescriptionPlan: prescription.prescription_plan,
        prescriptionDate: prescription.prescription_date,
        totalAmount: prescription.total_amount,
        notes: prescription.notes,
        profileImage: `/placeholder.svg?height=64&width=64&query=${encodeURIComponent(fullName)}`,
      }
    })

    return { success: true, data: transformedData }
  } catch (error) {
    console.error("Error in getPendingPrescriptions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    }
  }
}

export async function getApprovedPrescriptions() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("prescriptions")
      .select(`
        id,
        patient_id,
        doctor_id,
        status,
        prescription_plan,
        prescription_date,
        total_amount,
        notes,
        created_at
      `)
      .eq("status", "approved")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching approved prescriptions:", error)
      return { success: false, error: error.message, data: [] }
    }
    
    // Get patient data for these prescriptions
    const patientIds = data.map(prescription => prescription.patient_id);
    
    if (patientIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get all patients
    const { data: patients, error: patientError } = await supabase
      .from("patients")
      .select(`
        id,
        user_id,
        birth_date
      `)
      .in('id', patientIds);

    if (patientError) {
      console.error("Error fetching patients:", patientError);
      return { success: false, error: patientError.message, data: [] };
    }

    // Get user data for these patients
    const userIds = patients.map(patient => patient.user_id);
    
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(`
        id,
        first_name,
        last_name,
        email
      `)
      .in('id', userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return { success: false, error: usersError.message, data: [] };
    }

    // Create lookup maps for faster access
    const userMap = new Map(users.map(u => [u.id, u]));
    const patientMap = new Map(patients.map(p => [p.id, p]));

    // Transform the data to match the expected format
    const transformedData = data.map((prescription) => {
      const patient = patientMap.get(prescription.patient_id) || { id: '', user_id: '', birth_date: null };
      const user = userMap.get(patient.user_id) || { id: '', first_name: null, last_name: null, email: '' };
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown";
      const birthDate = patient.birth_date ? new Date(patient.birth_date) : new Date();
      const age = birthDate ? new Date().getFullYear() - birthDate.getFullYear() : 0;

      return {
        id: prescription.id,
        patientId: prescription.patient_id,
        doctorId: prescription.doctor_id,
        patientName: fullName,
        patientExternalId: prescription.id.substring(0, 8), // Use part of UUID as external ID
        age: age,
        requestDate: prescription.created_at,
        status: prescription.status,
        prescriptionPlan: prescription.prescription_plan,
        prescriptionDate: prescription.prescription_date,
        totalAmount: prescription.total_amount,
        notes: prescription.notes,
        profileImage: `/placeholder.svg?height=64&width=64&query=${encodeURIComponent(fullName)}`,
      }
    })

    return { success: true, data: transformedData }
  } catch (error) {
    console.error("Error in getApprovedPrescriptions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    }
  }
}

export async function requestAdditionalInfo(id: string, notes: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Update the prescription request status and add doctor notes
    const { error } = await supabase
      .from("prescription_requests")
      .update({
        status: "info_requested",
        doctor_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)

    if (error) {
      console.error("Error requesting additional info:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/dashboard")
    revalidatePath("/prescriptions/open")
    return { success: true }
  } catch (error) {
    console.error("Error in requestAdditionalInfo:", error)
    return { success: false, error: "Database error" }
  }
}

export async function approvePrescription(id: string, notes?: string) {
  try {
    const supabase = await createServerSupabaseClient();
    console.log("Approving prescription with ID:", id)

    // First, check if this is a prescription (not a request) that we're trying to approve
    const { data: prescriptionData, error: prescriptionError } = await supabase
      .from("prescriptions")
      .select("id, patient_id, doctor_id, status")
      .eq("id", id)

    if (prescriptionError) {
      console.error("Error checking prescription:", prescriptionError)
    }

    // If we found a prescription with this ID, update it directly
    if (prescriptionData && prescriptionData.length > 0) {
      console.log("Found existing prescription, updating status")
      const { error: updateError } = await supabase
        .from("prescriptions")
        .update({
          status: "approved",
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (updateError) {
        console.error("Error updating prescription:", updateError)
        return { success: false, error: updateError.message }
      }

      revalidatePath("/dashboard")
      revalidatePath("/prescriptions/open")
      revalidatePath("/prescriptions/approved")
      return { success: true }
    }

    // If not found in prescriptions, check prescription_requests
    const { data: requestDataArray, error: requestError } = await supabase
      .from("prescription_requests")
      .select("id, patient_id, doctor_id")
      .eq("id", id)

    if (requestError) {
      console.error("Error fetching prescription request:", requestError)
      return { success: false, error: requestError.message }
    }

    // Check if we got any results from prescription_requests
    if (!requestDataArray || requestDataArray.length === 0) {
      console.error("No prescription request or prescription found with ID:", id)
      return {
        success: false,
        error:
          "No prescription request or prescription found with this ID. The record may have been deleted or modified.",
      }
    }

    // Use the first result from prescription_requests
    const requestData = requestDataArray[0]
    console.log("Found prescription request:", requestData)

    // Update the prescription request status
    const { error: updateError } = await supabase
      .from("prescription_requests")
      .update({
        status: "approved",
        doctor_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error approving prescription request:", updateError)
      return { success: false, error: updateError.message }
    }

    // Create a new prescription record
    const { error: createError } = await supabase.from("prescriptions").insert({
      patient_id: requestData.patient_id,
      doctor_id: requestData.doctor_id || null, // Handle case where doctor_id might be null
      status: "approved",
      notes: notes || null,
      prescription_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      has_agreed_agb: true, // Required field in the schema
      has_agreed_privacy_policy: true // Required field in the schema
    })

    if (createError) {
      console.error("Error creating prescription:", createError)
      // Rollback the update if creating the prescription fails
      await supabase
        .from("prescription_requests")
        .update({ status: "new", updated_at: new Date().toISOString() })
        .eq("id", id)
      return { success: false, error: createError.message }
    }

    console.log("Successfully approved prescription request and created prescription")

    revalidatePath("/dashboard")
    revalidatePath("/prescriptions/open")
    revalidatePath("/prescriptions/approved")
    return { success: true }
  } catch (error) {
    console.error("Error in approvePrescription:", error)
    return { success: false, error: error instanceof Error ? error.message : "Database error" }
  }
}

export async function denyPrescription(id: string, notes?: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Step 1: Get the prescription request data
    const { data: requestData, error: requestError } = await supabase
      .from("prescription_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError) {
      console.error("Error fetching prescription request:", requestError);
      return { success: false, error: requestError.message };
    }

    // Step 2: Update the prescription request status
    const { error: updateError } = await supabase
      .from("prescription_requests")
      .update({
        status: "denied",
        doctor_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error denying prescription:", updateError)
      return { success: false, error: updateError.message }
    }

    revalidatePath("/dashboard")
    revalidatePath("/prescriptions/open")
    revalidatePath("/prescriptions/denied")
    return { success: true }
  } catch (error) {
    console.error("Error in denyPrescription:", error)
    return { success: false, error: error instanceof Error ? error.message : "Database error" }
  }
}
