"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronDown, ChevronUp, Clock } from "lucide-react"
import { format } from "date-fns"

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
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import type { PatientRequest } from "@/types/patient"

interface PatientRequestCardProps {
  request: PatientRequest
  isEven: boolean
  onApprove: (id: string, notes?: string) => void
  onDeny: (id: string, notes?: string) => void
  onRequestInfo: (id: string, notes: string) => void
  onPatientClick?: (patientId: string) => void
}

export function PatientRequestCard({
  request,
  isEven,
  onApprove,
  onDeny,
  onRequestInfo,
  onPatientClick,
}: PatientRequestCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"approve" | "deny" | "info" | null>(null)
  const [doctorNotes, setDoctorNotes] = useState(request.doctorNotes || "")

  const handleApprove = () => {
    setConfirmAction("approve")
  }

  const handleDeny = () => {
    setConfirmAction("deny")
  }

  const handleRequestInfo = () => {
    setConfirmAction("info")
  }

  const handlePatientClick = () => {
    if (onPatientClick) {
      onPatientClick(request.patientId)
    }
  }

  const handleConfirm = () => {
    if (confirmAction === "approve") {
      onApprove(request.id, doctorNotes || undefined)
    } else if (confirmAction === "deny") {
      onDeny(request.id, doctorNotes || undefined)
    } else if (confirmAction === "info") {
      if (!doctorNotes.trim()) {
        return // Don't allow empty notes for info request
      }
      onRequestInfo(request.id, doctorNotes)
    }
    setConfirmAction(null)
  }

  const handleCancel = () => {
    setConfirmAction(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-500">Neu</Badge>
      case "approved":
        return <Badge className="bg-green-500">Genehmigt</Badge>
      case "denied":
        return <Badge className="bg-red-500">Abgelehnt</Badge>
      case "info_requested":
        return <Badge className="bg-yellow-500">Info angefordert</Badge>
      default:
        return null
    }
  }

  return (
    <>
      <div className={`rounded-lg border border-gray-200 overflow-hidden ${isEven ? "bg-white" : "bg-gray-50"}`}>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-16 flex-shrink-0">
              <div
                className="relative h-16 w-16 rounded-full overflow-hidden cursor-pointer"
                onClick={handlePatientClick}
              >
                <Image
                  src={request.profileImage || "/placeholder.svg?height=64&width=64&query=patient"}
                  alt={request.patientName}
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                <div>
                  <h3
                    className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-primary"
                    onClick={handlePatientClick}
                  >
                    {request.patientName}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <span className="mr-3">ID: {request.external_id}</span>
                    <span className="mr-3">Alter: {request.age}</span>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
                <div className="flex items-center mt-2 sm:mt-0 text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{format(new Date(request.requestDate), "dd.MM.yyyy 'um' HH:mm")}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Medizinischer Zustand</h4>
                    <p className="text-sm text-gray-600 mt-1">{request.medicalCondition}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Präferenzen</h4>
                    <p className="text-sm text-gray-600 mt-1">{request.preferences}</p>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Medikamentenhistorie</h4>
                        <p className="text-sm text-gray-600 mt-1">{request.medicationHistory}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Zusätzliche Notizen</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {request.additionalNotes || "Keine zusätzlichen Notizen vorhanden."}
                        </p>
                      </div>
                    </div>

                    {request.doctorNotes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700">Arztnotizen</h4>
                        <p className="text-sm text-gray-600 mt-1">{request.doctorNotes}</p>
                      </div>
                    )}
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

        {request.status === "new" && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-3">
            <Button className="bg-primary hover:bg-primary-600 text-white" onClick={handleApprove}>
              Genehmigen
            </Button>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleDeny}>
              Ablehnen
            </Button>
            <Button
              variant="outline"
              className="border-secondary-300 text-gray-700 hover:bg-secondary-50"
              onClick={handleRequestInfo}
            >
              Weitere Informationen anfordern
            </Button>
            <Button
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 ml-auto"
              onClick={handlePatientClick}
            >
              Patientendetails
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approve"
                ? "Rezept genehmigen"
                : confirmAction === "deny"
                  ? "Rezept ablehnen"
                  : "Weitere Informationen anfordern"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve"
                ? "Sind Sie sicher, dass Sie diese Rezeptanfrage genehmigen möchten? Der Patient wird über Ihre Entscheidung informiert."
                : confirmAction === "deny"
                  ? "Sind Sie sicher, dass Sie diese Rezeptanfrage ablehnen möchten? Der Patient wird über Ihre Entscheidung informiert."
                  : "Bitte geben Sie an, welche zusätzlichen Informationen Sie vom Patienten benötigen."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4">
            <Textarea
              placeholder="Notizen für den Patienten (optional)"
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              className="w-full"
              rows={4}
              required={confirmAction === "info"}
            />
            {confirmAction === "info" && !doctorNotes.trim() && (
              <p className="text-sm text-red-500 mt-1">Bitte geben Sie an, welche Informationen Sie benötigen.</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmAction === "approve"
                  ? "bg-primary hover:bg-primary-600"
                  : confirmAction === "deny"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
              }
              disabled={confirmAction === "info" && !doctorNotes.trim()}
            >
              {confirmAction === "approve" ? "Genehmigen" : confirmAction === "deny" ? "Ablehnen" : "Anfragen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
