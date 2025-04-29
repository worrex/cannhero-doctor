"use client"
import Link from "next/link"
import { Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Redirects are now handled by the auth context
  // This component just renders the login form

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="absolute inset-0 z-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#179A6B" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Arztportal</h1>
            <LoginForm />
            <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
              <Lock className="h-3 w-3 mr-1" />
              <span>Sichere Verbindung</span>
            </div>
          </div>
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-center">
            <p className="text-sm text-gray-600">
              Noch kein Konto?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Jetzt registrieren
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
