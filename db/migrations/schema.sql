-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Patients table
CREATE TABLE public.patients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users ON DELETE CASCADE NOT NULL UNIQUE,
  salutation TEXT,
  birth_date DATE,
  address JSONB,
  symptoms TEXT,
  takes_medication BOOLEAN,
  medications TEXT,
  has_allergies BOOLEAN,
  allergies TEXT,
  has_chronic_diseases BOOLEAN,
  chronic_diseases TEXT,
  payment_type TEXT,
  understands_driving_restriction BOOLEAN,
  understands_medical_disclosure BOOLEAN,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Doctors table
CREATE TABLE public.doctors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users ON DELETE CASCADE NOT NULL UNIQUE,
  title TEXT,
  specialty TEXT,
  license_number TEXT UNIQUE,
  phone_number TEXT,
  address JSONB,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Products table
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  thc_percentage NUMERIC(5,2),
  cbd_percentage NUMERIC(5,2),
  genetics TEXT,
  price_per_gram NUMERIC(10,2) NOT NULL,
  effects TEXT[],
  terpenes TEXT[],
  tags TEXT[],
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Pharmacies table
CREATE TABLE public.pharmacies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  address JSONB NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  hours JSONB,
  shipping_methods TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Prescriptions table
CREATE TABLE public.prescriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients ON DELETE RESTRICT NOT NULL,
  doctor_id UUID REFERENCES public.doctors ON DELETE RESTRICT NOT NULL,
  pharmacy_id UUID REFERENCES public.pharmacies ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
  denial_reason TEXT,
  prescription_plan TEXT,
  prescription_date TIMESTAMP WITH TIME ZONE,
  total_amount NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Prescription Products table
CREATE TABLE public.prescription_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prescription_id UUID REFERENCES public.prescriptions ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products ON DELETE RESTRICT NOT NULL,
  quantity_grams INTEGER NOT NULL,
  price_per_gram NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(prescription_id, product_id)
);

-- Payments table
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prescription_id UUID REFERENCES public.prescriptions ON DELETE RESTRICT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create enum types for status
CREATE TYPE request_status AS ENUM ('new', 'approved', 'denied', 'info_requested');

-- Prescription requests table
CREATE TABLE prescription_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'new',
  medical_condition TEXT NOT NULL,
  preferences TEXT,
  medication_history TEXT,
  additional_notes TEXT,
  doctor_id UUID REFERENCES doctors(id),
  doctor_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Analytics Events table
CREATE TABLE public.analytics_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  user_id UUID REFERENCES public.users ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON public.pharmacies FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_prescription_products_updated_at BEFORE UPDATE ON public.prescription_products FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_prescription_requests_updated_at BEFORE UPDATE ON public.prescription_requests FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Create indexes
CREATE INDEX idx_prescription_requests_patient_id ON prescription_requests(patient_id);
CREATE INDEX idx_prescription_requests_doctor_id ON prescription_requests(doctor_id);
CREATE INDEX idx_prescription_requests_status ON prescription_requests(status);
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX idx_payments_prescription_id ON payments(prescription_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "User can access own user record" ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Patients can manage their own record"
  ON public.patients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors can read and update themselves"
  ON public.doctors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors can view all patients"
  ON patients FOR SELECT
  USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid()));

CREATE POLICY "Doctors can view all prescription requests"
  ON prescription_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid()));

CREATE POLICY "Doctors can update prescription requests"
  ON prescription_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid()));

-- User-Automatismus via Supabase Trigger (nur wenn erlaubt)
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
