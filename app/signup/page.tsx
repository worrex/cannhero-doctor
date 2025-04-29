"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Lock } from "lucide-react"
import { useRouter } from "next/navigation"

import { DoctorSignupForm } from "@/components/signup-form"

export default function SignupPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      <div className="w-full max-w-2xl z-10">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <Link href="/login" className="flex items-center text-gray-500 hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span>Zurück zum Login</span>
              </Link>
              <span className="text-xl font-semibold text-primary">Arztportal</span>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Arzt-Registrierung</h1>
            <DoctorSignupForm setIsSubmitting={setIsSubmitting} />
            <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
              <Lock className="h-3 w-3 mr-1" />
              <span>Sichere Verbindung</span>
            </div>
          </div>
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-center">
            <p className="text-sm text-gray-600">
              Bereits registriert?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Zum Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
