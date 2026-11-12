/**
 * Vérification des webhooks SAS Pay (doc : https://docs.saspay.me/api-reference/webhooks).
 *   En-têtes : X-Webhook-Signature, X-Webhook-Timestamp, X-Webhook-Event
 *   Signature : HMAC-SHA256 hex de  `${timestamp}.${corpsBrut}`  avec le signing_secret du webhook (affiché une seule fois).
 *   Contrôles : âge ≤ 5 min ET signature (temps constant) sur le corps BRUT.
 *   Enveloppe : { event, data } ; PAS d'identifiant d'événement propre → clé d'idempotence = `${event}:${data.id}`.
 * Web Crypto uniquement (Deno et Node ≥ 20).
 */
import { hmacHex, safeEqual } from './hmac.ts';

export const TOLERANCE_SECONDS = 300;

export type SasPayVerifyResult =
  | { ok: true; event: string; data: Record<string, unknown>; eventKey: string }
  | { ok: false; reason: 'missing_headers' | 'stale_timestamp' | 'bad_signature' | 'bad_json' | 'bad_payload' };

export async function verifySasPayWebhook(
  rawBody: string, headers: { get(name: string): string | null }, secret: string, nowSeconds = Math.floor(Date.now() / 1000),
): Promise<SasPayVerifyResult> {
  const signature = (headers.get('x-webhook-signature') ?? '').toLowerCase();
  const timestamp = headers.get('x-webhook-timestamp') ?? '';
  if (!signature || !/^\d{9,12}$/.test(timestamp)) return { ok: false, reason: 'missing_headers' };
  if (Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) return { ok: false, reason: 'stale_timestamp' };
  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  if (!safeEqual(signature, expected)) return { ok: false, reason: 'bad_signature' };
  let payload: { event?: unknown; data?: unknown };
  try { payload = JSON.parse(rawBody); } catch { return { ok: false, reason: 'bad_json' }; }
  const data = payload.data as Record<string, unknown> | undefined;
  if (typeof payload.event !== 'string' || !data || typeof data !== 'object' || typeof data.id !== 'string')
    return { ok: false, reason: 'bad_payload' };
  return { ok: true, event: payload.event, data, eventKey: `${payload.event}:${data.id}` };
}
