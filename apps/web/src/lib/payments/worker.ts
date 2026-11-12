import type { PaymentGateway, TxnStatus } from './gateway';
import { GatewayError } from './sas-pay';

/**
 * Worker de paiement (MODE TEST SAS Pay) — fait avancer la machine d'états décrite en base (migration 0013).
 * Principes : (1) on ne se fie JAMAIS au seul webhook : le statut est revérifié auprès du fournisseur ;
 * (2) tout appel qui déplace de l'argent porte la clé d'idempotence de la transaction (rejeu sûr) ;
 * (3) une erreur sur un élément n'arrête pas les autres ; (4) rien n'est fait hors mode « sandbox ».
 */
export interface GatewayCall { call_txn_id: string; call_kind: 'disburse'; call_amount: number; call_key: string; call_channel: string | null; call_msisdn: string | null; call_reference: string; call_country: string }
export interface WebhookRow { id: string; payload: { event: string; data: { id: string; type?: string } } }
export interface PendingTxn { id: string; provider_reference: string; type: string }

export interface WorkerStore {
  mode(country: string): Promise<string>;
  pendingWebhookEvents(limit: number): Promise<WebhookRow[]>;
  markWebhookEvent(id: string, status: 'processed' | 'ignored' | 'failed', error?: string): Promise<void>;
  pendingToVerify(limit: number): Promise<PendingTxn[]>;
  claimCalls(limit: number): Promise<GatewayCall[]>;
  recordResponse(txnId: string, ref: string, status: TxnStatus, checkoutUrl: string | null, raw: unknown): Promise<void>;
  recordFailure(txnId: string, code: string, message: string, retryable: boolean): Promise<void>;
  applyEvent(ref: string, status: TxnStatus, raw: unknown, reason: string | null): Promise<void>;
  expireStale(): Promise<number>;
}

export interface WorkerReport { webhooks: number; verified: number; payoutsSent: number; payoutsFailed: number; expired: number; errors: string[] }

const kindOf = (t: string | undefined): 'collect' | 'disburse' => (t === 'RETRAIT' || t === 'payout' || t === 'disbursement' ? 'disburse' : 'collect');
const msisdn = (p: string) => '+' + p.replace(/\D/g, '');

export async function runPaymentWorker(store: WorkerStore, gateway: PaymentGateway, country = 'BF'): Promise<WorkerReport> {
  const rep: WorkerReport = { webhooks: 0, verified: 0, payoutsSent: 0, payoutsFailed: 0, expired: 0, errors: [] };
  if ((await store.mode(country)) !== 'sandbox') { rep.errors.push('Mode test SAS Pay non activé pour ce pays : rien à faire.'); return rep; }
  const guard = async (label: string, fn: () => Promise<void>) => { try { await fn(); } catch (e) { rep.errors.push(`${label}: ${(e as Error).message}`); } };

  // 1. Webhooks reçus : revérification serveur puis application
  await guard('webhooks', async () => { for (const ev of await store.pendingWebhookEvents(50)) {
    await guard(`webhook ${ev.id}`, async () => {
      const res = await gateway.getStatus(ev.payload.data.id, kindOf(ev.payload.data.type));
      if (res.status === 'pending') return;                         // pas encore final : on réessaiera
      try {
        await store.applyEvent(ev.payload.data.id, res.status, res.raw, null);
        await store.markWebhookEvent(ev.id, 'processed');
        rep.webhooks++;
      } catch (e) {
        if (/NOT_FOUND/.test((e as Error).message)) await store.markWebhookEvent(ev.id, 'ignored', 'unknown_reference');
        else throw e;
      }
    });
  } });
  // 2. Transactions en attente : sondage (filet de sécurité si un webhook est perdu)
  await guard('verify', async () => { for (const t of await store.pendingToVerify(50)) {
    await guard(`verify ${t.id}`, async () => {
      const res = await gateway.getStatus(t.provider_reference, kindOf(t.type));
      await store.applyEvent(t.provider_reference, res.status, res.raw, null);
      if (res.status !== 'pending') rep.verified++;
    });
  } });
  // 3. Versements à émettre (emprunteur / prêteur) — même clé d'idempotence à chaque rejeu
  await guard('payouts', async () => { for (const c of await store.claimCalls(20)) {
    await guard(`payout ${c.call_txn_id}`, async () => {
      if (!c.call_msisdn) { await store.recordFailure(c.call_txn_id, 'no_msisdn', 'Bénéficiaire sans numéro', false); rep.payoutsFailed++; return; }
      try {
        const r = await gateway.disburse({ idempotencyKey: c.call_key, amount: c.call_amount, payeeMsisdn: msisdn(c.call_msisdn),
          channel: (c.call_channel ?? undefined) as 'orange_money' | 'moov_money' | undefined, country: c.call_country, reference: c.call_reference });
        await store.recordResponse(c.call_txn_id, r.providerReference, r.status, r.checkoutUrl ?? null, r.raw);
        rep.payoutsSent++;
      } catch (e) {
        if (e instanceof GatewayError) {
          await store.recordFailure(c.call_txn_id, e.code, e.message, e.retryWithSameKey);
          if (!e.retryWithSameKey) rep.payoutsFailed++;
        } else throw e;
      }
    });
  } });
  // 4. Collectes abandonnées
  await guard('expire', async () => { rep.expired = await store.expireStale(); });
  return rep;
}
