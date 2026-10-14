CREATE TABLE public.instapay_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  booking_ref text NOT NULL UNIQUE,
  transaction_ref text NOT NULL,
  declared_amount integer,
  amount_due integer NOT NULL,
  verified_amount integer,
  evidence_path text,
  status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW','REVIEW_REQUIRED','PAID','MISMATCH','REJECTED')),
  reason text,
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  payment_id uuid REFERENCES public.payments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX instapay_paid_txn_unique ON public.instapay_submissions (lower(trim(transaction_ref))) WHERE status = 'PAID';
CREATE INDEX instapay_txn_idx ON public.instapay_submissions (lower(trim(transaction_ref)));

CREATE TABLE public.instapay_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.instapay_submissions(id) ON DELETE RESTRICT,
  booking_ref text NOT NULL,
  event_type text NOT NULL,
  actor_id uuid,
  actor_name text NOT NULL DEFAULT 'SYSTEM',
  previous_status text,
  new_status text,
  reason text,
  verification_method text NOT NULL DEFAULT 'MANUAL',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.instapay_submissions TO authenticated;
GRANT ALL ON public.instapay_submissions TO service_role;
GRANT SELECT ON public.instapay_audit_events TO authenticated;
GRANT ALL ON public.instapay_audit_events TO service_role;

ALTER TABLE public.instapay_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instapay_audit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_review_instapay(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin') OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _uid AND p.is_active IS NOT FALSE
      AND public.is_staff_or_admin(_uid)
      AND COALESCE(p.permissions, '[]'::jsonb) ? 'review_instapay'
  )
$$;

CREATE POLICY "Reviewers read submissions" ON public.instapay_submissions FOR SELECT TO authenticated USING (public.can_review_instapay(auth.uid()));
CREATE POLICY "Reviewers read audit" ON public.instapay_audit_events FOR SELECT TO authenticated USING (public.can_review_instapay(auth.uid()));

-- Amount due: service price + doctor fee (fee is 0 for follow-up visits, same rule as the booking form)
CREATE OR REPLACE FUNCTION public.instapay_amount_due(_service text, _doctor_id uuid, _doctor_name text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT price FROM public.services WHERE title = _service LIMIT 1), 0)
       + CASE WHEN _service LIKE '%متابعة كشف%' OR _service LIKE '%متابعة الكشف%' OR _service LIKE '%متابعة عملية%' OR _service LIKE '%متابعة العملية%' THEN 0
              ELSE COALESCE((SELECT fee FROM public.doctors WHERE id = _doctor_id OR (_doctor_id IS NULL AND name = _doctor_name) LIMIT 1), 0) END
$$;

CREATE OR REPLACE FUNCTION public.submit_instapay_payment(_booking_id uuid, _phone text, _transaction_ref text, _declared_amount integer, _evidence_path text)
RETURNS TABLE(booking_ref text, amount_due integer, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings; v_ref text; v_due integer; v_id uuid; v_txn text := trim(COALESCE(_transaction_ref, ''));
BEGIN
  IF length(v_txn) < 4 OR length(v_txn) > 100 THEN RAISE EXCEPTION 'invalid transaction reference'; END IF;
  IF _declared_amount IS NOT NULL AND (_declared_amount < 0 OR _declared_amount > 1000000) THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF _evidence_path IS NOT NULL AND _evidence_path NOT LIKE _booking_id::text || '/%' THEN RAISE EXCEPTION 'invalid evidence path'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND OR b.phone <> _phone OR COALESCE(b.payment_method,'') <> 'instapay' THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF b.created_at < now() - interval '1 hour' THEN RAISE EXCEPTION 'submission window closed'; END IF;
  IF EXISTS (SELECT 1 FROM public.instapay_submissions s WHERE s.booking_id = _booking_id) THEN RAISE EXCEPTION 'already submitted'; END IF;
  v_due := public.instapay_amount_due(b.service, b.doctor_id, b.doctor_name);
  v_ref := 'BR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.instapay_submissions (booking_id, booking_ref, transaction_ref, declared_amount, amount_due, evidence_path)
  VALUES (_booking_id, v_ref, v_txn, _declared_amount, v_due, _evidence_path) RETURNING id INTO v_id;
  INSERT INTO public.instapay_audit_events (submission_id, booking_ref, event_type, previous_status, new_status)
  VALUES (v_id, v_ref, 'PAYMENT_EVIDENCE_SUBMITTED', 'NOT_STARTED', 'PENDING_REVIEW');
  INSERT INTO public.payment_notifications (patient_name, amount, message)
  VALUES (b.patient_name, COALESCE(_declared_amount, v_due), 'طلب مراجعة تحويل إنستاباي للحجز ' || v_ref || ' - رقم العملية: ' || v_txn);
  RETURN QUERY SELECT v_ref, v_due, 'PENDING_REVIEW'::text;
END $$;

CREATE OR REPLACE FUNCTION public.get_instapay_status(_booking_ref text, _phone text)
RETURNS TABLE(booking_ref text, status text, reason text, amount_due integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.booking_ref, s.status, CASE WHEN s.status IN ('REJECTED','MISMATCH') THEN s.reason END, s.amount_due
  FROM public.instapay_submissions s JOIN public.bookings b ON b.id = s.booking_id
  WHERE s.booking_ref = upper(trim(_booking_ref)) AND (b.phone = trim(_phone) OR b.phone2 = trim(_phone))
$$;

CREATE OR REPLACE FUNCTION public.review_instapay_payment(_submission_id uuid, _action text, _verified_amount integer, _reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.instapay_submissions; b public.bookings; v_new text; v_name text; v_pay uuid; v_event text;
BEGIN
  IF NOT public.can_review_instapay(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO s FROM public.instapay_submissions WHERE id = _submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF s.status IN ('PAID','REJECTED') THEN RAISE EXCEPTION 'already finalized'; END IF;
  SELECT COALESCE((SELECT name FROM public.profiles WHERE user_id = auth.uid()), 'staff') INTO v_name;
  IF _action = 'approve' THEN
    IF _verified_amount IS NULL THEN RAISE EXCEPTION 'verified amount required'; END IF;
    IF _verified_amount <> s.amount_due THEN
      v_new := 'MISMATCH'; v_event := 'PAYMENT_FLAGGED';
      _reason := COALESCE(NULLIF(trim(_reason),''), 'المبلغ المستلم ' || _verified_amount || ' لا يطابق المستحق ' || s.amount_due);
    ELSE
      IF EXISTS (SELECT 1 FROM public.instapay_submissions x WHERE x.id <> s.id AND x.status = 'PAID' AND lower(trim(x.transaction_ref)) = lower(trim(s.transaction_ref))) THEN
        RAISE EXCEPTION 'transaction already allocated';
      END IF;
      IF EXISTS (SELECT 1 FROM public.payments p WHERE lower(trim(p.transaction_id)) = lower(trim(s.transaction_ref))) THEN
        RAISE EXCEPTION 'transaction already recorded';
      END IF;
      SELECT * INTO b FROM public.bookings WHERE id = s.booking_id FOR UPDATE;
      INSERT INTO public.payments (patient_name, patient_phone, amount, transaction_id, payment_type, status, booking_id, matched_at, notes)
      VALUES (b.patient_name, b.phone, _verified_amount, trim(s.transaction_ref), 'instapay', 'paid', s.booking_id::text, now(), 'اعتماد يدوي ' || s.booking_ref)
      RETURNING id INTO v_pay;
      UPDATE public.bookings SET payment_status = 'paid', updated_at = now() WHERE id = s.booking_id;
      v_new := 'PAID'; v_event := 'PAYMENT_APPROVED';
    END IF;
  ELSIF _action = 'reject' THEN
    IF NULLIF(trim(COALESCE(_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'reason required'; END IF;
    v_new := 'REJECTED'; v_event := 'PAYMENT_REJECTED';
  ELSIF _action = 'investigate' THEN
    v_new := 'REVIEW_REQUIRED'; v_event := 'PAYMENT_FLAGGED';
  ELSE RAISE EXCEPTION 'invalid action'; END IF;

  UPDATE public.instapay_submissions SET status = v_new, verified_amount = COALESCE(_verified_amount, verified_amount), reason = NULLIF(trim(COALESCE(_reason,'')),''),
    reviewed_by = auth.uid(), reviewed_by_name = v_name, reviewed_at = now(), payment_id = COALESCE(v_pay, payment_id), updated_at = now()
  WHERE id = s.id;
  INSERT INTO public.instapay_audit_events (submission_id, booking_ref, event_type, actor_id, actor_name, previous_status, new_status, reason)
  VALUES (s.id, s.booking_ref, v_event, auth.uid(), v_name, s.status, v_new, NULLIF(trim(COALESCE(_reason,'')),''));
  IF v_new = 'PAID' THEN
    INSERT INTO public.instapay_audit_events (submission_id, booking_ref, event_type, actor_id, actor_name, previous_status, new_status)
    VALUES (s.id, s.booking_ref, 'BOOKING_PAYMENT_CONFIRMED', auth.uid(), v_name, s.status, v_new);
  END IF;
  RETURN v_new;
END $$;

REVOKE ALL ON FUNCTION public.submit_instapay_payment(uuid,text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_instapay_payment(uuid,text,text,integer,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_instapay_status(text,text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.review_instapay_payment(uuid,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_instapay_payment(uuid,text,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.instapay_amount_due(text,uuid,text) FROM PUBLIC, anon;