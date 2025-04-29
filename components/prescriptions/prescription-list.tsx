"use client"

import { useState } from "react"
import { PrescriptionCard } from "@/components/prescriptions/prescription-card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

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

interface PrescriptionListProps {
  prescriptions: Prescription[]
  onPatientClick?: (patientId: string) => void
}

export function PrescriptionList({ prescriptions, onPatientClick }: PrescriptionListProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredPrescriptions = prescriptions.filter(
    (prescription) =>
      prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.patientExternalId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div>
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Suche nach Patientenname oder ID..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredPrescriptions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Keine Ergebnisse gefunden.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription, index) => (
            <PrescriptionCard
              key={prescription.id}
              prescription={prescription}
              isEven={index % 2 === 0}
              onPatientClick={onPatientClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
