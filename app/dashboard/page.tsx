"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Loader2, FileText, AlertTriangle, Users, CheckCircle, Clock } from "lucide-react"
import { getPendingPrescriptions, getApprovedPrescriptions } from "@/actions/prescription-actions"
import { PrescriptionList } from "@/components/prescriptions/prescription-list"
import { useToast } from "@/hooks/use-toast"
import { PatientDetailDialog } from "@/components/patients/patient-detail-dialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

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

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasShownError, setHasShownError] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [isPatientDetailOpen, setIsPatientDetailOpen] = useState(false)
  const [approvedCount, setApprovedCount] = useState(0)
  const [patientCount, setPatientCount] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Fetch prescriptions, approved prescriptions, and patient count
        const [pendingResult, approvedResult, patientResult] = await Promise.all([
          getPendingPrescriptions(),
          getApprovedPrescriptions(),
          fetchPatientCount(),
        ])

        if (pendingResult.error) {
          setError(pendingResult.error)
          if (!hasShownError) {
            toast({
              title: "Fehler",
              description: pendingResult.error,
              variant: "destructive",
            })
            setHasShownError(true)
          }
        } else {
          setPrescriptions(pendingResult.data || [])
        }

        // Set the approved count
        if (approvedResult.success) {
          setApprovedCount(approvedResult.data.length)
        }

        // Set the patient count
        setPatientCount(patientResult)
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Daten konnten nicht geladen werden.")
        if (!hasShownError) {
          toast({
            title: "Fehler",
            description: "Daten konnten nicht geladen werden.",
            variant: "destructive",
          })
          setHasShownError(true)
        }
      } finally {
        setIsLoadingPrescriptions(false)
      }
    }

    if (!isLoading && user) {
      fetchData()
    }
  }, [isLoading, user, toast, hasShownError])

  // Function to fetch patient count
  const fetchPatientCount = async () => {
    try {
      // First, get distinct patient IDs from prescriptions with approved or denied status
      const { data: patientIds, error: prescriptionError } = await supabase
        .from("prescriptions")
        .select("patient_id")
        .in("status", ["approved", "denied"])
        .order("patient_id")

      if (prescriptionError) {
        console.error("Error fetching patient IDs from prescriptions:", prescriptionError)
        return 0
      }

      // Count unique patient IDs
      const uniquePatientIds = new Set(patientIds?.map((p) => p.patient_id))
      return uniquePatientIds.size
    } catch (error) {
      console.error("Error in fetchPatientCount:", error)
      return 0
    }
  }

  const handlePatientClick = (patientId: string) => {
    setSelectedPatientId(patientId)
    setIsPatientDetailOpen(true)
  }

  const navigateTo = (path: string) => {
    router.push(path)
  }

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
        <h1 className="text-2xl font-bold">Übersicht</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigateTo("/prescriptions/open")}
        >
          <div className="flex items-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold">Offene</h2>
              <p className="text-3xl font-bold">{prescriptions.length}</p>
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigateTo("/prescriptions/approved")}
        >
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold">Bestätigt</h2>
              <p className="text-3xl font-bold">{approvedCount}</p>
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigateTo("/patients")}
        >
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold">Patienten</h2>
              <p className="text-3xl font-bold">{patientCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Offene Rezeptanfragen</h2>
          <Button
            variant="outline"
            className="text-primary border-primary hover:bg-primary/10"
            onClick={() => navigateTo("/prescriptions/open")}
          >
            Alle anzeigen
          </Button>
        </div>

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
          <PrescriptionList
            prescriptions={prescriptions.slice(0, 3)} // Show only first 3 for dashboard
            onPatientClick={handlePatientClick}
          />
        )}
      </div>

      <PatientDetailDialog
        patientId={selectedPatientId}
        isOpen={isPatientDetailOpen}
        onClose={() => setIsPatientDetailOpen(false)}
      />
    </div>
  )
}
