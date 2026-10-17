ALTER TABLE public.instapay_submissions ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by uuid;

CREATE OR REPLACE FUNCTION public.delete_instapay_submission(_submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s public.instapay_submissions; v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO s FROM public.instapay_submissions WHERE id = _submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF s.deleted_at IS NOT NULL THEN RETURN; END IF;
  SELECT COALESCE((SELECT name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), 'admin') INTO v_name;
  UPDATE public.instapay_submissions SET deleted_at = now(), deleted_by = auth.uid(), updated_at = now() WHERE id = s.id;
  INSERT INTO public.instapay_audit_events (submission_id, booking_ref, event_type, actor_id, actor_name, previous_status, new_status, reason)
  VALUES (s.id, s.booking_ref, 'REVIEW_ENTRY_DELETED', auth.uid(), v_name, s.status, s.status, 'حذف من سجل المراجعة مع الاحتفاظ بالحجز وسجل الدفع');
END;
$$;
REVOKE ALL ON FUNCTION public.delete_instapay_submission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_instapay_submission(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_deleted_instapay_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'review entry deleted';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_deleted_instapay_review BEFORE UPDATE ON public.instapay_submissions FOR EACH ROW EXECUTE FUNCTION public.prevent_deleted_instapay_review();
COMMENT ON COLUMN public.instapay_submissions.deleted_at IS 'Admin-only removal from review history; retain financial, booking and audit records.';