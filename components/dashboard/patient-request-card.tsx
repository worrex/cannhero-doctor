"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Clock, UserIcon } from "lucide-react"
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
  
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
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
        return null
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
                <UserIcon className="h-16 w-16 text-gray-400" />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                <div>
                  <div className="flex items-center">
                    <h3
                      className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-primary"
                      onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} // Toggle on name click
                    >
                      {request.patientName}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} className="ml-2">
                      {isDetailsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center text-sm text-gray-500 mt-1">
                    <span className="mr-3">ID: {request.external_id}</span>
                    <span className="mr-3">Alter: {request.age !== null ? request.age : "N/A"}</span>
                    {request.status !== "new" && <span className="mr-3">{getStatusBadge(request.status)}</span>}
                  </div>
                </div>
                <div className="flex items-center mt-2 sm:mt-0 text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{format(new Date(request.requestDate), "dd.MM.yyyy 'um' HH:mm")}</span>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Angefragte Produkte</h4>
                {request.products && request.products.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-3">
                    {request.products.map((product) => (
                      <li key={product.id}>
                        {product.name}{product.quantity ? ` (Menge: ${product.quantity})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 mb-3">Keine Produkte angefragt.</p>
                )}
              </div>

              {isDetailsExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <h4 className="text-md font-semibold text-gray-800 mb-2">Weitere Details</h4>
                  {request.medicalCondition && request.medicalCondition !== "N/A" && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Medizinischer Zustand:</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{request.medicalCondition}</p>
                    </div>
                  )}
                  {request.preferences && request.preferences !== "N/A" && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Präferenzen:</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{request.preferences}</p>
                    </div>
                  )}
                  {request.medicationHistory && request.medicationHistory !== "N/A" && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Medikationshistorie:</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{request.medicationHistory}</p>
                    </div>
                  )}
                  {request.status === "approved" && request.approvedBy && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Genehmigt von:</p>
                      <p className="text-sm text-gray-600">{request.approvedBy}</p>
                    </div>
                  )}
                  {request.status === "denied" && request.deniedBy && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Abgelehnt von:</p>
                      <p className="text-sm text-gray-600">{request.deniedBy}</p>
                    </div>
                  )}
                  {request.totalAmount != null && request.totalAmount > 0 && (
                     <div>
                       <p className="text-sm font-medium text-gray-700">Gesamtbetrag:</p>
                       <p className="text-sm text-gray-600">{request.totalAmount.toFixed(2)} €</p>
                     </div>
                  )}
                </div>
              )}

              {/* Existing Doctor Notes Section - can be moved inside isDetailsExpanded if preferred */}
              {request.doctorNotes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Arztnotizen</h4>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{request.doctorNotes}</p>
                </div>
              )}

            </div>
          </div>
        </div>

        {request.status === "new" && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row md:flex-wrap gap-3">
            <Button className="w-full md:w-auto bg-primary hover:bg-primary-600 text-white" onClick={handleApprove}>
              Genehmigen
            </Button>
            <Button variant="outline" className="w-full md:w-auto border-red-300 text-red-600 hover:bg-red-50" onClick={handleDeny}>
              Ablehnen
            </Button>
            <Button
              variant="outline"
              className="w-full md:w-auto border-secondary-300 text-gray-700 hover:bg-secondary-50"
              onClick={handleRequestInfo}
            >
              Weitere Informationen anfordern
            </Button>
            <Button
              variant="outline"
              className="w-full md:w-auto border-blue-300 text-blue-600 hover:bg-blue-50"
              onClick={handlePatientClick}
            >
              Patientendetails
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approve" ? "Rezept genehmigen" : 
               confirmAction === "deny" ? "Rezept ablehnen" : 
               confirmAction === "info" ? "Weitere Informationen anfordern" : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve" ? "Sind Sie sicher, dass Sie diese Rezeptanfrage genehmigen möchten? Der Patient wird über Ihre Entscheidung informiert." : 
               confirmAction === "deny" ? "Sind Sie sicher, dass Sie diese Rezeptanfrage ablehnen möchten? Der Patient wird über Ihre Entscheidung informiert." : 
               confirmAction === "info" ? "Bitte geben Sie an, welche zusätzlichen Informationen Sie vom Patienten benötigen." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4">
            <Textarea
              placeholder={confirmAction === "info" ? "Notizen für den Patienten (erforderlich)" : "Notizen für den Patienten (optional)"}
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              className="w-full"
              rows={4}
            />
            {confirmAction === "info" && !doctorNotes.trim() && (
              <p className="text-sm text-red-500 mt-1">Bitte geben Sie an, welche Informationen Sie benötigen.</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={`text-white ${confirmAction === "approve" ? "bg-primary hover:bg-primary-600" : confirmAction === "deny" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
              disabled={confirmAction === "info" && !doctorNotes.trim()}
            >
              {confirmAction === "approve" ? "Genehmigen" : 
               confirmAction === "deny" ? "Ablehnen" : 
               confirmAction === "info" ? "Anfragen" : "Bestätigen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
