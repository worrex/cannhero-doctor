"use client"

import type React from "react"

import { useState } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { ChevronDown, ChevronUp, Clock, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { approvePrescription, denyPrescription } from "@/actions/prescription-actions"

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

interface PrescriptionCardProps {
  prescription: Prescription
  isEven: boolean
  onPatientClick?: (patientId: string) => void
}

export function PrescriptionCard({ prescription, isEven, onPatientClick }: PrescriptionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"approve" | "deny" | null>(null)
  const [notes, setNotes] = useState(prescription.notes || "")
  const [denialReason, setDenialReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleApprove = () => {
    setConfirmAction("approve")
  }

  const handleDeny = () => {
    setConfirmAction("deny")
  }

  const handlePatientClick = () => {
    if (onPatientClick) {
      onPatientClick(prescription.patientId)
    }
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)

    try {
      if (confirmAction === "approve") {
        const result = await approvePrescription(prescription.id, notes)

        if (result.success) {
          toast({
            title: "Rezept genehmigt",
            description: "Das Rezept wurde erfolgreich genehmigt.",
            variant: "success",
          })
        } else {
          throw new Error(result.error || "Fehler beim Genehmigen des Rezepts")
        }
      } else if (confirmAction === "deny") {
        if (!denialReason.trim()) {
          toast({
            title: "Ablehnungsgrund erforderlich",
            description: "Bitte geben Sie einen Grund für die Ablehnung an.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }

        const result = await denyPrescription(prescription.id, denialReason)

        if (result.success) {
          toast({
            title: "Rezept abgelehnt",
            description: "Das Rezept wurde abgelehnt.",
            variant: "success",
          })
        } else {
          throw new Error(result.error || "Fehler beim Ablehnen des Rezepts")
        }
      }

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error("Error updating prescription:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setConfirmAction(null)
    }
  }

  const handleCancel = () => {
    setConfirmAction(null)
    setDenialReason("")
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de })
  }

  return (
    <>
      <div className={`rounded-lg border border-gray-200 overflow-hidden ${isEven ? "bg-white" : "bg-gray-50"}`}>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-16 flex-shrink-0">
              <div
                className="relative h-16 w-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center cursor-pointer"
                onClick={handlePatientClick}
              >
                <User className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                <div>
                  <h3
                    className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-primary"
                    onClick={handlePatientClick}
                  >
                    {prescription.patientName}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <span className="mr-3">ID: {prescription.patientExternalId}</span>
                    <span className="mr-3">Alter: {prescription.age}</span>
                  </div>
                </div>
                <div className="flex items-center mt-2 sm:mt-0 text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatDate(prescription.requestDate)}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Verschreibungsplan</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {prescription.prescriptionPlan || "Kein Plan angegeben"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Betrag</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {prescription.totalAmount ? `${prescription.totalAmount.toFixed(2)} €` : "Nicht angegeben"}
                    </p>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Notizen</h4>
                        <p className="text-sm text-gray-600 mt-1">{prescription.notes || "Keine Notizen vorhanden."}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Verschreibungsdatum</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {prescription.prescriptionDate
                            ? formatDate(prescription.prescriptionDate)
                            : "Noch nicht verschrieben"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="mt-4 text-primary text-sm font-medium flex items-center hover:underline focus:outline-none"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Weniger anzeigen
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Mehr anzeigen
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-3">
          <Button className="bg-primary hover:bg-primary-600 text-white" onClick={handleApprove}>
            Genehmigen
          </Button>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleDeny}>
            Ablehnen
          </Button>
          <Button
            variant="outline"
            className="border-blue-300 text-blue-600 hover:bg-blue-50 ml-auto"
            onClick={handlePatientClick}
          >
            Patientendetails
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction === "approve" ? "Rezept genehmigen" : "Rezept ablehnen"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve"
                ? "Sind Sie sicher, dass Sie dieses Rezept genehmigen möchten? Der Patient wird über Ihre Entscheidung informiert."
                : "Sind Sie sicher, dass Sie dieses Rezept ablehnen möchten? Der Patient wird über Ihre Entscheidung informiert."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4">
            {confirmAction === "approve" ? (
              <div>
                <Label htmlFor="notes">Notizen (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Notizen für den Patienten"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full"
                  rows={4}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="denialReason">Ablehnungsgrund</Label>
                <Textarea
                  id="denialReason"
                  placeholder="Bitte geben Sie einen Grund für die Ablehnung an"
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  className="w-full"
                  rows={4}
                  required
                />
                {confirmAction === "deny" && !denialReason.trim() && (
                  <p className="text-sm text-red-500 mt-1">Bitte geben Sie einen Grund für die Ablehnung an.</p>
                )}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel} disabled={isSubmitting}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmAction === "approve" ? "bg-primary hover:bg-primary-600" : "bg-red-600 hover:bg-red-700"
              }
              disabled={isSubmitting || (confirmAction === "deny" && !denialReason.trim())}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {confirmAction === "approve" ? "Genehmigen..." : "Ablehnen..."}
                </>
              ) : confirmAction === "approve" ? (
                "Genehmigen"
              ) : (
                "Ablehnen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Add the missing Label component
function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  )
}
