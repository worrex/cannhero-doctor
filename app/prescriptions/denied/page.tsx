"use client"

import { Loader2, XCircle } from "lucide-react"
import { useEffect, useState } from "react"

export default function DeniedPrescriptionsPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Wird geladen...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <div className="bg-red-100 p-3 rounded-full mr-4">
          <XCircle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold">Abgelehnte Rezepte</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <XCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Keine abgelehnten Rezepte</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Hier werden alle abgelehnten Rezepte angezeigt. Derzeit sind keine abgelehnten Rezepte vorhanden.
        </p>
      </div>
    </div>
  )
}
