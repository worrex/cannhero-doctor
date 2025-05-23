"use client"

import { useEffect, useState } from "react"
import { Loader2, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getApprovedPrescriptions } from "@/actions/prescription-actions"
import { PatientRequestCard } from "@/components/dashboard/patient-request-card" // Changed from PrescriptionList
import type { PatientRequest } from "@/types/patient" // Import PatientRequest type
import { PatientDetailDialog } from "@/components/patients/patient-detail-dialog"

export default function ApprovedPrescriptionsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [prescriptions, setPrescriptions] = useState<PatientRequest[]>([]) // Use PatientRequest type
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [isPatientDetailOpen, setIsPatientDetailOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const result = await getApprovedPrescriptions()
        if (result.success) {
          // Set prescriptions data from API response or default to empty array if no data
          setPrescriptions(result.data as PatientRequest[] || []) // Cast to PatientRequest[]
        } else {
          toast({
            title: "Fehler",
            description: result.error || "Rezepte konnten nicht geladen werden.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching approved prescriptions:", error)
        toast({
          title: "Fehler",
          description: "Ein unerwarteter Fehler ist aufgetreten.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrescriptions()
  }, [toast])

  const handlePatientClick = (patientId: string) => {
    setSelectedPatientId(patientId)
    setIsPatientDetailOpen(true)
  }

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
        <div className="bg-green-100 p-3 rounded-full mr-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Bestätigte Rezepte</h1>
      </div>

      {prescriptions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Keine bestätigten Rezepte</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Hier werden alle bestätigten Rezepte angezeigt. Derzeit sind keine bestätigten Rezepte vorhanden.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((prescription, index) => (
            <PatientRequestCard
              key={prescription.id}
              request={prescription}
              isEven={index % 2 === 0}
              onPatientClick={handlePatientClick} // Connect to existing handler
              // These actions are not typically used for already approved items
              onApprove={() => {}} 
              onDeny={() => {}}    
              onRequestInfo={() => {}} 
            />
          ))}
        </div>
      )}

      <PatientDetailDialog
        patientId={selectedPatientId}
        isOpen={isPatientDetailOpen}
        onClose={() => setIsPatientDetailOpen(false)}
      />
    </div>
  )
}
