import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkerStore } from './worker';

/** Implémentation du magasin du worker avec le client SERVICE_ROLE (jamais le client utilisateur). */
export function supabaseStore(db: SupabaseClient): WorkerStore {
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data;
  };
  return {
    async mode(country) { return (await rpc('get_payment_mode', { p_country: country })) as string; },
    async pendingWebhookEvents(limit) {
      const { data, error } = await db.from('payment_webhook_events').select('id,payload').eq('provider', 'sas_pay').eq('status', 'received').order('received_at').limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as never;
    },
    async markWebhookEvent(id, status, err) {
      const { error } = await db.from('payment_webhook_events').update({ status, error: err ?? null, processed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    async pendingToVerify(limit) {
      const since = new Date(Date.now() - 3 * 24 * 3600_000).toISOString();
      const recent = new Date(Date.now() - 2 * 60_000).toISOString();
      const { data, error } = await db.from('payment_transactions').select('id,provider_reference,type,last_verified_at')
        .eq('mode', 'sandbox').eq('status', 'pending').not('provider_reference', 'is', null).gt('created_at', since)
        .or(`last_verified_at.is.null,last_verified_at.lt.${recent}`).order('created_at').limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as never;
    },
    async claimCalls(limit) { return ((await rpc('claim_gateway_calls', { p_limit: limit })) ?? []) as never; },
    async recordResponse(txnId, ref, status, checkoutUrl, raw) {
      await rpc('record_gateway_response', { p_txn: txnId, p_provider_reference: ref, p_status: status, p_checkout_url: checkoutUrl, p_raw: raw ?? null });
    },
    async recordFailure(txnId, code, message, retryable) { await rpc('record_gateway_failure', { p_txn: txnId, p_code: code, p_message: message, p_retryable: retryable }); },
    async applyEvent(ref, status, raw, reason) { await rpc('apply_payment_event', { p_provider_reference: ref, p_status: status, p_raw: raw ?? null, p_reason: reason }); },
    async expireStale() { return Number((await rpc('expire_stale_collections', {})) ?? 0); },
  };
}
