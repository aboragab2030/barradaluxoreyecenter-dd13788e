
-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE public.payment_type AS ENUM ('wallet', 'instapay', 'fawry', 'other');

-- App notifications
CREATE TABLE public.app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  user_id TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- App settings
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name TEXT NOT NULL DEFAULT 'مركز براده للعيون',
  hero_title TEXT,
  hero_description TEXT,
  logo_url TEXT,
  phones TEXT[],
  addresses TEXT[],
  facebook_url TEXT,
  whatsapp_number TEXT,
  map_location_url TEXT,
  language TEXT DEFAULT 'ar',
  patient_mode BOOLEAN DEFAULT false,
  payment_methods JSONB,
  reminder_settings JSONB,
  stats JSONB,
  terms_ar TEXT,
  terms_en TEXT,
  working_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doctors
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  image TEXT,
  max_patients INTEGER NOT NULL DEFAULT 10,
  current_bookings INTEGER NOT NULL DEFAULT 0,
  fee INTEGER NOT NULL DEFAULT 150,
  rating NUMERIC,
  top_specialties TEXT[],
  available_dates TEXT[],
  patients_per_hour INTEGER,
  experience INTEGER,
  education TEXT,
  follow_up_exam_count INTEGER,
  follow_up_surgery_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone2 TEXT,
  patient_email TEXT,
  address TEXT,
  doctor_id UUID REFERENCES public.doctors(id),
  doctor_name TEXT NOT NULL,
  service TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  reminder_sent BOOLEAN DEFAULT false,
  reminder_type TEXT,
  contracting_company_id INTEGER,
  contracting_docs JSONB,
  payment_method TEXT,
  payment_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Complaints
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contracting companies
CREATE TABLE public.contracting_companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  documents TEXT[] DEFAULT '{}',
  manager_name TEXT,
  manager_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hero images
CREATE TABLE public.hero_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Operations
CREATE TABLE public.operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_phone2 TEXT,
  patient_email TEXT,
  doctor_name TEXT NOT NULL,
  surgery_type TEXT NOT NULL,
  date TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reminder_sent BOOLEAN DEFAULT false,
  contracting_company_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partners
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  amount INTEGER NOT NULL,
  transaction_id TEXT NOT NULL,
  payment_type public.payment_type NOT NULL DEFAULT 'wallet',
  payment_type_detail TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  booking_id TEXT,
  matched_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment notifications
CREATE TABLE public.payment_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES public.payments(id),
  patient_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  username TEXT,
  login_username TEXT,
  permissions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Services
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  color TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create view for public app settings
CREATE VIEW public.app_settings_public AS
SELECT id, app_name, hero_title, hero_description, logo_url, language, patient_mode, stats, terms_ar, terms_en, working_hours, created_at
FROM public.app_settings;

-- Create functions
CREATE OR REPLACE FUNCTION public.get_bookings_by_phone(phone_number TEXT)
RETURNS TABLE (
  booking_id UUID,
  doctor_name TEXT,
  service TEXT,
  booking_date TEXT,
  booking_time TEXT,
  booking_status TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.doctor_name, b.service, b.date, b.time, b.status, b.created_at
  FROM public.bookings b
  WHERE b.phone = phone_number OR b.phone2 = phone_number
  ORDER BY b.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_by_login_username(p_login_username TEXT)
RETURNS TABLE (user_id UUID, email TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.login_username = p_login_username AND p.is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  );
END;
$$;

-- Enable RLS on all tables
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracting_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated staff/admin full access, anon read for public data
CREATE POLICY "Public read doctors" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Public read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Public read hero_images" ON public.hero_images FOR SELECT USING (true);
CREATE POLICY "Public read partners" ON public.partners FOR SELECT USING (true);
CREATE POLICY "Public read contracting_companies" ON public.contracting_companies FOR SELECT USING (true);
CREATE POLICY "Public read app_settings" ON public.app_settings FOR SELECT USING (true);

-- Bookings: public insert, staff read all
CREATE POLICY "Anyone can insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can read all bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Staff can update bookings" ON public.bookings FOR UPDATE USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can delete bookings" ON public.bookings FOR DELETE USING (public.is_staff_or_admin(auth.uid()));

-- Complaints: public insert, staff read
CREATE POLICY "Anyone can insert complaints" ON public.complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can read complaints" ON public.complaints FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

-- Staff-only tables
CREATE POLICY "Staff full access operations" ON public.operations FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff full access payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Staff full access payment_notifications" ON public.payment_notifications FOR ALL USING (true);
CREATE POLICY "Staff full access app_notifications" ON public.app_notifications FOR ALL USING (true);
CREATE POLICY "Staff full access profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Staff full access user_roles" ON public.user_roles FOR ALL USING (true);

-- Staff can manage content
CREATE POLICY "Staff manage doctors" ON public.doctors FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage services" ON public.services FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage hero_images" ON public.hero_images FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage partners" ON public.partners FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage contracting_companies" ON public.contracting_companies FOR ALL USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage app_settings" ON public.app_settings FOR ALL USING (public.is_staff_or_admin(auth.uid()));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracting_companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
