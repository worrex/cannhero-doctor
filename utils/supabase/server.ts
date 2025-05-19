import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

/**
 * Creates a Supabase client for server components with standard permissions
 */
export async function createClient() {
  const cookieStore = await cookies()

  // Using TypeScript ignore directive to bypass Next.js cookies() typing issues
  // @ts-ignore
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // @ts-ignore
        get(name) {
          return cookieStore.get(name)?.value
        },
        // @ts-ignore
        set(name, value, options) {
          cookieStore.set({ name, value, ...options })
        },
        // @ts-ignore
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

/**
 * Creates a Supabase client with admin privileges using the service role key
 * For server components only
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  // Using TypeScript ignore directive to bypass Next.js cookies() typing issues
  // @ts-ignore
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        // @ts-ignore
        get(name) {
          return cookieStore.get(name)?.value
        },
        // @ts-ignore
        set(name, value, options) {
          cookieStore.set({ name, value, ...options })
        },
        // @ts-ignore
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
