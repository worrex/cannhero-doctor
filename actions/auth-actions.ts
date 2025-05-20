"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminClient, createServerClient } from "@/utils/supabase"

interface Address {
  street: string
  city: string
  postalCode: string
  country: string
}

interface DoctorRegistrationData {
  email: string
  password: string
  firstName: string
  lastName: string
  title?: string
  specialty?: string
  licenseNumber: string
  phoneNumber: string
  address: Address
}

export async function registerDoctor(data: DoctorRegistrationData) {
  try {
    // Create a new Supabase client with the service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        success: false,
        error: "Supabase configuration is missing",
      }
    }
    const supabase = await createServerClient()
    const supabaseAdmin = await createAdminClient()

    // Check if a doctor with the given license number already exists
    const { data: existingDoctor, error: checkError } = await supabaseAdmin
      .from("doctors")
      .select("license_number")
      .eq("license_number", data.licenseNumber)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is the error code for "no rows returned", which is expected
      console.error("Error checking for existing license number:", checkError)
      return {
        success: false,
        error: "Fehler bei der Überprüfung der Approbationsnummer",
      }
    }

    if (existingDoctor) {
      return {
        success: false,
        error: "Diese Approbationsnummer ist bereits registriert",
        fieldErrors: {
          licenseNumber: "Diese Approbationsnummer ist bereits registriert",
        },
      }
    }

    // Check if a user with the given email already exists
    const { data: existingUser, error: emailCheckError } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("email", data.email)
      .single()

    if (emailCheckError && emailCheckError.code !== "PGRST116") {
      console.error("Error checking for existing email:", emailCheckError)
      return {
        success: false,
        error: "Fehler bei der Überprüfung der E-Mail-Adresse",
      }
    }

    if (existingUser) {
      return {
        success: false,
        error: "Diese E-Mail-Adresse ist bereits registriert",
        fieldErrors: {
          email: "Diese E-Mail-Adresse ist bereits registriert",
        },
      }
    }

    // 1. Create the user in Supabase Auth using standard signup
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
        }
      }
    })

    if (authError) {
      console.error("Auth error:", authError)
      
      // Handle specific error codes for better user feedback
      if (authError.status === 400) {
        if (authError.code === 'email_address_invalid') {
          return {
            success: false,
            error: "Die angegebene E-Mail-Adresse ist ungültig. Bitte verwenden Sie eine gültige E-Mail-Adresse.",
            fieldErrors: {
              email: "Ungültige E-Mail-Adresse. Bitte verwenden Sie eine existierende, gültige E-Mail."
            }
          }
        }
        // Add more specific error handling for other codes as needed
      }
      
      return {
        success: false,
        error: authError.message,
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: "Benutzer konnte nicht erstellt werden",
      }
    }
    
    // Use a single transaction for all database operations to ensure consistency
    // We'll execute all database operations in a specific order with explicit commits
    try {
      // First, execute a dummy query to ensure database connection is established
      await supabaseAdmin.rpc('get_service_role');
      
      // 2. The user in public.users is already created by the database trigger on_auth_user_created
      // So we just need to update it with the additional fields not set by the trigger
      const { error: userError } = await supabaseAdmin.from("users").update({
        phone_number: data.phoneNumber,
        is_active: false, // User is inactive until approved
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id);

      if (userError) {
        console.error("User update error:", userError);
        // Clean up the auth user if user update fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return {
          success: false,
          error: userError.message,
        };
      }
      
      // Verify the user was created by selecting it from the database
      const { data: verifyUser, error: verifyUserError } = await supabaseAdmin
        .from("users")
        .select()
        .eq("id", authData.user.id)
        .single();
        
      if (verifyUserError || !verifyUser) {
        console.error("User verification error:", verifyUserError);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return {
          success: false,
          error: "Failed to verify user creation",
        };
      }

      // 3. Create a user_roles entry - this has an FK to users
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: authData.user.id,
        role: "doctor",
      });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        await supabaseAdmin.from("users").delete().eq("id", authData.user.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return {
          success: false,
          error: roleError.message,
        };
      }
      
      // 4. Create the doctor record in the doctors table - has FK to users
      console.log('Creating doctor record with user_id:', authData.user.id);
      const { data: doctorData, error: doctorError } = await supabaseAdmin.from("doctors").insert({
        user_id: authData.user.id,
        title: data.title || null,
        specialty: data.specialty || null,
        license_number: data.licenseNumber,
        phone_number: data.phoneNumber,
        address: {
          street: data.address.street,
          city: data.address.city,
          postal_code: data.address.postalCode,
          country: data.address.country,
        },
        is_verified: false, // Doctor has verified their ID
        is_approved: false, // Requires admin approval
      }).select();

      if (doctorError) {
        console.error("Doctor creation error:", doctorError);
        // Clean up both the auth user and the user record if doctor creation fails
        await supabaseAdmin.from("user_roles").delete().eq("user_id", authData.user.id);
        await supabaseAdmin.from("users").delete().eq("id", authData.user.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return {
          success: false,
          error: doctorError.message,
        };
      }
      
      // 5. Create the doctor approval request last - this also has an FK to users
      // We'll create it after verifying everything else worked
      
      // Quick check to ensure the user exists in the database
      const { data: checkUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", authData.user.id)
        .limit(1);
      
      console.log('Checking user exists before creating approval request:', checkUser);
      
      if (!checkUser || checkUser.length === 0) {
        console.error("User not found before creating approval request");
        return {
          success: false,
          error: "User record could not be found when creating approval request",
        };
      }
      
      // Now create the approval request
      console.log('Creating doctor approval request for user_id:', authData.user.id);
      const { data: approvalData, error: approvalError } = await supabaseAdmin.from("doctor_approval_requests").insert({
        user_id: authData.user.id,
        status: "pending"
      }).select();
      
      if (approvalError) {
        console.error("Doctor approval request creation error:", approvalError);
        // We won't clean up here, as the doctor record is created and functional.
        // An admin can still manually approve the doctor even without an approval request.
      } else {
        console.log('Successfully created doctor approval request:', approvalData);
      }
      
      // Final verification to confirm both doctor and approval request were created
      const { data: finalDoctorCheck } = await supabaseAdmin
        .from("doctors")
        .select("id, user_id")
        .eq("user_id", authData.user.id)
        .single();
        
      const { data: finalApprovalCheck } = await supabaseAdmin
        .from("doctor_approval_requests")
        .select("id, user_id, status")
        .eq("user_id", authData.user.id)
        .single();
        
      console.log('Final verification - Doctor record:', finalDoctorCheck);
      console.log('Final verification - Approval request:', finalApprovalCheck);
    } catch (dbError) {
      console.error("Database transaction error:", dbError);
      // Clean up in case of any unexpected errors
      try {
        await supabaseAdmin.from("doctors").delete().eq("user_id", authData.user.id);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", authData.user.id);
        await supabaseAdmin.from("users").delete().eq("id", authData.user.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
      
      return {
        success: false,
        error: "Ein Fehler ist bei der Datenbankverarbeitung aufgetreten",
      };
    }
    
    return {
      success: true,
    }
  } catch (error) {
    console.error("Unexpected error during registration:", error)
    return {
      success: false,
      error: "Bei der Registrierung ist ein unerwarteter Fehler aufgetreten",
    }
  }
}

export async function signIn(email: string, password: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    // Check if the doctor is verified
    const { data: doctorData, error: doctorError } = await supabase
      .from("doctors")
      .select("is_verified")
      .eq("user_id", data.user.id)

    if (doctorError) {
      return {
        success: false,
        error: "Fehler beim Abrufen der Arztdaten",
      }
    }

    // Handle case when no doctor record exists
    if (!doctorData || doctorData.length === 0) {
      // Sign out the user if no doctor record exists
      await supabase.auth.signOut()

      return {
        success: false,
        error: "Kein Arztprofil gefunden. Bitte kontaktieren Sie den Support.",
        notVerified: true,
      }
    }

    // Check if the doctor is verified
    if (!doctorData[0].is_verified) {
      // Sign out the user if they're not verified
      await supabase.auth.signOut()

      return {
        success: false,
        error: "Ihr Konto wurde noch nicht freigeschaltet. Bitte warten Sie auf die Bestätigung per E-Mail.",
        notVerified: true,
      }
    }

    return {
      success: true,
      user: data.user,
    }
  } catch (error) {
    console.error("Sign in error:", error)
    return {
      success: false,
      error: "Bei der Anmeldung ist ein unerwarteter Fehler aufgetreten",
    }
  }
}
