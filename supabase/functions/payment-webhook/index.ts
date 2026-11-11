/**
 * Edge Function — réception des webhooks de paiement.
 *
 * ÉTAT : squelette sécurisé. AUCUN format de fournisseur (Orange Money / Moov Money) n'est inventé.
 * Tant que les API officielles ne sont pas contractualisées :
 *   - les secrets WEBHOOK_SECRET_<PROVIDER> sont absents => la fonction répond 503 et ne stocke rien ;
 *   - quand un secret est configuré, elle vérifie une signature HMAC-SHA256 du corps brut (en-tête à adapter
 *     à la documentation officielle), stocke l'événement de façon IDEMPOTENTE (unique provider+event_id),
 *     puis laisse un job de traitement refaire la VÉRIFICATION SERVEUR du statut auprès du fournisseur
 *     avant toute écriture comptable (jamais confiance au seul webhook).
 * Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (serveur uniquement), WEBHOOK_SECRET_ORANGE_MONEY, WEBHOOK_SECRET_MOOV_MONEY.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { hmacHex, safeEqual } from '../_shared/hmac.ts';

const PROVIDERS: Record<string, string> = { 'orange-money': 'orange_money', 'moov-money': 'moov_money' };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const slug = new URL(req.url).pathname.split('/').filter(Boolean).pop() ?? '';
  const provider = PROVIDERS[slug];
  if (!provider) return new Response('Unknown provider', { status: 404 });
  const secret = Deno.env.get(`WEBHOOK_SECRET_${provider.toUpperCase()}`);
  if (!secret) return new Response('Provider not configured', { status: 503 });

  const raw = await req.text();
  if (raw.length > 100_000) return new Response('Payload too large', { status: 413 });
  const given = (req.headers.get('x-signature') ?? '').toLowerCase(); // à adapter à la doc officielle
  const expected = await hmacHex(secret, raw);
  if (!safeEqual(given, expected)) return new Response('Invalid signature', { status: 401 });

  let payload: { id?: string };
  try { payload = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }
  if (!payload.id) return new Response('Missing event id', { status: 400 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await supabase.from('payment_webhook_events')
    .insert({ provider, event_id: String(payload.id), signature_valid: true, payload });
  // 23505 = doublon (rejeu) : on répond 200 pour que le fournisseur cesse de réessayer
  if (error && error.code !== '23505') return new Response('Storage error', { status: 500 });
  return new Response(JSON.stringify({ received: true, duplicate: error?.code === '23505' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
