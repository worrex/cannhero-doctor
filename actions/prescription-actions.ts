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
        console.log(`Found ${users.length} users in database`);
      }
    }

    // Create lookup maps for faster access
    const userMap = new Map(users.map(u => [u.id, u]));
    const patientMap = new Map(patientsWithUsers.map(p => [p.id, p]));

    // Pre-query all missing users and patients to avoid async issues in map
    // First identify any missing users or patients that need to be looked up
    const missingUserIds = [];
    const missingPatientIds = [];
    
    for (const request of data) {
      if (request.user_id && !userMap.has(request.user_id)) {
        missingUserIds.push(request.user_id);
      }
      
      if (request.patient_id && !patientMap.has(request.patient_id)) {
        missingPatientIds.push(request.patient_id);
      }
    }
    
    // Look up missing patients first
    if (missingPatientIds.length > 0) {
      console.log(`Looking up ${missingPatientIds.length} missing patients`);
      const { data: missingPatients } = await supabase
        .from("patients")
        .select("id, user_id, birth_date")
        .in("id", missingPatientIds);
        
      if (missingPatients) {
        for (const patient of missingPatients) {
          patientMap.set(patient.id, patient);
          
          // Add any new user IDs to our missing list
          if (patient.user_id && !userMap.has(patient.user_id)) {
            missingUserIds.push(patient.user_id);
          }
        }
      }
    }
    
    // Now look up any missing users
    if (missingUserIds.length > 0) {
      console.log(`Looking up ${missingUserIds.length} missing users`);
      const { data: missingUsers } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .in("id", missingUserIds);
        
      if (missingUsers) {
        for (const user of missingUsers) {
          userMap.set(user.id, user);
        }
      }
    }

    // Transform the data to match the expected format
    const transformedData = data.map((request: any) => {
      let user;
      let patient: Patient | { id: string; user_id: string | null; birth_date: string | null; } | undefined;
      let age: number | null = null; // MODIFIED: Initialize age to null and type it
      
      // Determine user and patient objects
      if (request.user_id) {
        user = userMap.get(request.user_id) as User | undefined;
        const foundPatient = Array.from(patientMap.values()).find(p => p.user_id === request.user_id);
        if (foundPatient) {
            patient = foundPatient;
        } else {
            patient = { id: '', user_id: request.user_id, birth_date: null };
        }
        user = user || { id: request.user_id, first_name: null, last_name: null, email: '' };

      } else if (request.patient_id) {
        patient = patientMap.get(request.patient_id) as Patient | undefined;
        if (patient?.user_id) {
          user = userMap.get(patient.user_id) as User | undefined;
        }
        user = user || { id: patient?.user_id || '', first_name: null, last_name: null, email: '' };
        patient = patient || { id: request.patient_id, user_id: null, birth_date: null };

      } else {
        user = { id: '', first_name: null, last_name: null, email: '' };
        patient = { id: '', user_id: null, birth_date: null };
      }
      
      user = user || { id: '', first_name: null, last_name: null, email: '' };
      patient = patient || { id: '', user_id: null, birth_date: null };

      // MOVED AND MODIFIED: Calculate age if patient.birth_date is available
      if (patient.birth_date) {
        const birthDate = new Date(patient.birth_date);
        if (!isNaN(birthDate.getTime())) { // Check for valid date
          const today = new Date();
          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
          }
          age = calculatedAge >= 0 ? calculatedAge : null; 
        }
      }
      
      // Better name formatting with proper fallbacks
      let fullName = "Unknown";
      if (user && (user.first_name || user.last_name)) {
        fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
        console.log(`Found user name: ${fullName} for request ${request.id}`);
      } else {
        console.log(`No user name found for request ${request.id}, using Unknown`);
      }

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
        profileImage: `/user-icon.svg`,
        products: request.prescription_request_products?.map((prp: any) => ({
          id: prp.products.id,
          name: prp.products.name,
          quantityGrams: prp.quantity_grams,
          unit: "g",
        })) || [],
      }
    })

    return transformedData
  } catch (error) {
    console.error("Error in getPrescriptionRequests:", error)
    return []
  }
}

export async function getPendingPrescriptions(): Promise<{ success: boolean; error?: string; data: any[] }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: requestsData, error: requestsError } = await supabase
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
        total_amount,
        request_products!inner(
          quantity_grams,
          products!inner(id, name)
        )
      `)
      .in("status", ['new', 'info_requested'])
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching pending prescription requests:", requestsError);
      return { success: false, error: requestsError.message, data: [] };
    }

    if (!requestsData || requestsData.length === 0) {
      return { success: true, data: [] };
    }

    // Get unique patient_ids and user_ids from the requests
    const requestPatientIds = [...new Set(requestsData.map(req => req.patient_id).filter(id => id))];
    const requestUserIds = [...new Set(requestsData.map(req => req.user_id).filter(id => id))];

    let patients: any[] = [];
    if (requestPatientIds.length > 0) {
      const { data: fetchedPatients, error: patientError } = await supabase
        .from("patients")
        .select("id, user_id, birth_date")
        .in('id', requestPatientIds);
      if (patientError) {
        console.error("Error fetching patients:", patientError);
        return { success: false, error: patientError.message, data: [] };
      }
      patients = fetchedPatients || [];
    }

    const patientMap = new Map(patients.map(p => [p.id, p]));

    // Combine all user_ids that need fetching
    const allUserIdsToFetch = [...new Set([
      ...requestUserIds, // user_id directly on the request
      ...patients.map(p => p.user_id).filter(id => id) // user_id from fetched patients
    ])];
    
    let users: any[] = [];
    if (allUserIdsToFetch.length > 0) {
        const { data: fetchedUsers, error: usersError } = await supabase
            .from("users") // Assuming your public user table is named 'users'
            .select("id, first_name, last_name, email")
            .in('id', allUserIdsToFetch);
        if (usersError) {
            console.error("Error fetching users:", usersError);
            return { success: false, error: usersError.message, data: [] };
        }
        users = fetchedUsers || [];
    }
    const userMap = new Map(users.map(u => [u.id, u]));

    // Transform the data
    const transformedData = requestsData.map((request: any) => {
      let userResult: any = { id: '', first_name: null, last_name: null, email: '' };
      let patientResult: any = { id: '', user_id: null, birth_date: null };
      let age: number | null = null;

      if (request.patient_id) {
        patientResult = patientMap.get(request.patient_id) || { id: request.patient_id, user_id: request.user_id, birth_date: null };
        const foundPatientInMap = patientMap.get(request.patient_id);
        if (foundPatientInMap) patientResult = foundPatientInMap; // Prioritize full patient record from map

        if (patientResult && patientResult.user_id) {
          userResult = userMap.get(patientResult.user_id) || { id: patientResult.user_id };
        }
      } else if (request.user_id) { // If no patient_id, use user_id from request
        userResult = userMap.get(request.user_id) || { id: request.user_id };
        // Attempt to find associated patient data if request was linked by user_id
        const foundPatientForUser = patients.find(p => p.user_id === request.user_id);
        if (foundPatientForUser) patientResult = foundPatientForUser;
      }

      if (patientResult && patientResult.birth_date) {
        const birthDateObj = new Date(patientResult.birth_date);
        if (!isNaN(birthDateObj.getTime())) {
          const today = new Date();
          let calculatedAge = today.getFullYear() - birthDateObj.getFullYear();
          const m = today.getMonth() - birthDateObj.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
            calculatedAge--;
          }
          age = calculatedAge >= 0 ? calculatedAge : null;
        }
      }

      const fullName = `${userResult.first_name || ""} ${userResult.last_name || ""}`.trim() || "N/A";

      return {
        id: request.id,
        external_id: request.external_id || request.id.substring(0, 8),
        patientId: request.patient_id || patientResult?.id || null,
        userId: request.user_id || userResult?.id || null,
        patientName: fullName,
        age: age,
        requestDate: request.created_at,
        status: request.status,
        medicalCondition: request.medical_condition || "N/A",
        preferences: request.preferences || "N/A",
        medicationHistory: request.medication_history || "N/A",
        additionalNotes: request.additional_notes || "N/A",
        doctorNotes: request.doctor_notes || "",
        totalAmount: request.total_amount || 0,
        profileImage: fullName === "N/A" || !fullName ? "/user-icon.svg" : `/placeholder.svg?height=64&width=64&query=${encodeURIComponent(fullName)}`,
        products: request.request_products?.map((prp: any) => ({
          id: prp.products.id,
          name: prp.products.name,
          quantity: prp.quantity,
          unit: "g", // Hardcoded to grams
        })) || [],
      };
    });

    return { success: true, data: transformedData };
  } catch (error) {
    console.error("Error in getPendingPrescriptions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
      data: [],
    };
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

    // Get current user (doctor)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      console.error("No authenticated user found.");
      return { success: false, error: "Authentication error: No user found." };
    }

    // Update the prescription request status, assigning the current doctor
    const { error: updateError } = await supabase
      .from("prescription_requests")
      .update({
        status: "approved",
        doctor_id: currentUser.id, // Assign current doctor's ID
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
      doctor_id: currentUser.id, // Use current doctor's ID for the new prescription
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

    // Get current user (doctor)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      console.error("No authenticated user found for denyPrescription.");
      return { success: false, error: "Authentication error: No user found." };
    }

    // Step 2: Update the prescription request status, assigning the current doctor
    const { error: updateError } = await supabase
      .from("prescription_requests")
      .update({
        status: "denied",
        doctor_id: currentUser.id, // Assign current doctor's ID
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
