import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next()

  // Create the Supabase client
  const supabase = createMiddlewareClient({ req, res })

  // Attach the session to the request but don't redirect
  // This allows the client to handle all redirects
  await supabase.auth.getSession()

  return res
}

export const config = {
  matcher: [
    // Match all paths except static files, images, favicon, and API routes
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
}
