"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Users, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PatientDetailDialog } from "@/components/patients/patient-detail-dialog"
import { supabase } from "@/lib/supabase/client"

interface Patient {
  id: string
  fullName: string
  email: string
  birthDate: string | null
  createdAt: string
}

export default function PatientsPage() {
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoadingPatients, setIsLoadingPatients] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [isPatientDetailOpen, setIsPatientDetailOpen] = useState(false)

  useEffect(() => {
    const fetchPatients = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("patients")
          .select(`
            id,
            birth_date,
            created_at,
            users:user_id (
              id,
              email,
              first_name,
              last_name
            )
          `)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching patients:", error)
          toast({
            title: "Fehler",
            description: "Patienten konnten nicht geladen werden.",
            variant: "destructive",
          })
          return
        }

        // Transform the data
        const transformedData = data.map((patient: any) => { // Added :any for patient to handle patient.users type implicitly
          const relatedUser = patient.users; // Access the aliased 'users' object directly
          
          return {
            id: patient.id,
            fullName: `${relatedUser?.first_name || ""} ${relatedUser?.last_name || ""}`.trim() || "Unbekannt",
            email: relatedUser?.email || "Keine E-Mail",
            birthDate: patient.birth_date,
            createdAt: patient.created_at,
          }
        })

        setPatients(transformedData)
      } catch (error) {
        console.error("Error in fetchPatients:", error)
        toast({
          title: "Fehler",
          description: "Ein unerwarteter Fehler ist aufgetreten.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingPatients(false)
      }
    }

    if (!isLoading && user) {
      fetchPatients()
    }
  }, [isLoading, user, toast])

  const handlePatientClick = (patientId: string) => {
    setSelectedPatientId(patientId)
    setIsPatientDetailOpen(true)
  }

  const filteredPatients = patients.filter(
    (patient) =>
      patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (isLoading || isLoadingPatients) {
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
          <Users className="h-6 w-6 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold">Patienten</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Suche nach Patientenname oder E-Mail..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredPatients.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Keine Patienten gefunden</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Es wurden keine Patienten gefunden, die Ihren Suchkriterien entsprechen.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">E-Mail</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Registriert am</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900">{patient.fullName}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{patient.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {new Date(patient.createdAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-4 text-sm text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary hover:bg-primary/10"
                        onClick={() => handlePatientClick(patient.id)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
