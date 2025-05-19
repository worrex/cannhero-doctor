"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Mail, Phone, MapPin, AlertTriangle, FileText, User } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"

interface PatientDetailDialogProps {
  patientId: string | null
  isOpen: boolean
  onClose: () => void
}

export function PatientDetailDialog({ patientId, isOpen, onClose }: PatientDetailDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [patient, setPatient] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (!patientId || !isOpen) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from("patients")
          .select(`
            id,
            birth_date,
            salutation,
            address,
            symptoms,
            takes_medication,
            medications,
            has_allergies,
            allergies,
            has_chronic_diseases,
            chronic_diseases,
            payment_type,
            understands_driving_restriction,
            understands_medical_disclosure,
            is_verified,
            created_at,
            users:user_id (
              id,
              email,
              first_name,
              last_name,
              phone_number
            ),
            prescription_requests (
              id,
              status,
              medical_condition,
              created_at
            )
          `)
          .eq("id", patientId)
          .single()

        if (error) {
          console.error("Error fetching patient details:", error)
          toast({
            title: "Fehler",
            description: "Patientendaten konnten nicht geladen werden.",
            variant: "destructive",
          })
          return
        }

        setPatient(data)
      } catch (error) {
        console.error("Error in fetchPatientDetails:", error)
        toast({
          title: "Fehler",
          description: "Ein unerwarteter Fehler ist aufgetreten.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPatientDetails()
  }, [patientId, isOpen, toast])

  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    if (!dateString) return "Nicht angegeben"
    return format(new Date(dateString), "dd. MMMM yyyy", { locale: de })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Neu</span>
      case "approved":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Genehmigt</span>
      case "denied":
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Abgelehnt</span>
      case "info_requested":
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Info angefordert</span>
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : patient ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {patient.users?.first_name} {patient.users?.last_name}
              </DialogTitle>
              <DialogDescription>Patient ID: {patient.id.substring(0, 8)}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="info">Persönliche Daten</TabsTrigger>
                <TabsTrigger value="medical">Medizinische Daten</TabsTrigger>
                <TabsTrigger value="history">Anfragen & Rezepte</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <User className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Name</p>
                        <p className="text-base">
                          {patient.salutation} {patient.users?.first_name} {patient.users?.last_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Geburtsdatum</p>
                        <p className="text-base">{formatDate(patient.birth_date)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">E-Mail</p>
                        <p className="text-base">{patient.users?.email || "Nicht angegeben"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Telefon</p>
                        <p className="text-base">{patient.users?.phone_number || "Nicht angegeben"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Adresse</p>
                        <p className="text-base">
                          {patient.address ? (
                            <>
                              {patient.address.street}, {patient.address.postal_code} {patient.address.city}
                            </>
                          ) : (
                            "Nicht angegeben"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Registriert seit</p>
                        <p className="text-base">{formatDate(patient.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="medical" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Symptome</p>
                    <p className="text-base p-3 bg-gray-50 rounded-md">
                      {patient.symptoms || "Keine Symptome angegeben"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Medikamente</p>
                    <div className="flex items-center mb-2">
                      <div
                        className={`h-4 w-4 rounded-full mr-2 ${patient.takes_medication ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <p>{patient.takes_medication ? "Nimmt Medikamente" : "Nimmt keine Medikamente"}</p>
                    </div>
                    {patient.takes_medication && (
                      <p className="text-base p-3 bg-gray-50 rounded-md">
                        {patient.medications || "Keine spezifischen Medikamente angegeben"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Allergien</p>
                    <div className="flex items-center mb-2">
                      <div
                        className={`h-4 w-4 rounded-full mr-2 ${patient.has_allergies ? "bg-red-500" : "bg-green-500"}`}
                      ></div>
                      <p>{patient.has_allergies ? "Hat Allergien" : "Keine Allergien"}</p>
                    </div>
                    {patient.has_allergies && (
                      <p className="text-base p-3 bg-gray-50 rounded-md">
                        {patient.allergies || "Keine spezifischen Allergien angegeben"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Chronische Erkrankungen</p>
                    <div className="flex items-center mb-2">
                      <div
                        className={`h-4 w-4 rounded-full mr-2 ${patient.has_chronic_diseases ? "bg-red-500" : "bg-green-500"}`}
                      ></div>
                      <p>
                        {patient.has_chronic_diseases
                          ? "Hat chronische Erkrankungen"
                          : "Keine chronischen Erkrankungen"}
                      </p>
                    </div>
                    {patient.has_chronic_diseases && (
                      <p className="text-base p-3 bg-gray-50 rounded-md">
                        {patient.chronic_diseases || "Keine spezifischen chronischen Erkrankungen angegeben"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Einverständniserklärungen</p>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center">
                        <div
                          className={`h-4 w-4 rounded-full mr-2 ${patient.understands_driving_restriction ? "bg-green-500" : "bg-red-500"}`}
                        ></div>
                        <p>Fahrverbot nach Cannabiskonsum verstanden</p>
                      </div>
                      <div className="flex items-center">
                        <div
                          className={`h-4 w-4 rounded-full mr-2 ${patient.understands_medical_disclosure ? "bg-green-500" : "bg-red-500"}`}
                        ></div>
                        <p>Medizinische Offenlegungspflicht verstanden</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Rezeptanfragen</h3>
                  {patient.prescription_requests && patient.prescription_requests.length > 0 ? (
                    <div className="space-y-3">
                      {patient.prescription_requests.map((request: any) => (
                        <div key={request.id} className="p-4 border rounded-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">Anfrage vom {formatDate(request.created_at)}</p>
                              <p className="text-sm text-gray-600 mt-1">{request.medical_condition}</p>
                            </div>
                            <div>{getStatusBadge(request.status)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-md">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Keine Rezeptanfragen vorhanden</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button onClick={onClose}>Schließen</Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Patient nicht gefunden</h3>
            <p className="text-gray-500 mt-2">Die angeforderten Patientendaten konnten nicht gefunden werden.</p>
            <Button onClick={onClose} className="mt-4">
              Schließen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
