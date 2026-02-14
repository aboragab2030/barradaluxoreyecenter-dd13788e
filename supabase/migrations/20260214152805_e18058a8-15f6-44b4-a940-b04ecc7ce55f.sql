
-- Add new columns to bookings table for updated form
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS governorate text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS center text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_type text DEFAULT 'cash';
