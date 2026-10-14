# InstaPay payment verification (manual accounting review)

## What already exists (stays as-is)
- The booking window already has an InstaPay option. It shows the transfer account and a "تم إرسال المبلغ وتأكيد الحجز" button that saves the booking right away. That flow stays: book now, check later.
- The admin panel has a payments section and a payments table that holds transfer numbers. Both are reused; no second payment system is added.
- InstaPay has no public service the website can use to check transfers automatically. All checks are done by hand by an accountant looking at the real account. The website never marks a payment as paid by itself.

## What patients will see (InstaPay only; cash and wallet are unchanged)
1. On the existing InstaPay step, two fields are added above the existing button: the transfer number (required) and the amount sent. An optional receipt photo can also be attached.
2. After booking, the confirmation shows a booking reference and the message: "التحويل قيد المراجعة ولم يتم تأكيد الدفع بعد."
3. A small "متابعة حالة الدفع" lookup: the patient enters the booking reference and their phone number and sees the payment status only (under review / confirmed / rejected with reason). No other patient's data can be seen.

## What accountants will see
- A new staff permission "مراجعة مدفوعات إنستاباي", given from the existing staff screen. Admins have it automatically.
- A new panel inside the existing payments section titled "مراجعة مدفوعات إنستاباي", with:
  - search by booking reference or transfer number, and a filter by status and date
  - amount due, amount the patient says they sent, and verified amount
  - the receipt photo (private; only reviewers can open it)
  - buttons: Approve (asks for the verified amount), Reject (a reason is required), Needs investigation
  - a history of every decision, with the employee's name and time
- Warnings shown automatically:
  - a transfer number already used on another booking
  - an amount lower or higher than the amount due
- Approving is only allowed when the verified amount equals the full amount due. Otherwise the payment is marked mismatched.
- Admin-panel alerts for new submissions use the existing payment notifications.

## Not included (as agreed or not possible)
- No automatic InstaPay checking. InstaPay has no public service for this.
- No WhatsApp messages. Status is shown on the website, and staff get alerts in the admin panel.
- No 15-minute slot hold. Bookings are created immediately, as today.
- Refunds are not handled in this round. Refund statuses are reserved, but there are no refund screens.

## Technical details
- New table `instapay_submissions`, linked to a booking:
  - fields: booking_id, booking_ref (unique, server-generated), transaction_ref, declared_amount, amount_due, verified_amount, evidence_path, status (PENDING_REVIEW, REVIEW_REQUIRED, PAID, MISMATCH, REJECTED), reason, reviewed_by, reviewed_at
  - a unique index on the transfer number among approved rows, so one transfer cannot be approved for two bookings
- New table `instapay_audit_events`: insert-only, staff can read it, and nobody can edit or delete entries.
- Public RPC `submit_instapay_payment` (security definer):
  - computes amount_due on the server from `services.price` + `doctors.fee`, using the existing follow-up rule
  - creates the submission plus a payment_notification, and logs the event
- Public RPC `get_instapay_status(ref, phone)`: returns only the status and reason, and only when the phone number matches.
- RPC `review_instapay_payment(id, action, verified_amount, reason)`:
  - checks the new permission (or admin) on the server
  - locks the row, refuses repeat approvals, and requires a reason on rejection
  - when approved: sets the booking's payment_status to 'paid' and inserts a `payments` row (type instapay, status paid) in the same transaction, then logs the event
- Private storage bucket `instapay-evidence`:
  - images or PDF only, up to 5 MB
  - anyone can upload, but only reviewers can read the files
- Bookings insert stays exactly as today. The submission RPC runs right after the existing insert returns the booking id.
- Booking status, schedules, prices, and the cash and wallet flows stay untouched.
- Tests:
  - amount-due calculation
  - approval rules: full amount only, reject requires a reason, no double approval
  - duplicate transfer detection
  - existing tests still pass, and the booking flow is re-run in the browser
