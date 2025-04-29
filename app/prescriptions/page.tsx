"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, FileText, AlertTriangle } from "lucide-react"
import { getPendingPrescriptions } from "@/actions/prescription-actions"
import { PrescriptionList } from "@/components/prescriptions/prescription-list"
import { useToast } from "@/hooks/use-toast"

interface Prescription {
  id: string
  patientId: string
  patientName: string
  patientExternalId: string
  age: number
  requestDate: string
  status: string
  prescriptionPlan: string | null
  prescriptionDate: string | null
  totalAmount: number | null
  notes: string | null
  profileImage: string
}

export default function PrescriptionsPage() {
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrescriptions = async () => {
      if (!user) return

      try {
        const result = await getPendingPrescriptions()

        if (result.error) {
          setError(result.error)
          toast({
            title: "Fehler",
            description: result.error,
            variant: "destructive",
          })
        } else {
          setPrescriptions(result.data || [])
        }
      } catch (error) {
        console.error("Error fetching prescriptions:", error)
        setError("Rezepte konnten nicht geladen werden.")
        toast({
          title: "Fehler",
          description: "Rezepte konnten nicht geladen werden.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingPrescriptions(false)
      }
    }

    if (!isLoading && user) {
      fetchPrescriptions()
    }
  }, [isLoading, user, toast])

  if (isLoading || isLoadingPrescriptions) {
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
        <div className="bg-primary text-white p-3 rounded-full mr-4">
          <FileText size={24} />
        </div>
        <h1 className="text-2xl font-bold">Rezepte</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Offene Rezeptanfragen</h2>

        {error ? (
          <div className="flex items-center p-4 bg-red-50 rounded-md text-red-700">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Keine offenen Rezeptanfragen</h3>
            <p className="text-gray-500 mt-2">
              Aktuell gibt es keine offenen Rezeptanfragen, die auf Ihre Bearbeitung warten.
            </p>
          </div>
        ) : (
          <PrescriptionList prescriptions={prescriptions} />
        )}
      </div>
    </div>
  )
}
