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

export async function getDeniedPrescriptions(): Promise<{ success: boolean; error?: string; data: any[] }> {
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
        updated_at,
        patient_id,
        user_id,
        doctor_id,
        total_amount,
        request_products!inner(
          quantity_grams,
          products!inner(id, name)
        )
      `)
      .eq("status", 'denied') // Filter for denied status
      .order("updated_at", { ascending: false }); // Order by when it was last updated (denied date)

    if (requestsError) {
      console.error("Error fetching denied prescription requests:", requestsError);
      return { success: false, error: requestsError.message, data: [] };
    }

    if (!requestsData || requestsData.length === 0) {
      return { success: true, data: [] };
    }

    // Get unique patient_ids and user_ids from the requests
    const requestPatientIds = [...new Set(requestsData.map(req => req.patient_id).filter(id => id))];
    const requestUserIds = [...new Set(requestsData.map(req => req.user_id).filter(id => id))];
    const doctorIds = [...new Set(requestsData.map(req => req.doctor_id).filter(id => id))];


    let patients: any[] = [];
    if (requestPatientIds.length > 0) {
      const { data: fetchedPatients, error: patientError } = await supabase
        .from("patients")
        .select("id, user_id, birth_date")
        .in('id', requestPatientIds);
      if (patientError) {
        console.error("Error fetching patients for denied requests:", patientError);
        return { success: false, error: patientError.message, data: [] };
      }
      patients = fetchedPatients || [];
    }
    const patientMap = new Map(patients.map(p => [p.id, p]));

    // Combine all user_ids that need fetching (from requests, patients)
    const allUserIdsToFetch = [...new Set([
      ...requestUserIds, 
      ...patients.map(p => p.user_id).filter(id => id)
    ])];
    
    let users: any[] = []; // For patient users
    if (allUserIdsToFetch.length > 0) {
        const { data: fetchedUsers, error: usersError } = await supabase
            .from("users") 
            .select("id, first_name, last_name, email")
            .in('id', allUserIdsToFetch);
        if (usersError) {
            console.error("Error fetching users for denied requests:", usersError);
            return { success: false, error: usersError.message, data: [] };
        }
        users = fetchedUsers || [];
    }
    const userMap = new Map(users.map(u => [u.id, u]));

    let doctors: any[] = []; // For doctor users
    if (doctorIds.length > 0) {
      const { data: fetchedDoctors, error: doctorsError } = await supabase
        .from("doctors") // Assuming your doctors table
        .select("id, user_id, users!inner(first_name, last_name)") // Fetch doctor's name via users table
        .in('id', doctorIds);
      if (doctorsError) {
        console.error("Error fetching doctors for denied requests:", doctorsError);
        // Non-critical, so we can proceed without doctor names if this fails
      }
      doctors = fetchedDoctors || [];
    }
    const doctorMap = new Map(doctors.map(d => [d.id, d]));


    // Transform the data
    const transformedData = requestsData.map((request: any) => {
      let userResult: any = { id: '', first_name: null, last_name: null, email: '' };
      let patientResult: any = { id: '', user_id: null, birth_date: null };
      let age: number | null = null;
      let doctorName: string | null = null;

      if (request.patient_id) {
        patientResult = patientMap.get(request.patient_id) || { id: request.patient_id, user_id: request.user_id, birth_date: null };
        if (patientResult && patientResult.user_id) {
          userResult = userMap.get(patientResult.user_id) || { id: patientResult.user_id };
        }
      } else if (request.user_id) { 
        userResult = userMap.get(request.user_id) || { id: request.user_id };
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
      
      if (request.doctor_id) {
        const doctorData = doctorMap.get(request.doctor_id);
        if (doctorData && doctorData.users) {
          doctorName = `${doctorData.users.first_name || ""} ${doctorData.users.last_name || ""}`.trim() || "N/A";
        } else {
          doctorName = "N/A";
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
        deniedDate: request.updated_at, // Use updated_at as deniedDate
        status: request.status,
        medicalCondition: request.medical_condition || "N/A",
        preferences: request.preferences || "N/A",
        medicationHistory: request.medication_history || "N/A",
        additionalNotes: request.additional_notes || "N/A",
        doctorNotes: request.doctor_notes || "No reason provided.", // Denial reason
        deniedBy: doctorName, // Doctor who denied
        totalAmount: request.total_amount || 0,
        profileImage: fullName === "N/A" || !fullName ? "/user-icon.svg" : `/placeholder.svg?height=64&width=64&query=${encodeURIComponent(fullName)}`,
        products: request.request_products?.map((prp: any) => ({
          id: prp.products.id,
          name: prp.products.name,
          quantity: prp.quantity_grams, // Assuming quantity is in request_products
          unit: "g", 
        })) || [],
      };
    });

    return { success: true, data: transformedData };
  } catch (error) {
    console.error("Error in getDeniedPrescriptions:", error);
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



    // If not found in prescriptions, check prescription_requests
    const { data: requestDataArray, error: requestError } = await supabase
      .from("prescription_requests")
      .select("id, patient_id, doctor_id, request_products!inner(product_id, quantity_grams)")
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

    // Fetch the doctor's own ID from the 'doctors' table using the authenticated user's ID
    const { data: doctorRecord, error: doctorError } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", currentUser.id)
      .single();

    if (doctorError || !doctorRecord) {
      console.error("Error fetching doctor record or doctor not found for current user:", doctorError);
      return { success: false, error: "Doctor profile not found for the current user. Ensure the doctor is registered in the 'doctors' table." };
    }
    const actual_doctor_id = doctorRecord.id;

    // Update the prescription request status, assigning the current doctor
    const { error: updateError } = await supabase
      .from("prescription_requests")
      .update({
        status: "approved",
        doctor_id: actual_doctor_id, // Use the ID from the 'doctors' table
        doctor_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error approving prescription request:", updateError)
      return { success: false, error: updateError.message }
    }


    // Create a new prescription record
    const { data: newPrescription, error: createError } = await supabase
      .from("prescriptions")
      .insert({
        patient_id: requestData.patient_id,
        doctor_id: actual_doctor_id, // Use the ID from the 'doctors' table
        status: "approved",
        notes: notes || null,
        prescription_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        has_agreed_agb: true,
        has_agreed_privacy_policy: true
      })
      .select('id') // Reinstate .select('id')
      .single();    // Reinstate .single()

    if (createError || !newPrescription) { // Reinstate error handling block
      console.error("Error creating prescription:", createError);
      // Rollback the update if creating the prescription fails
      await supabase
        .from("prescription_requests")
        .update({ status: "new", doctor_id: null, doctor_notes: null, updated_at: new Date().toISOString() }) // Revert doctor_id as well
        .eq("id", id);
      return { success: false, error: createError?.message || "Failed to create prescription record." };
    }

    console.log("Successfully created prescription record with ID:", newPrescription.id);

    // Temporarily comment out prescription_products insertion
    /*
    if (requestData.request_products && requestData.request_products.length > 0) {
      const productsToInsert = requestData.request_products.map(product => ({
        prescription_id: newPrescription.id,
        product_id: product.product_id,
        quantity_grams: product.quantity_grams,
      }));

      const { error: productsError } = await supabase
        .from("prescription_products")
        .insert(productsToInsert);

      if (productsError) {
        console.error("Error inserting prescription products:", productsError);
        // Attempt to rollback the prescription creation and request update
        await supabase.from("prescriptions").delete().eq("id", newPrescription.id);
        await supabase
          .from("prescription_requests")
          .update({ status: "new", doctor_id: null, doctor_notes: null, updated_at: new Date().toISOString() })
          .eq("id", id);
        return { success: false, error: "Failed to insert prescription products. The approval has been rolled back." };
      }
      console.log("Successfully inserted prescription products.");
    }
    */
    console.log("Temporarily skipped inserting prescription_products.");


    revalidatePath("/dashboard")
    revalidatePath("/prescriptions/open")
    revalidatePath("/prescriptions/approved")

    return { success: true, data: { prescriptionId: newPrescription.id } }; // Added data to return
  } catch (error) {
    console.error("Error in approvePrescription:", error)
    return { success: false, error: error instanceof Error ? error.message : "Database error" }
  }
}

export async function denyPrescription(id: string, notes?: string) { // notes will be the denial reason
  try {
    const supabase = await createServerSupabaseClient();
    console.log(`Denying prescription request with ID: ${id}, Notes: ${notes}`);

    // Get current user (doctor)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      console.error("No authenticated user found for denyPrescription.");
      return { success: false, error: "Authentication error: No user found." };
    }

    // Fetch the doctor's own ID from the 'doctors' table using the authenticated user's ID
    const { data: doctorRecord, error: doctorError } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", currentUser.id)
      .single();

    if (doctorError || !doctorRecord) {
      console.error("Error fetching doctor record or doctor not found for current user:", doctorError);
      return { success: false, error: "Doctor profile not found for the current user. Ensure the doctor is registered in the 'doctors' table." };
    }
    const actual_doctor_id = doctorRecord.id;

    // Update the prescription request status to "denied"
    const { error: updateError } = await supabase
      .from("prescription_requests")
      .update({
        status: "denied",
        doctor_id: actual_doctor_id, // Assign the doctor who denied it
        doctor_notes: notes || null, // Store the denial reason
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error denying prescription request:", updateError);
      return { success: false, error: updateError.message };
    }

    console.log("Successfully denied prescription request with ID:", id);

    revalidatePath("/dashboard");
    revalidatePath("/prescriptions/open"); // To remove it from the open list
    revalidatePath("/prescriptions/denied"); // To make it appear in the denied list
    // Potentially revalidate other paths if needed, e.g., a general prescriptions overview

    return { success: true };

  } catch (error: unknown) {
    console.error("Unexpected error in denyPrescription:", error);
    let errorMessage = "An unexpected error occurred while denying the prescription.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
      errorMessage = (error as any).message; // Handle Supabase/PostgREST errors
    }
    // For debugging, log the raw error if it's not a standard Error instance
    if (!(error instanceof Error)) {
        console.error("Raw error object for denyPrescription:", JSON.stringify(error, null, 2));
    }
    return { success: false, error: errorMessage };
  }
}
