"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

export default function VerificationPage() {
  const { user, session, isLoading, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams?.get("verified") === "false"

  useEffect(() => {
    // If user is not coming from a verification check, redirect to login
    if (!verified && !isLoading && !session) {
      router.push("/login")
    }
  }, [verified, isLoading, session, router])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
      router.push("/login")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex justify-center mb-8">
              <h1 className="text-3xl font-bold text-primary">Arztportal</h1>
            </div>

            <div className="text-center mb-6">
              <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Konto nicht verifiziert</h1>
              <p className="text-gray-600">
                Ihr Konto wurde noch nicht von einem Administrator freigeschaltet. Sie erhalten eine E-Mail, sobald Ihr
                Konto freigeschaltet wurde.
              </p>
            </div>

            <div className="space-y-4">
              <Button onClick={handleSignOut} className="w-full">
                Abmelden
              </Button>
              <Link href="/login" className="block text-center text-primary hover:underline">
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Zurück zum Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
