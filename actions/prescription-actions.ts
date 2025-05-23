"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PatientRequest as PatientRequestType, Product as ProductType } from "@/types/patient";

// Utility function to transform raw data to PatientRequestType view model
function _transformItemToPatientRequestView(
  rawItem: any, // Can be from 'prescription_requests' or 'prescriptions'
  type: 'pending' | 'denied' | 'approved',
  patientMap: Map<string, any>,
  userMap: Map<string, any>,
  doctorNameMap: Map<string, string> // Maps doctor_id to doctor's full name for approvedBy/deniedBy lines
): Partial<PatientRequestType> { 
  // 1. Resolve patient and user details
  let userResult: any = { id: '', first_name: null, last_name: null, email: '' };
  let patientResult: any = { id: '', user_id: null, birth_date: null };
  let age: number | null = null;

  if (rawItem.patient_id) {
    patientResult = patientMap.get(rawItem.patient_id) || { id: rawItem.patient_id, user_id: rawItem.user_id, birth_date: null };
    if (patientResult && patientResult.user_id) {
      userResult = userMap.get(patientResult.user_id) || { id: patientResult.user_id };
    }
  } else if (rawItem.user_id && (type === 'pending' || type === 'denied')) { // user_id directly on request for pending/denied
    userResult = userMap.get(rawItem.user_id) || { id: rawItem.user_id };
    const foundPatientForUser = Array.from(patientMap.values()).find(p => p.user_id === rawItem.user_id);
    if (foundPatientForUser) patientResult = foundPatientForUser;
  }

  // 2. Calculate age
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

  const patientFullName = `${userResult?.first_name || ''} ${userResult?.last_name || ''}`.trim() || "Unbekannter Patient";
  const relevantDoctorName = rawItem.doctor_id ? doctorNameMap.get(rawItem.doctor_id) : undefined;

  const baseResult: Partial<PatientRequestType> = {
    id: rawItem.id,
    external_id: rawItem.external_id || rawItem.id.substring(0, 8),
    patientId: rawItem.patient_id || patientResult?.id || null,
    userId: patientResult?.user_id || userResult?.id || null,
    patientName: patientFullName,
    age: age,
    requestDate: rawItem.created_at,
    status: rawItem.status as PatientRequestType['status'],
    totalAmount: rawItem.total_amount != null ? Number(rawItem.total_amount) : undefined,
    profileImage: patientFullName === "Unbekannter Patient" || !patientFullName ? "/user-icon.svg" : `/placeholder.svg?height=64&width=64&query=${encodeURIComponent(patientFullName)}`,
    medicalCondition: rawItem.medical_condition || "N/A",
    preferences: rawItem.preferences || "N/A",
    medicationHistory: rawItem.medication_history || "N/A",
    additionalNotes: rawItem.additional_notes || "N/A",
  };

  if (type === 'denied') {
    return {
      ...baseResult,
      deniedDate: rawItem.updated_at,
      doctorNotes: rawItem.doctor_notes || "Kein Grund angegeben.",
      deniedBy: relevantDoctorName,
      products: rawItem.request_products?.map((prp: any) => ({
        id: prp.products.id,
        name: prp.products.name,
        quantity: prp.quantity_grams,
        unit: "g",
      })) || [],
    };
  } else if (type === 'pending') {
    if ((rawItem.status === 'new' || rawItem.status === 'info_requested') && rawItem.request_products) {
        console.log(`[_transformItemToPatientRequestView for PENDING] Request ID: ${rawItem.id}, request_products:`, JSON.stringify(rawItem.request_products, null, 2));
    }
    return {
      ...baseResult,
      doctorNotes: rawItem.doctor_notes || "",
      products: rawItem.request_products?.map((prp: any) => ({
        id: prp.products.id,
        name: prp.products.name,
        quantity: prp.quantity_grams,
        unit: "g",
      })) || [],
    };
  } else if (type === 'approved') {
    let parsedProducts: ProductType[] = [];
    if (rawItem.prescription_plan) {
      try {
        const plan = typeof rawItem.prescription_plan === 'string'
                        ? JSON.parse(rawItem.prescription_plan)
                        : rawItem.prescription_plan;
        if (Array.isArray(plan)) {
          parsedProducts = plan.map((p_item: any) => ({
            id: p_item.productId || p_item.id || String(Date.now() + Math.random()),
            name: p_item.productName || p_item.name || "Unknown Product",
            quantity: p_item.quantity != null ? Number(p_item.quantity) : undefined,
            unit: p_item.unit || "Stk.",
          }));
        }
      } catch (e) {
        console.error(`Failed to parse prescription_plan for prescription ${rawItem.id}:`, e, "Plan content:", rawItem.prescription_plan);
      }
    }
    return {
      ...baseResult,
      doctorNotes: rawItem.notes, // Approval notes from 'prescriptions' table's 'notes' field
      approvedBy: relevantDoctorName,
      products: parsedProducts,
      medicalCondition: "N/A", 
      preferences: "N/A",
      medicationHistory: "N/A",
      additionalNotes: "N/A",
    };
  }
  return baseResult; 
}

// The rest of the functions (getApprovedPrescriptions, getPendingPrescriptions, etc.) will follow here.
// For example, the next line would typically be the start of the first exported function:
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

    // Collect doctor IDs for fetching their names
    const doctorIds = data.map(p => p.doctor_id).filter(id => id);
    let doctorMap = new Map();
    if (doctorIds.length > 0) {
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("users") // Assuming doctor details are in 'users' table
        .select("id, first_name, last_name")
        .in("id", doctorIds);

      if (doctorsError) {
        console.error("Error fetching approving doctors:", doctorsError);
        // Potentially handle error, e.g., by returning partial data or an error response
      } else if (doctorsData) {
        doctorMap = new Map(doctorsData.map(doc => [doc.id, `${doc.first_name || ""} ${doc.last_name || ""}`.trim() || "Unknown Doctor"]));
      }
    }

    // Transform the data using the utility function
    // The existing doctorMap is already Map<string, string> for approver names
    const transformedData = data.map((prescription: any) => 
      _transformItemToPatientRequestView(prescription, 'approved', patientMap, userMap, doctorMap)
    );

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

export async function getPendingPrescriptions(): Promise<{ success: boolean; data: PatientRequestType[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: requestsData, error: requestsError } = await supabase
      .from("prescription_requests")
      .select(`
        id,
        external_id,
        patient_id,
        user_id,
        status,
        created_at,
        updated_at,
        doctor_notes,
        medical_condition,
        preferences,
        medication_history,
        additional_notes,
        request_products!inner(
          quantity_grams,
          products!inner(id, name)
        )
      `)
      .in("status", ["new", "info_requested"])
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching pending prescription requests:", requestsError);
      return { success: false, error: requestsError.message, data: [] };
    }

    if (!requestsData || requestsData.length === 0) {
      return { success: true, data: [] };
    }

    const patientIds = requestsData.map(req => req.patient_id).filter(id => id) as string[];
    const userIdsFromRequests = requestsData.map(req => req.user_id).filter(id => id) as string[];

    let patientMap = new Map<string, any>();
    let userMap = new Map<string, any>();
    
    const allUserIdsToFetch = new Set<string>(userIdsFromRequests);

    if (patientIds.length > 0) {
      const { data: patients, error: patientError } = await supabase
        .from("patients")
        .select(`id, user_id, birth_date`)
        .in('id', patientIds);

      if (patientError) {
        console.error("Error fetching patients for pending requests:", patientError);
        // Continue without full patient data or return error
      } else if (patients) {
        patientMap = new Map(patients.map(p => [p.id, p]));
        patients.forEach(p => { if (p.user_id) allUserIdsToFetch.add(p.user_id); });
      }
    }
    
    if (allUserIdsToFetch.size > 0) {
        const { data: users, error: usersError } = await supabase
            .from("users")
            .select(`id, first_name, last_name, email`)
            .in('id', Array.from(allUserIdsToFetch));

        if (usersError) {
            console.error("Error fetching users for pending requests:", usersError);
            // Continue without full user data or return error
        } else if (users) {
            userMap = new Map(users.map(u => [u.id, u]));
        }
    }

    const transformedData = requestsData.map((request: any) =>
      _transformItemToPatientRequestView(request, 'pending', patientMap, userMap, new Map()) // No specific doctor for pending items in this context
    );

    return { success: true, data: transformedData as PatientRequestType[] };
  } catch (error) {
    console.error("Error in getPendingPrescriptions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error in getPendingPrescriptions",
      data: [],
    };
  }
}

export async function getDeniedPrescriptions(): Promise<{ success: boolean; data: PatientRequestType[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: requestsData, error: requestsError } = await supabase
      .from("prescription_requests")
      .select(`
        id,
        external_id,
        patient_id,
        user_id,
        doctor_id,
        status,
        created_at,
        updated_at,
        doctor_notes,
        medical_condition,
        preferences,
        medication_history,
        additional_notes,
        request_products!inner(
          quantity_grams,
          products!inner(id, name)
        )
      `)
      .eq("status", "denied")
      .order("updated_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching denied prescription requests:", requestsError);
      return { success: false, error: requestsError.message, data: [] };
    }

    if (!requestsData || requestsData.length === 0) {
      return { success: true, data: [] };
    }

    const patientIds = requestsData.map(req => req.patient_id).filter(id => id) as string[];
    const userIdsFromRequests = requestsData.map(req => req.user_id).filter(id => id) as string[];
    const denyingDoctorIds = requestsData.map(req => req.doctor_id).filter(id => id) as string[];


    let patientMap = new Map<string, any>();
    let userMap = new Map<string, any>();
    let denyingDoctorNameMap = new Map<string, string>();

    const allUserIdsToFetch = new Set<string>([...userIdsFromRequests, ...denyingDoctorIds]);


    if (patientIds.length > 0) {
      const { data: patients, error: patientError } = await supabase
        .from("patients")
        .select(`id, user_id, birth_date`)
        .in('id', patientIds);

      if (patientError) {
        console.error("Error fetching patients for denied requests:", patientError);
      } else if (patients) {
        patientMap = new Map(patients.map(p => [p.id, p]));
        patients.forEach(p => { if (p.user_id) allUserIdsToFetch.add(p.user_id); });
      }
    }
    
    if (allUserIdsToFetch.size > 0) {
        const { data: usersAndDoctors, error: usersError } = await supabase
            .from("users")
            .select(`id, first_name, last_name, email`)
            .in('id', Array.from(allUserIdsToFetch));

        if (usersError) {
            console.error("Error fetching users/doctors for denied requests:", usersError);
        } else if (usersAndDoctors) {
            usersAndDoctors.forEach(u => {
                userMap.set(u.id, u); // Store all as potential users
                if (denyingDoctorIds.includes(u.id)) { // If this ID was in doctorIds, also map their name
                    denyingDoctorNameMap.set(u.id, `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Unknown Doctor");
                }
            });
        }
    }

    const transformedData = requestsData.map((request: any) =>
      _transformItemToPatientRequestView(request, 'denied', patientMap, userMap, denyingDoctorNameMap)
    );

    return { success: true, data: transformedData as PatientRequestType[] };
  } catch (error) {
    console.error("Error in getDeniedPrescriptions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error in getDeniedPrescriptions",
      data: [],
    };
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
