-- Paymob online payments (card + mobile wallet)
-- Settings are edited from the admin panel; secret values live in a table only the service role can read.

CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test','live')),
  test_public_key text,
  test_card_integration_id integer,
  test_wallet_integration_id integer,
  live_public_key text,
  live_card_integration_id integer,
  live_wallet_integration_id integer,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.payment_gateway_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.payment_gateway_secrets (
  mode text PRIMARY KEY CHECK (mode IN ('test','live')),
  secret_key_enc text,
  hmac_secret_enc text,
  secret_key_last4 text,
  hmac_last4 text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.paymob_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  reference text NOT NULL UNIQUE,
  intention_id text,
  paymob_order_id bigint,
  transaction_id bigint UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EGP',
  mode text NOT NULL CHECK (mode IN ('test','live')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','amount_mismatch')),
  source_type text,
  payment_id uuid REFERENCES public.payments(id),
  raw_callback jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS paymob_payments_booking_idx ON public.paymob_payments (booking_id);
CREATE INDEX IF NOT EXISTS paymob_payments_order_idx ON public.paymob_payments (paymob_order_id);

ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paymob_payments ENABLE ROW LEVEL SECURITY;

-- Secrets: no policies at all, and no grants to browser roles. Only the service role (edge functions) can read/write.
REVOKE ALL ON public.payment_gateway_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_gateway_secrets TO service_role;

-- Settings (no secret values in this table): admins can read; writes go through the edge function.
REVOKE ALL ON public.payment_gateway_settings FROM PUBLIC, anon;
GRANT SELECT ON public.payment_gateway_settings TO authenticated;
GRANT ALL ON public.payment_gateway_settings TO service_role;
DROP POLICY IF EXISTS "Admins read gateway settings" ON public.payment_gateway_settings;
CREATE POLICY "Admins read gateway settings" ON public.payment_gateway_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Paymob payments: read-only for admins and payment reviewers; written only by edge functions.
REVOKE ALL ON public.paymob_payments FROM PUBLIC, anon;
GRANT SELECT ON public.paymob_payments TO authenticated;
GRANT ALL ON public.paymob_payments TO service_role;
DROP POLICY IF EXISTS "Reviewers read paymob payments" ON public.paymob_payments;
CREATE POLICY "Reviewers read paymob payments" ON public.paymob_payments FOR SELECT TO authenticated
  USING (public.can_review_instapay(auth.uid()));

-- Public: is online payment available? (returns nothing sensitive)
CREATE OR REPLACE FUNCTION public.paymob_is_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT enabled FROM public.payment_gateway_settings WHERE id = 1), false)
$$;
GRANT EXECUTE ON FUNCTION public.paymob_is_enabled() TO anon, authenticated;

-- Public: payment status by its random reference (shown to the patient after returning from Paymob)
CREATE OR REPLACE FUNCTION public.get_paymob_status(_reference text)
RETURNS TABLE(reference text, status text, amount integer, booking_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.reference, p.status, (p.amount_cents / 100)::integer, p.booking_id
  FROM public.paymob_payments p WHERE p.reference = upper(trim(_reference))
$$;
GRANT EXECUTE ON FUNCTION public.get_paymob_status(text) TO anon, authenticated;

-- Amount due uses the same rule as InstaPay (service price + doctor fee, no fee for follow-ups)
GRANT EXECUTE ON FUNCTION public.instapay_amount_due(text,uuid,text) TO service_role;

-- Called by the webhook (service role) after the HMAC is verified. Idempotent and atomic.
CREATE OR REPLACE FUNCTION public.paymob_apply_transaction(
  _reference text, _paymob_order_id bigint, _transaction_id bigint, _amount_cents integer,
  _success boolean, _pending boolean, _source_type text, _raw jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.paymob_payments; b public.bookings; v_status text; v_pay uuid; v_ptype public.payment_type;
BEGIN
  SELECT * INTO p FROM public.paymob_payments
   WHERE (_reference IS NOT NULL AND reference = _reference)
      OR (_reference IS NULL AND paymob_order_id = _paymob_order_id)
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF p.status = 'paid' THEN RETURN 'already_paid'; END IF;
  IF p.transaction_id IS NOT NULL AND p.transaction_id = _transaction_id AND p.status <> 'pending' THEN RETURN 'duplicate'; END IF;

  IF _success AND NOT _pending THEN
    IF _amount_cents <> p.amount_cents THEN
      v_status := 'amount_mismatch';
    ELSE
      SELECT * INTO b FROM public.bookings WHERE id = p.booking_id FOR UPDATE;
      v_ptype := CASE WHEN lower(COALESCE(_source_type,'')) = 'wallet' THEN 'wallet'::public.payment_type ELSE 'other'::public.payment_type END;
      INSERT INTO public.payments (patient_name, patient_phone, amount, transaction_id, payment_type, payment_type_detail, status, booking_id, matched_at, notes)
      VALUES (b.patient_name, b.phone, p.amount_cents / 100, 'PAYMOB-' || _transaction_id::text, v_ptype,
              'Paymob - ' || CASE WHEN lower(COALESCE(_source_type,'')) = 'wallet' THEN 'محفظة' ELSE 'بطاقة' END,
              'paid', p.booking_id::text, now(), 'دفع إلكتروني ' || p.reference || ' (' || p.mode || ')')
      RETURNING id INTO v_pay;
      UPDATE public.bookings SET payment_status = 'paid', updated_at = now() WHERE id = p.booking_id;
      INSERT INTO public.payment_notifications (payment_id, patient_name, amount, message, is_read)
      VALUES (v_pay, b.patient_name, p.amount_cents / 100,
              'تم استلام دفعة إلكترونية عبر Paymob من ' || b.patient_name || ' بقيمة ' || (p.amount_cents / 100) || ' ج.م - ' || p.reference, false);
      v_status := 'paid';
    END IF;
  ELSE
    v_status := 'failed';
  END IF;

  UPDATE public.paymob_payments SET status = v_status, transaction_id = _transaction_id,
    paymob_order_id = COALESCE(paymob_order_id, _paymob_order_id), source_type = _source_type,
    payment_id = COALESCE(v_pay, payment_id), raw_callback = _raw, updated_at = now()
  WHERE id = p.id;
  RETURN v_status;
END $$;
REVOKE ALL ON FUNCTION public.paymob_apply_transaction(text,bigint,bigint,integer,boolean,boolean,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.paymob_apply_transaction(text,bigint,bigint,integer,boolean,boolean,text,jsonb) TO service_role;
