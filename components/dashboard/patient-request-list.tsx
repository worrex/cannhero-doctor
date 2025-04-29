"use client"
import type { PatientRequest } from "@/types/patient"
import { PatientRequestCard } from "@/components/dashboard/patient-request-card"
import { EmptyState } from "@/components/dashboard/empty-state"

interface PatientRequestListProps {
  requests: PatientRequest[]
  onApprove: (id: string, notes?: string) => void
  onDeny: (id: string, notes?: string) => void
  onRequestInfo: (id: string, notes: string) => void
  onPatientClick?: (patientId: string) => void
}

export function PatientRequestList({
  requests,
  onApprove,
  onDeny,
  onRequestInfo,
  onPatientClick,
}: PatientRequestListProps) {
  if (requests.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      {requests.map((request, index) => (
        <PatientRequestCard
          key={request.id}
          request={request}
          isEven={index % 2 === 0}
          onApprove={onApprove}
          onDeny={onDeny}
          onRequestInfo={onRequestInfo}
          onPatientClick={onPatientClick}
        />
      ))}
    </div>
  )
}
