"use client"

import { useState, useEffect } from "react"
import { PatientRequestList } from "@/components/dashboard/patient-request-list"
import { SearchAndFilter } from "@/components/dashboard/search-and-filter"
import { useToast } from "@/hooks/use-toast"
import { getPrescriptionRequests } from "@/actions/prescription-actions"
import type { PatientRequest } from "@/types/patient"
import { approvePrescription, denyPrescription, requestAdditionalInfo } from "@/actions/prescription-actions"
import { EmptyState } from "@/components/dashboard/empty-state"

export function DashboardContent() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<PatientRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [hasShownError, setHasShownError] = useState(false)
  const [errorCount, setErrorCount] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only try to fetch data 3 times to prevent infinite loops
        if (errorCount >= 3) {
          setIsLoading(false)
          return
        }

        const data = await getPrescriptionRequests()
        setRequests(data)
      } catch (error) {
        console.error("Error fetching requests:", error)
        setErrorCount((prev) => prev + 1)

        if (!hasShownError) {
          toast({
            title: "Fehler beim Laden",
            description: "Die Patientenanfragen konnten nicht geladen werden.",
            variant: "destructive",
          })
          setHasShownError(true)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast, hasShownError, errorCount])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const handleFilter = (status: string) => {
    setStatusFilter(status)
  }

  const handleApprove = async (id: string, notes?: string) => {
    try {
      const result = await approvePrescription(id, notes)

      if (!result.success) {
        throw new Error(result.error || "Unknown error")
      }

      // Update local state
      setRequests(
        requests.map((request) =>
          request.id === id ? { ...request, status: "approved", doctorNotes: notes } : request,
        ),
      )

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
      const result = await denyPrescription(id, notes)

      if (!result.success) {
        throw new Error(result.error || "Unknown error")
      }

      // Update local state
      setRequests(
        requests.map((request) => (request.id === id ? { ...request, status: "denied", doctorNotes: notes } : request)),
      )

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
      const result = await requestAdditionalInfo(id, notes)

      if (!result.success) {
        throw new Error(result.error || "Unknown error")
      }

      // Update local state
      setRequests(
        requests.map((request) =>
          request.id === id ? { ...request, status: "info_requested", doctorNotes: notes } : request,
        ),
      )

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
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingCount = requests.filter((request) => request.status === "new").length

  if (isLoading) {
    return (
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Patientenanfragen für Cannabisrezepte</h1>
        <p className="text-gray-600">
          Überprüfen und bearbeiten Sie Patientenanfragen für medizinische Cannabisrezepte.
        </p>
      </div>

      <SearchAndFilter
        onSearch={handleSearch}
      />

      {filteredRequests.length === 0 ? (
        <EmptyState />
      ) : (
        <PatientRequestList
          requests={filteredRequests}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onRequestInfo={handleRequestInfo}
        />
      )}
    </main>
  )
}
