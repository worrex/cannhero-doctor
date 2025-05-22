"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Clock } from "lucide-react"
import { getPrescriptionRequests, getPendingPrescriptions } from "@/actions/prescription-actions"
import { PatientRequestList } from "@/components/dashboard/patient-request-list"
import { SearchAndFilter } from "@/components/dashboard/search-and-filter"
import { useToast } from "@/hooks/use-toast"
import { PatientDetailDialog } from "@/components/patients/patient-detail-dialog"
import type { PatientRequest } from "@/types/patient"
import { approvePrescription, denyPrescription, requestAdditionalInfo } from "@/actions/prescription-actions"
import { PrescriptionList } from "@/components/prescriptions/prescription-list"
import { EmptyState } from "@/components/dashboard/empty-state"

export default function OpenPrescriptionsPage() {
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  const [requests, setRequests] = useState<PatientRequest[]>([])
  const [pendingPrescriptions, setPendingPrescriptions] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [hasShownError, setHasShownError] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [isPatientDetailOpen, setIsPatientDetailOpen] = useState(false)
console.log("requests", requests)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both prescription requests and pending prescriptions
        const [requestsData, pendingResult] = await Promise.all([getPrescriptionRequests(), getPendingPrescriptions()])

        // Filter only new requests
        setRequests(requestsData.filter((request) => request.status === "new"))

        console.log("requestsData", requestsData,pendingResult)

        if (pendingResult.success) {
          setPendingPrescriptions(pendingResult.data || [])
        } else {
          console.error("Error fetching pending prescriptions:", pendingResult.error)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        if (!hasShownError) {
          toast({
            title: "Fehler beim Laden",
            description: "Die Daten konnten nicht geladen werden.",
            variant: "destructive",
          })
          setHasShownError(true)
        }
      } finally {
        setIsLoadingData(false)
      }
    }

    if (!isLoading && user) {
      fetchData()
    }
  }, [isLoading, user, toast, hasShownError])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const handleFilter = (status: string) => {
    setStatusFilter(status)
  }

  const handlePatientClick = (patientId: string) => {
    setSelectedPatientId(patientId)
    setIsPatientDetailOpen(true)
  }

  const handleApprove = async (id: string, notes?: string) => {
    try {
      await approvePrescription(id, notes)

      // Update local state
      setRequests(requests.filter((request) => request.id !== id))
      setPendingPrescriptions(pendingPrescriptions.filter((prescription) => prescription.id !== id))

      toast({
        title: "Rezept genehmigt",
        description: "Der Patient wird über Ihre Entscheidung informiert.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error approving prescription:", error)
      toast({
        title: "Fehler",
        description: "Das Rezept konnte nicht genehmigt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const handleDeny = async (id: string, notes?: string) => {
    try {
      await denyPrescription(id, notes)

      // Update local state
      setRequests(requests.filter((request) => request.id !== id))
      setPendingPrescriptions(pendingPrescriptions.filter((prescription) => prescription.id !== id))

      toast({
        title: "Rezept abgelehnt",
        description: "Der Patient wird über Ihre Entscheidung informiert.",
        variant: "destructive",
      })
    } catch (error) {
      console.error("Error denying prescription:", error)
      toast({
        title: "Fehler",
        description: "Das Rezept konnte nicht abgelehnt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const handleRequestInfo = async (id: string, notes: string) => {
    try {
      await requestAdditionalInfo(id, notes)

      // Update local state
      setRequests(requests.filter((request) => request.id !== id))

      toast({
        title: "Weitere Informationen angefordert",
        description: "Der Patient wird benachrichtigt, weitere Informationen bereitzustellen.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error requesting additional info:", error)
      toast({
        title: "Fehler",
        description:
          "Die Anfrage nach weiteren Informationen konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.external_id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const filteredPrescriptions = pendingPrescriptions.filter((prescription) => {
    const matchesSearch =
      prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.patientExternalId.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const totalCount = filteredRequests.length + filteredPrescriptions.length

  if (isLoading || isLoadingData) {
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
        <div className="bg-blue-100 p-3 rounded-full mr-4">
          <Clock className="h-6 w-6 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold">Offene Rezeptanfragen</h1>
      </div>

      <SearchAndFilter
        onSearch={handleSearch}
        onFilter={handleFilter}
        totalRequests={totalCount}
        pendingRequests={totalCount}
      />

      {totalCount === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {filteredRequests.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Ausstehende Rezepte</h2>
              <PatientRequestList
                requests={filteredRequests}
                onApprove={handleApprove}
                onDeny={handleDeny}
                onRequestInfo={handleRequestInfo}
                onPatientClick={handlePatientClick}
              />
            </div>
          )}
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
