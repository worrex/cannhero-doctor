"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

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

    const supabase = await createServerSupabaseClient()

    // Check if a doctor with the given license number already exists
    const { data: existingDoctor, error: checkError } = await supabase
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
    const { data: existingUser, error: emailCheckError } = await supabase
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

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
      },
    })

    if (authError) {
      console.error("Auth error:", authError)
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

    // 2. Create the user record in the users table
    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone_number: data.phoneNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    })

    if (userError) {
      console.error("User creation error:", userError)
      // Clean up the auth user if user creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return {
        success: false,
        error: userError.message,
      }
    }

    // 3. Create the doctor record in the doctors table
    const { error: doctorError } = await supabase.from("doctors").insert({
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
      is_verified: false, // Requires admin approval
    })

    if (doctorError) {
      console.error("Doctor creation error:", doctorError)
      // Clean up both the auth user and the user record if doctor creation fails
      await supabase.from("users").delete().eq("id", authData.user.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return {
        success: false,
        error: doctorError.message,
      }
    }

    // 4. Create a user_roles entry
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: authData.user.id,
      role: "doctor",
    })

    if (roleError) {
      console.error("Role assignment error:", roleError)
      // We don't need to clean up here as the doctor record is already created
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
