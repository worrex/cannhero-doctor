export interface Prescription {
  id: string;
  patientId: string | null;
  patientName: string;
  patientExternalId: string;
  age: number | null;
  requestDate: string;
  status: "new" | "approved" | "denied" | "info_requested";
  prescriptionPlan: string | null;
  prescriptionDate: string | null;
  totalAmount: number | null;
  notes: string | null; // Represents doctor's notes on the prescription
  profileImage: string; // Assumes a fallback is always provided if original is missing
}
