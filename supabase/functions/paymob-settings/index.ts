// Admin-only: read and save Paymob settings. Secret values are encrypted and never returned.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireAdmin, serviceClient, encryptSecret, loadConfig, isComplete, PaymobMode } from "../_shared/paymob.ts";
import { validatePaymobKeys } from "../_shared/paymobHmac.ts";

const last4 = (s: string) => s.slice(-4);
const cleanText = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const cleanId = (v: unknown): number | null | "invalid" => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : "invalid";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const adminId = await requireAdmin(req);
  if (!adminId) return json({ error: "غير مصرح لك بهذه الصفحة" }, 403);

  const db = serviceClient();
  const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/paymob-webhook`;

  const describe = async () => {
    const { data: settings } = await db.from("payment_gateway_settings").select("*").eq("id", 1).maybeSingle();
    const { data: secrets } = await db.from("payment_gateway_secrets").select("mode, secret_key_last4, hmac_last4, secret_key_enc, hmac_secret_enc");
    const secretInfo: Record<string, unknown> = {};
    for (const mode of ["test", "live"]) {
      const row = (secrets ?? []).find((r) => r.mode === mode);
      secretInfo[mode] = {
        has_secret_key: Boolean(row?.secret_key_enc),
        has_hmac: Boolean(row?.hmac_secret_enc),
        secret_key_last4: row?.secret_key_last4 ?? null,
        hmac_last4: row?.hmac_last4 ?? null,
      };
    }
    return { settings, secrets: secretInfo, webhook_url: webhookUrl };
  };

  try {
    if (req.method === "GET") return json(await describe());
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json();
    const mode: PaymobMode = body.mode === "live" ? "live" : "test";
    const enabled = body.enabled === true;

    const update: Record<string, unknown> = { enabled, mode, updated_by: adminId, updated_at: new Date().toISOString() };
    for (const m of ["test", "live"] as const) {
      const publicKey = cleanText(body[`${m}_public_key`]);
      const secretKey = cleanText(body[`${m}_secret_key`]);
      const err = validatePaymobKeys(m, { publicKey, secretKey });
      if (err) return json({ error: err }, 400);
      const card = cleanId(body[`${m}_card_integration_id`]);
      const wallet = cleanId(body[`${m}_wallet_integration_id`]);
      if (card === "invalid" || wallet === "invalid") return json({ error: "رقم الـ Integration ID يجب أن يكون رقماً صحيحاً" }, 400);
      update[`${m}_public_key`] = publicKey;
      update[`${m}_card_integration_id`] = card;
      update[`${m}_wallet_integration_id`] = wallet;
    }

    // Save secret values that were typed in (empty = keep the stored value).
    for (const m of ["test", "live"] as const) {
      const secretKey = cleanText(body[`${m}_secret_key`]);
      const hmac = cleanText(body[`${m}_hmac_secret`]);
      if (!secretKey && !hmac) continue;
      const row: Record<string, unknown> = { mode: m, updated_at: new Date().toISOString() };
      if (secretKey) { row.secret_key_enc = await encryptSecret(secretKey); row.secret_key_last4 = last4(secretKey); }
      if (hmac) { row.hmac_secret_enc = await encryptSecret(hmac); row.hmac_last4 = last4(hmac); }
      const { error } = await db.from("payment_gateway_secrets").upsert(row, { onConflict: "mode" });
      if (error) throw error;
    }

    // Save non-secret settings first with enabled=false, then check completeness before enabling.
    const { error: saveError } = await db.from("payment_gateway_settings").update({ ...update, enabled: false }).eq("id", 1);
    if (saveError) throw saveError;

    if (enabled) {
      const cfg = await loadConfig(db, mode);
      if (!isComplete(cfg)) {
        const label = mode === "live" ? "الحقيقي" : "التجريبي";
        return json({ error: `لا يمكن التفعيل: بيانات الوضع ${label} ناقصة (Public Key و Secret Key و HMAC ورقم Integration واحد على الأقل). تم حفظ باقي البيانات والدفع الإلكتروني متوقف.`, saved: await describe() }, 400);
      }
      const { error } = await db.from("payment_gateway_settings").update({ enabled: true }).eq("id", 1);
      if (error) throw error;
    }

    return json({ ok: true, ...(await describe()) });
  } catch (e) {
    console.error("paymob-settings error:", e instanceof Error ? e.message : e);
    return json({ error: "حدث خطأ أثناء حفظ الإعدادات" }, 500);
  }
});
