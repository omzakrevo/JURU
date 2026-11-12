/**
 * Edge Function — webhooks SAS Pay (POST /functions/v1/payment-webhook/sas-pay).
 * Vérifie : horodatage ≤ 5 min + signature HMAC(timestamp.corps brut) en temps constant (secret WEBHOOK_SECRET_SAS_PAY,
 * affiché UNE fois à la création du webhook dans le tableau de bord SAS Pay). Stocke l'événement de façon IDEMPOTENTE
 * (unique provider + `event:id`) puis répond 200 (5 tentatives côté SAS Pay si non-2xx).
 * Le traitement métier (mise à jour du statut + comptabilité) NE se fie PAS au webhook seul : il doit revérifier le statut
 * via GET /payments/{id}/verify/ (ou /payouts/{id}/verify/) avant toute écriture comptable — non activé tant que les
 * paiements réels sont désactivés. Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEBHOOK_SECRET_SAS_PAY.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verifySasPayWebhook } from '../_shared/saspay.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (new URL(req.url).pathname.split('/').filter(Boolean).pop() !== 'sas-pay') return new Response('Unknown provider', { status: 404 });
  const secret = Deno.env.get('WEBHOOK_SECRET_SAS_PAY');
  if (!secret) return new Response('Provider not configured', { status: 503 });

  const raw = await req.text();
  if (raw.length > 100_000) return new Response('Payload too large', { status: 413 });
  const v = await verifySasPayWebhook(raw, req.headers, secret);
  if (!v.ok) return new Response(v.reason, { status: v.reason === 'bad_signature' || v.reason === 'stale_timestamp' ? 401 : 400 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const relevant = v.event.startsWith('transaction.');
  const { error } = await supabase.from('payment_webhook_events').insert({
    provider: 'sas_pay', event_id: v.eventKey, signature_valid: true, payload: { event: v.event, data: v.data },
    status: relevant ? 'received' : 'ignored',
  });
  if (error && error.code !== '23505') return new Response('Storage error', { status: 500 }); // 23505 = rejeu
  return new Response(JSON.stringify({ received: true, duplicate: error?.code === '23505' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
