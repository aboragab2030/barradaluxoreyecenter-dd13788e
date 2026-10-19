// Public: creates a Paymob payment intention for a booking that was just made with method "paymob".
// The amount is always calculated here on the server, never taken from the browser.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, serviceClient, loadConfig, isComplete, PAYMOB_BASE_URL } from "../_shared/paymob.ts";

const DEFAULT_SITE = "https://barradaluxoreyecenter.lovable.app";

function safeReturnOrigin(req: Request, requested: unknown): string {
  const header = req.headers.get("origin");
  const candidate = typeof requested === "string" ? requested : header;
  try {
    const u = new URL(candidate ?? "");
    const host = u.hostname;
    const allowed = u.protocol === "https:" && (
      host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com") || host.endsWith(".lovable.dev") ||
      (Deno.env.get("SITE_URL") && host === new URL(Deno.env.get("SITE_URL")!).hostname)
    );
    if (allowed) return u.origin;
  } catch (_e) { /* fall through */ }
  return Deno.env.get("SITE_URL") || DEFAULT_SITE;
}

function splitName(full: string): { first: string; last: string } {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "NA", last: parts.slice(1).join(" ") || "NA" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { booking_id, phone, return_origin } = await req.json();
    if (typeof booking_id !== "string" || typeof phone !== "string") return json({ error: "بيانات غير مكتملة" }, 400);

    const db = serviceClient();
    const cfg = await loadConfig(db);
    if (!cfg.enabled || !isComplete(cfg)) return json({ error: "الدفع الإلكتروني غير متاح حالياً" }, 400);

    const { data: booking } = await db.from("bookings").select("*").eq("id", booking_id).maybeSingle();
    if (!booking || (booking.phone !== phone.trim() && booking.phone2 !== phone.trim()) || booking.payment_method !== "paymob") {
      return json({ error: "الحجز غير موجود" }, 404);
    }
    if (booking.payment_status === "paid") return json({ error: "تم دفع هذا الحجز بالفعل" }, 400);
    if (new Date(booking.created_at).getTime() < Date.now() - 2 * 60 * 60 * 1000) {
      return json({ error: "انتهت مهلة الدفع لهذا الحجز، يرجى التواصل مع المركز" }, 400);
    }

    const { data: due, error: dueError } = await db.rpc("instapay_amount_due", {
      _service: booking.service, _doctor_id: booking.doctor_id, _doctor_name: booking.doctor_name,
    });
    if (dueError) throw dueError;
    const amountCents = Math.round(Number(due) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) return json({ error: "لا يمكن تحديد قيمة الكشف، يرجى التواصل مع المركز" }, 400);

    const reference = "PM-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    const origin = safeReturnOrigin(req, return_origin);
    const name = splitName(booking.patient_name);

    const payload = {
      amount: amountCents,
      currency: "EGP",
      payment_methods: [cfg.cardIntegrationId, cfg.walletIntegrationId].filter(Boolean),
      items: [{ name: String(booking.service || "كشف").slice(0, 50), amount: amountCents, description: `حجز ${booking.date} ${booking.time}`.slice(0, 50), quantity: 1 }],
      billing_data: {
        first_name: name.first, last_name: name.last,
        phone_number: booking.phone,
        email: booking.patient_email || "no-email@barradaluxoreyecenter.lovable.app",
        apartment: "NA", floor: "NA", street: "NA", building: "NA",
        city: booking.governorate || "NA", state: booking.governorate || "NA", country: "EG",
      },
      special_reference: reference,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/paymob-webhook`,
      redirection_url: `${origin}/?paymob_ref=${reference}`,
    };

    const res = await fetch(`${PAYMOB_BASE_URL}/v1/intention/`, {
      method: "POST",
      headers: { "Authorization": `Token ${cfg.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("Paymob intention failed:", res.status, text.slice(0, 1000));
      return json({ error: "تعذر بدء عملية الدفع، يرجى المحاولة لاحقاً أو اختيار طريقة دفع أخرى" }, 502);
    }
    const intention = JSON.parse(text);
    if (!intention.client_secret) {
      console.error("Paymob intention without client_secret:", text.slice(0, 1000));
      return json({ error: "تعذر بدء عملية الدفع" }, 502);
    }

    const { error: insertError } = await db.from("paymob_payments").insert({
      booking_id: booking.id,
      reference,
      intention_id: intention.id ? String(intention.id) : null,
      paymob_order_id: intention.intention_order_id ?? null,
      amount_cents: amountCents,
      mode: cfg.mode,
    });
    if (insertError) throw insertError;

    const checkoutUrl = `${PAYMOB_BASE_URL}/unifiedcheckout/?publicKey=${encodeURIComponent(cfg.publicKey!)}&clientSecret=${encodeURIComponent(intention.client_secret)}`;
    return json({ checkout_url: checkoutUrl, reference, amount: amountCents / 100 });
  } catch (e) {
    console.error("paymob-create-payment error:", e instanceof Error ? e.message : e);
    return json({ error: "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى" }, 500);
  }
});
