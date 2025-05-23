export interface PatientRequest {
  id: string;
  external_id: string;
  patientId: string | null;
  userId: string | null; // Added to align with DeniedRequest and provide direct user ID access
  patientName: string;
  age: number | null;
  requestDate: string; // Could be creation date of request or prescription
  status: "new" | "approved" | "denied" | "info_requested";
  medicalCondition?: string;
  preferences?: string;
  medicationHistory?: string;
  additionalNotes?: string;
  doctorNotes?: string; // General notes, or denial reason, or approval notes
  approvedBy?: string; // Doctor who approved
  deniedBy?: string;   // Doctor who denied
  deniedDate: string | null; // Date of denial
  totalAmount?: number;
  profileImage?: string;
  products: Product[];
}

export interface Product {
  id: string;
  name: string;
  quantity?: number; // Or other relevant fields like dosage, etc.
  // Add other product-specific fields as needed
}

export interface Patient {
  id: string
  user_id: string
  birth_date: string
  age: number
  salutation?: string
  address?: any
  symptoms?: string
  takes_medication?: boolean
  medications?: string
  has_allergies?: boolean
  allergies?: string
  has_chronic_diseases?: boolean
  chronic_diseases?: string
  payment_type?: string
  understands_driving_restriction?: boolean
  understands_medical_disclosure?: boolean
  is_verified?: boolean
  verification_documents?: any
}

export interface Doctor {
  id: string
  user_id: string
  title: string | null
  specialty: string | null
  license_number: string | null
  phone_number: string | null
  address: any | null
  is_verified: boolean
}

export interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone_number: string | null
}
