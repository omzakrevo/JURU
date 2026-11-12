import { describe, expect, it, vi } from 'vitest';
import type { GatewayResult, PaymentGateway } from './gateway';
import { GatewayError } from './sas-pay';
import { runPaymentWorker, type WorkerStore, type GatewayCall } from './worker';
import { initiateCollection, type BeginResult, type CollectDeps } from './collect';

const res = (status: GatewayResult['status'], ref = 'r'): GatewayResult => ({ provider: 'sas_pay', simulated: false, providerReference: ref, status });
function fakeGateway(over: Partial<PaymentGateway> = {}): PaymentGateway {
  return { provider: 'sas_pay', simulated: false, collect: vi.fn(async () => res('pending', 'c1')), disburse: vi.fn(async () => res('pending', 'p1')),
    getStatus: vi.fn(async (ref: string) => res('succeeded', ref)), verifyWebhook: vi.fn(), ...over } as unknown as PaymentGateway;
}
const call = (o: Partial<GatewayCall> = {}): GatewayCall => ({ call_txn_id: 't1', call_kind: 'disburse', call_amount: 78400, call_key: 'disb-pay-1', call_channel: 'orange_money', call_msisdn: '+22600000011', call_reference: 'x', call_country: 'BF', ...o });
function fakeStore(over: Partial<WorkerStore> = {}): WorkerStore & Record<string, ReturnType<typeof vi.fn>> {
  const s = { mode: vi.fn(async () => 'sandbox'), pendingWebhookEvents: vi.fn(async () => []), markWebhookEvent: vi.fn(async () => {}), pendingToVerify: vi.fn(async () => []),
    claimCalls: vi.fn(async () => []), recordResponse: vi.fn(async () => {}), recordFailure: vi.fn(async () => {}), applyEvent: vi.fn(async () => {}), expireStale: vi.fn(async () => 0), ...over };
  return s as never;
}

describe('worker de paiement (mode test)', () => {
  it('ne fait RIEN hors mode sandbox', async () => {
    const g = fakeGateway(); const s = fakeStore({ mode: vi.fn(async () => 'simulation') });
    const r = await runPaymentWorker(s, g);
    expect(r.errors[0]).toMatch(/non activé/);
    expect(g.disburse).not.toHaveBeenCalled(); expect(s.claimCalls).not.toHaveBeenCalled();
  });
  it('webhook : le statut est REVÉRIFIÉ auprès du fournisseur, jamais pris tel quel', async () => {
    const g = fakeGateway({ getStatus: vi.fn(async () => res('failed', 'ext-1')) });
    const s = fakeStore({ pendingWebhookEvents: vi.fn(async () => [{ id: 'e1', payload: { event: 'transaction.success', data: { id: 'ext-1', type: 'PAIEMENT' } } }]) });
    await runPaymentWorker(s, g);
    expect(g.getStatus).toHaveBeenCalledWith('ext-1', 'collect');
    expect(s.applyEvent).toHaveBeenCalledWith('ext-1', 'failed', undefined, null);   // le webhook disait « success », la vérification dit « failed »
    expect(s.markWebhookEvent).toHaveBeenCalledWith('e1', 'processed');
  });
  it('webhook : statut encore pending → laissé en file ; référence inconnue → ignoré', async () => {
    const ev = [{ id: 'e1', payload: { event: 'transaction.created', data: { id: 'a', type: 'RETRAIT' } } }, { id: 'e2', payload: { event: 'transaction.success', data: { id: 'b' } } }];
    const g = fakeGateway({ getStatus: vi.fn(async (ref: string) => res(ref === 'a' ? 'pending' : 'succeeded', ref)) });
    const s = fakeStore({ pendingWebhookEvents: vi.fn(async () => ev), applyEvent: vi.fn(async () => { throw new Error('NOT_FOUND: inconnue'); }) });
    await runPaymentWorker(s, g);
    expect(g.getStatus).toHaveBeenCalledWith('a', 'disburse');
    expect(s.markWebhookEvent).not.toHaveBeenCalledWith('e1', expect.anything());
    expect(s.markWebhookEvent).toHaveBeenCalledWith('e2', 'ignored', 'unknown_reference');
  });
  it('versements : appelle disburse avec la clé d’idempotence de la transaction et enregistre la réponse', async () => {
    const g = fakeGateway(); const s = fakeStore({ claimCalls: vi.fn(async () => [call()]) });
    const r = await runPaymentWorker(s, g);
    expect(g.disburse).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'disb-pay-1', amount: 78400, payeeMsisdn: '+22600000011', channel: 'orange_money', country: 'BF' }));
    expect(s.recordResponse).toHaveBeenCalledWith('t1', 'p1', 'pending', null, undefined);
    expect(r.payoutsSent).toBe(1);
  });
  it('versements : coupure réseau → rejouable (même clé) ; erreur métier → définitive ; un échec n’arrête pas les autres', async () => {
    const calls = [call({ call_txn_id: 'a', call_key: 'ka' }), call({ call_txn_id: 'b', call_key: 'kb' }), call({ call_txn_id: 'c', call_key: 'kc', call_msisdn: null })];
    const disburse = vi.fn()
      .mockRejectedValueOnce(new GatewayError('timeout', 'network', undefined, true))
      .mockRejectedValueOnce(new GatewayError('Solde insuffisant', 'insufficient_balance', 422, false));
    const s = fakeStore({ claimCalls: vi.fn(async () => calls) });
    const r = await runPaymentWorker(s, fakeGateway({ disburse }));
    expect(s.recordFailure).toHaveBeenNthCalledWith(1, 'a', 'network', 'timeout', true);
    expect(s.recordFailure).toHaveBeenNthCalledWith(2, 'b', 'insufficient_balance', 'Solde insuffisant', false);
    expect(s.recordFailure).toHaveBeenNthCalledWith(3, 'c', 'no_msisdn', expect.any(String), false);
    expect(r.payoutsFailed).toBe(2);
  });
  it('sondage : transactions pending revérifiées (filet si un webhook est perdu)', async () => {
    const s = fakeStore({ pendingToVerify: vi.fn(async () => [{ id: 't', provider_reference: 'ref', type: 'disbursement' }]) });
    const g = fakeGateway();
    const r = await runPaymentWorker(s, g);
    expect(g.getStatus).toHaveBeenCalledWith('ref', 'disburse');
    expect(s.applyEvent).toHaveBeenCalledWith('ref', 'succeeded', undefined, null);
    expect(r.verified).toBe(1);
  });
  it('une erreur isolée est rapportée sans interrompre le worker', async () => {
    const s = fakeStore({ pendingToVerify: vi.fn(async () => { throw new Error('db down'); }), expireStale: vi.fn(async () => 2) });
    const r = await runPaymentWorker(s, fakeGateway());
    expect(r.expired).toBe(2);
  });
});

describe('initiateCollection (action utilisateur)', () => {
  const begin: BeginResult = { txn_id: 'tx', idempotency_key: 'disb-col-1', amount: 80000, channel: 'orange_money', payer_phone: '22600000013', reference: 'disbursement_collect:1', status: 'initiated', provider_reference: null, checkout_url: null };
  const customer = { email: 'a@b.co', firstName: 'Fatimata', lastName: 'Test' };
  const mk = (gateway: PaymentGateway, b = begin): CollectDeps & { record: ReturnType<typeof vi.fn>; fail: ReturnType<typeof vi.fn> } =>
    ({ begin: vi.fn(async () => b), record: vi.fn(async () => {}), fail: vi.fn(async () => {}), gateway }) as never;

  it('crée la collecte avec la clé de la transaction, redirige vers checkout_url si fournie', async () => {
    const g = fakeGateway({ collect: vi.fn(async () => ({ ...res('pending', 'sas-1'), checkoutUrl: 'https://pay.example/c' })) });
    const d = mk(g);
    const out = await initiateCollection(d, { purpose: 'disbursement', refId: 'd1', channel: 'orange_money', otp: '1234', returnUrl: 'https://juru/ok', customer });
    expect(g.collect).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'disb-col-1', amount: 80000, payerMsisdn: '+22600000013', otp: '1234' }));
    expect(d.record).toHaveBeenCalledWith('tx', 'sas-1', 'pending', 'https://pay.example/c', undefined);
    expect(out).toEqual({ ok: true, pending: true, checkoutUrl: 'https://pay.example/c' });
  });
  it('rejeu : si déjà soumise, ne rappelle PAS le fournisseur (pas de double débit)', async () => {
    const g = fakeGateway(); const d = mk(g, { ...begin, provider_reference: 'sas-1', status: 'pending', checkout_url: 'https://pay.example/c' });
    const out = await initiateCollection(d, { purpose: 'disbursement', refId: 'd1', channel: 'orange_money', customer });
    expect(g.collect).not.toHaveBeenCalled();
    expect(out.checkoutUrl).toBe('https://pay.example/c');
  });
  it('erreur métier (OTP manquant) → échec enregistré, message clair ; coupure → rejouable sans échec enregistré', async () => {
    const g1 = fakeGateway({ collect: vi.fn(async () => { throw new GatewayError('x', 'prepayment_otp_missing', 422); }) });
    const d1 = mk(g1);
    const o1 = await initiateCollection(d1, { purpose: 'repayment', refId: 'i1', channel: 'orange_money', customer });
    expect(o1.ok).toBe(false); expect(o1.message).toMatch(/OTP/); expect(d1.fail).toHaveBeenCalledWith('tx', 'prepayment_otp_missing', 'x', false);
    const g2 = fakeGateway({ collect: vi.fn(async () => { throw new GatewayError('timeout', 'network', undefined, true); }) });
    const d2 = mk(g2);
    const o2 = await initiateCollection(d2, { purpose: 'repayment', refId: 'i1', channel: 'orange_money', customer });
    expect(o2.ok).toBe(false); expect(d2.fail).not.toHaveBeenCalled();
  });
});
