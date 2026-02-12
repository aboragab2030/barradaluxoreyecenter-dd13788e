import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Version tracking for cache-busting verification
const VERSION = "v1.0.1";
const DEPLOYED_AT = new Date().toISOString();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-webhook-secret',
};

// Payment type mapping
const PAYMENT_TYPE_MAP: Record<string, string> = {
  'wallet': 'wallet',
  'محفظة': 'wallet',
  'vodafone': 'wallet',
  'فودافون': 'wallet',
  'instapay': 'instapay',
  'انستاباي': 'instapay',
  'fawry': 'fawry',
  'فوري': 'fawry',
};

function normalizePaymentType(type: string): 'wallet' | 'instapay' | 'fawry' | 'other' {
  const normalized = type?.toLowerCase().trim();
  return (PAYMENT_TYPE_MAP[normalized] as any) || 'other';
}

function normalizeArabicName(name: string): string {
  // Normalize Arabic text: remove diacritics, normalize spaces
  return name
    .replace(/[\u064B-\u065F]/g, '') // Remove Arabic diacritics
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .toLowerCase();
}

serve(async (req) => {
  console.log(`[${VERSION}] Payment webhook request received at ${new Date().toISOString()}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate webhook secret - MANDATORY for security
    const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('CRITICAL: PAYMENT_WEBHOOK_SECRET not configured - webhook disabled for security');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const providedSecret = req.headers.get('x-webhook-secret');
    if (!providedSecret || providedSecret !== webhookSecret) {
      console.error('Invalid or missing webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const body = await req.json();
    console.log('Payment webhook received:', JSON.stringify(body, null, 2));

    // Validate required fields
    const { patient_name, amount, transaction_id, payment_type, payment_type_detail, patient_phone } = body;

    if (!patient_name || typeof patient_name !== 'string') {
      return new Response(
        JSON.stringify({ error: 'patient_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'valid amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!transaction_id || typeof transaction_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'transaction_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths
    if (patient_name.length > 200) {
      return new Response(
        JSON.stringify({ error: 'patient_name too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (transaction_id.length > 100) {
      return new Response(
        JSON.stringify({ error: 'transaction_id too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate transaction
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('transaction_id', transaction_id.trim())
      .maybeSingle();

    if (existingPayment) {
      return new Response(
        JSON.stringify({ error: 'Transaction already processed', payment_id: existingPayment.id }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize payment type
    const normalizedPaymentType = normalizePaymentType(payment_type || 'other');

    // Insert payment record
    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert({
        patient_name: patient_name.trim(),
        patient_phone: patient_phone?.trim() || null,
        amount: amount,
        transaction_id: transaction_id.trim(),
        payment_type: normalizedPaymentType,
        payment_type_detail: payment_type_detail?.trim() || null,
        status: 'paid',
        matched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert payment:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to process payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin notification
    const { error: notifError } = await supabase
      .from('payment_notifications')
      .insert({
        payment_id: payment.id,
        patient_name: patient_name.trim(),
        amount: amount,
        message: `تم استلام دفعة بنجاح من ${patient_name.trim()} بقيمة ${amount} ج.م - رقم العملية: ${transaction_id.trim()}`,
        is_read: false,
      });

    if (notifError) {
      console.warn('Failed to create notification:', notifError);
      // Don't fail the request, notification is secondary
    }

    console.log(`[${VERSION}] Payment processed successfully:`, payment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_id: payment.id,
        message: 'Payment received and processed successfully',
        _version: VERSION
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error(`[${VERSION}] Payment webhook error:`, error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', _version: VERSION }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
