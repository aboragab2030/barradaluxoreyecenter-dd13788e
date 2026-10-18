CREATE OR REPLACE FUNCTION public.confirm_booking_on_instapay_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'PAID' AND OLD.status IS DISTINCT FROM 'PAID' THEN
    UPDATE public.bookings SET status = 'confirmed', payment_status = 'paid', updated_at = now() WHERE id = NEW.booking_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS instapay_paid_confirms_booking ON public.instapay_submissions;
CREATE TRIGGER instapay_paid_confirms_booking AFTER UPDATE OF status ON public.instapay_submissions
FOR EACH ROW EXECUTE FUNCTION public.confirm_booking_on_instapay_paid();
REVOKE EXECUTE ON FUNCTION public.confirm_booking_on_instapay_paid() FROM PUBLIC, anon, authenticated;