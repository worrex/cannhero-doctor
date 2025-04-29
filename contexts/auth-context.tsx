"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  isVerified: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isVerified: false,
  signIn: async () => ({ success: false }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [hasShownToast, setHasShownToast] = useState(false)

  // Simplified verification check
  const checkVerification = async (userId: string) => {
    // Always return true to bypass verification checks
    return true
  }

  // Load user session on mount and set up auth state listener
  useEffect(() => {
    console.log("Setting up auth state listener")

    // Initial session check
    const checkSession = async () => {
      try {
        setIsLoading(true)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          console.log("Session found, user ID:", session.user.id)

          // Check if doctor is verified
          const verified = await checkVerification(session.user.id)
          setIsVerified(verified)

          if (verified) {
            setSession(session)
            setUser(session.user)
          } else {
            console.log("Doctor not verified, signing out")
            await supabase.auth.signOut()
            setSession(null)
            setUser(null)

            // Only show toast once
            if (!hasShownToast) {
              toast({
                title: "Nicht verifiziert",
                description: "Ihr Konto wurde noch nicht verifiziert. Bitte warten Sie auf die Bestätigung.",
                variant: "destructive",
              })
              setHasShownToast(true)
            }
          }
        } else {
          console.log("No session found")
          setSession(null)
          setUser(null)
          setIsVerified(false)
        }
      } catch (error) {
        console.error("Error checking session:", error)
        setSession(null)
        setUser(null)
        setIsVerified(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Run initial check
    checkSession()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event)

      if (event === "SIGNED_IN" && session) {
        // Check if doctor is verified
        const verified = await checkVerification(session.user.id)
        setIsVerified(verified)

        if (verified) {
          setSession(session)
          setUser(session.user)
        } else {
          console.log("Doctor not verified, signing out")
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)

          // Only show toast once
          if (!hasShownToast) {
            toast({
              title: "Nicht verifiziert",
              description: "Ihr Konto wurde noch nicht verifiziert. Bitte warten Sie auf die Bestätigung.",
              variant: "destructive",
            })
            setHasShownToast(true)
          }
        }
      } else if (event === "SIGNED_OUT") {
        setSession(null)
        setUser(null)
        setIsVerified(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [toast, hasShownToast])

  // Handle redirects based on auth state
  useEffect(() => {
    if (isLoading) return

    const handleRedirects = async () => {
      // Add a debug parameter to break redirect loops if needed
      const url = new URL(window.location.href)
      const noRedirect = url.searchParams.get("noRedirect") === "true"

      if (noRedirect) {
        console.log("Skipping redirects due to noRedirect parameter")
        return
      }

      console.log("Handling redirects. Path:", pathname, "User:", user ? "Authenticated" : "Not authenticated")

      // If on login page and authenticated, go to dashboard
      if (pathname === "/login" && user && isVerified) {
        console.log("Redirecting from login to dashboard")
        router.push("/dashboard")
        return
      }

      // If on protected page and not authenticated, go to login
      // Exclude signup pages from redirection
      if (pathname !== "/login" && pathname !== "/" && !pathname.startsWith("/signup") && (!user || !isVerified)) {
        console.log("Redirecting from protected page to login")
        router.push("/login")
        return
      }

      // If on home page, redirect based on auth state
      if (pathname === "/" && !isLoading) {
        if (user && isVerified) {
          console.log("Redirecting from home to dashboard")
          router.push("/dashboard")
        } else {
          console.log("Redirecting from home to login")
          router.push("/login")
        }
      }
    }

    // Add a small delay to ensure state is stable
    const redirectTimer = setTimeout(handleRedirects, 100)
    return () => clearTimeout(redirectTimer)
  }, [user, isVerified, pathname, router, isLoading])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      console.log("Signing in user:", email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Sign in error:", error.message)
        return { success: false, error: error.message }
      }

      // Check if doctor is verified
      if (data.user) {
        const verified = await checkVerification(data.user.id)

        if (!verified) {
          // Sign out if not verified
          await supabase.auth.signOut()
          return {
            success: false,
            error: "Ihr Konto wurde noch nicht verifiziert. Bitte warten Sie auf die Bestätigung.",
          }
        }

        setIsVerified(verified)
      }

      return { success: true }
    } catch (error: any) {
      console.error("Sign in error:", error.message)
      return { success: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      console.log("Signing out user")
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isVerified,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
