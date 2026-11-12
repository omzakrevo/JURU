/**
 * Hook « Send SMS » de Supabase Auth (GoTrue) : envoie les codes OTP via SMS Bus à la place d'un fournisseur natif.
 *
 * Configuration GoTrue (docker-compose, service auth) :
 *   GOTRUE_HOOK_SEND_SMS_ENABLED=true
 *   GOTRUE_HOOK_SEND_SMS_URI=http://functions:9000/send-sms-hook     (URL interne de l'Edge Function)
 *   GOTRUE_HOOK_SEND_SMS_SECRETS=v1,whsec_<secret>                    (signature Standard Webhooks)
 * Variable de la fonction : SEND_SMS_HOOK_SECRET=whsec_<secret> (même secret). Ne jamais journaliser le code OTP.
 * À valider sur votre version de GoTrue (format du hook) avant production.
 */
import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { loadSmsConfig, sendSms } from '../_shared/smsbus.ts';

Deno.serve(async (req) => {
  const secret = Deno.env.get('SEND_SMS_HOOK_SECRET');
  if (!secret) return new Response('Hook not configured', { status: 503 });
  const raw = await req.text();
  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    payload = new Webhook(secret.replace('v1,whsec_', '').replace('whsec_', '')).verify(raw, Object.fromEntries(req.headers)) as typeof payload;
  } catch {
    return new Response('Invalid signature', { status: 401 });
  }
  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;
  if (!phone || !otp) return new Response('Bad payload', { status: 400 });
  try {
    await sendSms(loadSmsConfig((k) => Deno.env.get(k)), phone, `JURU : votre code de vérification est ${otp}. Ne le communiquez à personne.`);
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    // Format d'erreur attendu par les hooks Supabase Auth
    return new Response(JSON.stringify({ error: { http_code: 503, message: 'Envoi SMS impossible' } }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
});
