import { createServerClient } from "@supabase/ssr"
import { cookies } from 'next/headers'

// WARNING: Only call these functions inside server components, route handlers, or middleware.
// Calling them outside a request context will throw an error.

// Server client for authenticated operations
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // do nothing for server components
      },
    }
  )
}