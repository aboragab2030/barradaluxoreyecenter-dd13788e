
-- Create contact_logs table for tracking staff communications with patients
CREATE TABLE public.contact_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id uuid NOT NULL,
  staff_name text NOT NULL,
  patient_name text NOT NULL,
  patient_phone text NOT NULL,
  contact_type text NOT NULL, -- 'whatsapp', 'sms', 'call'
  item_type text NOT NULL, -- 'booking', 'operation'
  item_id text,
  doctor_name text,
  message_preview text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;

-- Staff can read all logs
CREATE POLICY "Staff can read contact_logs"
  ON public.contact_logs
  FOR SELECT
  USING (is_staff_or_admin(auth.uid()));

-- Staff can insert their own logs
CREATE POLICY "Staff can insert contact_logs"
  ON public.contact_logs
  FOR INSERT
  WITH CHECK (is_staff_or_admin(auth.uid()));

-- Only admin can delete logs
CREATE POLICY "Admin can delete contact_logs"
  ON public.contact_logs
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Update RLS: Only admin can delete bookings
DROP POLICY IF EXISTS "Staff can delete bookings" ON public.bookings;
CREATE POLICY "Admin can delete bookings"
  ON public.bookings
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Update RLS: Only admin can delete operations
DROP POLICY IF EXISTS "Staff full access operations" ON public.operations;

CREATE POLICY "Staff can read operations"
  ON public.operations
  FOR SELECT
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert operations"
  ON public.operations
  FOR INSERT
  WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update operations"
  ON public.operations
  FOR UPDATE
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Admin can delete operations"
  ON public.operations
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));
