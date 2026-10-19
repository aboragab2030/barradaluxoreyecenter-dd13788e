// Public webhook for Paymob "Transaction processed" callbacks. Nothing is trusted until the HMAC is verified.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, serviceClient, loadAllHmacSecrets } from "../_shared/paymob.ts";
import { verifyPaymobHmac } from "../_shared/paymobHmac.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Paymob may also hit this URL with the browser "response" callback (GET); we use our own return page instead.
  if (req.method !== "POST") return json({ ok: true });

  try {
    const hmac = new URL(req.url).searchParams.get("hmac") || "";
    const body = await req.json().catch(() => null);
    const obj = body?.obj;
    if (!obj || (body?.type && body.type !== "TRANSACTION")) return json({ ok: true, ignored: true });

    const db = serviceClient();
    const secrets = await loadAllHmacSecrets(db);
    if (!(await verifyPaymobHmac(obj, hmac, secrets))) {
      console.warn("Paymob webhook rejected: invalid HMAC");
      return json({ error: "invalid signature" }, 401);
    }

    const reference = typeof obj.order?.merchant_order_id === "string" && obj.order.merchant_order_id.startsWith("PM-")
      ? obj.order.merchant_order_id
      : null;

    const { data: result, error } = await db.rpc("paymob_apply_transaction", {
      _reference: reference,
      _paymob_order_id: obj.order?.id ?? null,
      _transaction_id: obj.id,
      _amount_cents: Number(obj.amount_cents),
      _success: obj.success === true,
      _pending: obj.pending === true,
      _source_type: obj.source_data?.type ?? null,
      _raw: body,
    });
    if (error) {
      console.error("paymob_apply_transaction failed:", error.message);
      return json({ error: "processing failed" }, 500); // Paymob will retry
    }
    console.log(`Paymob transaction ${obj.id} for ${reference ?? obj.order?.id}: ${result}`);
    return json({ ok: true, result });
  } catch (e) {
    console.error("paymob-webhook error:", e instanceof Error ? e.message : e);
    return json({ error: "unexpected error" }, 500);
  }
});
