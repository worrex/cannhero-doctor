"use client"

import { Loader2, XCircle } from "lucide-react"
import React, { useEffect, useState, useCallback } from "react" // Added React and useCallback
import { getDeniedPrescriptions } from "@/actions/prescription-actions" // Import the action
import { PatientRequestCard } from "@/components/dashboard/patient-request-card"
import type { PatientRequest } from "@/types/patient" // Import PatientRequest type
import { PatientDetailDialog } from "@/components/patients/patient-detail-dialog" // Import dialog
// You might need a different list component or adapt PatientRequestList for denied items

// Define a type for the transformed request data, matching getDeniedPrescriptions output
interface DeniedRequest {
  id: string;
  external_id: string;
  patientId: string | null;
  userId: string | null;
  patientName: string;
  age: number | null;
  requestDate: string;
  deniedDate: string;
  status: string;
  medicalCondition: string;
  preferences: string;
  medicationHistory: string;
  additionalNotes: string;
  doctorNotes: string; // Denial reason
  deniedBy: string | null; // Doctor who denied
  totalAmount: number;
  profileImage: string;
  products: Array<{ id: string; name: string; quantity: number; unit: string }>;
}

export default function DeniedPrescriptionsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [deniedRequests, setDeniedRequests] = useState<DeniedRequest[]>([])
  const [displayableDeniedRequests, setDisplayableDeniedRequests] = useState<PatientRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [isPatientDetailOpen, setIsPatientDetailOpen] = useState(false)

  const fetchDeniedRequests = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getDeniedPrescriptions()
      if (result.success) {
        setDeniedRequests(result.data)
      } else {
        setError(result.error || "Failed to fetch denied prescriptions.")
        setDeniedRequests([])
      }
    } catch (err) {
      console.error("Error in fetchDeniedRequests:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
      setDeniedRequests([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeniedRequests()
  }, [fetchDeniedRequests])

  useEffect(() => {
    // Transform DeniedRequest data to PatientRequest data for display
    const transformedRequests = deniedRequests
      .filter((req): req is DeniedRequest & { patientId: string } => req.patientId !== null)
      .map(req => {
        const transformedProducts = req.products.map(p => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
        }));

        const patientRequestCompatible: PatientRequest = {
          id: req.id,
          external_id: req.external_id,
          patientId: req.patientId, // Known to be string here
          patientName: req.patientName,
          age: req.age,
          requestDate: req.requestDate,
          status: req.status as "new" | "approved" | "denied" | "info_requested", // Safe as action filters for 'denied'
          medicalCondition: req.medicalCondition,
          preferences: req.preferences,
          medicationHistory: req.medicationHistory,
          additionalNotes: req.additionalNotes || undefined,
          profileImage: req.profileImage || undefined,
          doctorNotes: req.doctorNotes || undefined,
          products: transformedProducts,
        };
        return patientRequestCompatible;
      });
    setDisplayableDeniedRequests(transformedRequests);
  }, [deniedRequests]);

  const handlePatientClick = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsPatientDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Abgelehnte Rezepte werden geladen...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2 text-red-700">Fehler beim Laden</h2>
        <p className="text-gray-600">{error}</p>
        <button 
          onClick={fetchDeniedRequests} 
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        {/* Optional: Icon can be kept or changed 
        <div className="bg-red-100 p-3 rounded-full mr-4">
          <XCircle className="h-6 w-6 text-red-600" />
        </div>
        */}
        <h1 className="text-2xl font-bold">Abgelehnte Rezepte</h1>
      </div>

      {displayableDeniedRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <XCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Keine abgelehnten Rezepte</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Derzeit sind keine abgelehnten Rezepte vorhanden.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* 
            Assuming PatientRequestList can handle denied requests.
            You might need to pass specific props or adapt PatientRequestList 
            to display denial reasons (doctorNotes) and who denied it (deniedBy).
            The 'onApprove', 'onDeny', 'onRequestInfo' props might not be relevant here,
            or you might want to provide different handlers (e.g., view details).
          */}
          <div className="space-y-4">
            {displayableDeniedRequests.map((request, index) => (
              <PatientRequestCard
                key={request.id}
                request={request} // request is now of type PatientRequest
                isEven={index % 2 === 0}
                onApprove={() => {}} // Not applicable for denied items
                onDeny={() => {}}    // Not applicable for denied items
                onRequestInfo={() => {}} // Not applicable or different handler
                onPatientClick={handlePatientClick} // Connect to handler
              />
            ))}
          </div>
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
