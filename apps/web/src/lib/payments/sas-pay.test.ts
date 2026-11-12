import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { GatewayError, SasPayGateway, mapStatus } from './sas-pay';
import { NotConfiguredError } from './gateway';

const ok = (body: unknown, status = 201) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const mk = (fetchImpl: typeof fetch, extra = {}) => new SasPayGateway({ apiKey: 'sk_test_abc', webhookSecret: 'whsec', fetchImpl, nowSeconds: () => 1_800_000_000, ...extra });
const customer = { email: 'a@b.co', firstName: 'Awa', lastName: 'Test' };

describe('SasPayGateway — requêtes (conformes à https://docs.saspay.me)', () => {
  it('collect : Orange BF, clé Bearer, Idempotency-Key, montant décimal, checkout_url', async () => {
    const f = vi.fn(async () => ok({ message: 'ok', id: '9c3f2a10-4b7e-4f1a-9d2e-9b6a7c1e4a02', status: 'PENDING', checkout_url: 'https://pay.example/x' }));
    const r = await mk(f as unknown as typeof fetch).collect({ idempotencyKey: 'k-1', amount: 25000, payerMsisdn: '+22670123456', reference: 'loan:1', channel: 'orange_money', customer, otp: '1234', returnUrl: 'https://juru.example/ok' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.saspay.me/api/v1/payments/softpay/');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk_test_abc');
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('k-1');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ amount: '25000.00', currency: 'XOF', country: 'BF', network: 'orange_bf', otp: '1234', return_url: 'https://juru.example/ok' });
    expect(body.customer).toEqual({ email: 'a@b.co', first_name: 'Awa', last_name: 'Test', phone: '+22670123456' });
    expect(r).toMatchObject({ status: 'pending', checkoutUrl: 'https://pay.example/x', simulated: false, provider: 'sas_pay' });
  });
  it('disburse : Moov BF → /payouts/initialize/ avec method + recipient', async () => {
    const f = vi.fn(async () => ok({ message: 'ok', id: 'a4b5c6d7-e8f9-4a0b-8c1d-2e3f4a5b6c7d' }));
    const r = await mk(f as unknown as typeof fetch).disburse({ idempotencyKey: 'k-2', amount: 147000, payeeMsisdn: '22660123456', reference: 'loan:1', channel: 'moov_money' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/payouts\/initialize\/$/);
    expect(JSON.parse(init.body as string)).toMatchObject({ amount: '147000.00', method: 'moov_bf', recipient: { msisdn: '22660123456' }, country: 'BF' });
    expect(r.status).toBe('pending');
  });
  it('refuse sans Idempotency-Key, montant non entier, canal inconnu, pays non supporté', async () => {
    const g = mk(vi.fn() as unknown as typeof fetch);
    await expect(g.collect({ idempotencyKey: '', amount: 1000, payerMsisdn: '+226', reference: 'r', channel: 'orange_money', customer })).rejects.toMatchObject({ code: 'idempotency_required' });
    await expect(g.collect({ idempotencyKey: 'k', amount: 10.5, payerMsisdn: '+226', reference: 'r', channel: 'orange_money', customer })).rejects.toMatchObject({ code: 'invalid_amount' });
    await expect(g.collect({ idempotencyKey: 'k', amount: 1000, payerMsisdn: '+226', reference: 'r', customer })).rejects.toMatchObject({ code: 'unsupported_network' });
    await expect(g.disburse({ idempotencyKey: 'k', amount: 1000, payeeMsisdn: '1', reference: 'r', channel: 'orange_money', country: 'CI' })).rejects.toMatchObject({ code: 'unsupported_network' });
  });
  it('erreurs API : code métier conservé ; 5xx et coupure ⇒ rejouer avec la même clé', async () => {
    const e422 = vi.fn(async () => ok({ success: false, error: { message: 'Solde disponible insuffisant.', code: 'insufficient_balance' }, code: 422 }, 422));
    await expect(mk(e422 as unknown as typeof fetch).disburse({ idempotencyKey: 'k', amount: 1000, payeeMsisdn: '1', reference: 'r', channel: 'orange_money' }))
      .rejects.toMatchObject({ code: 'insufficient_balance', httpStatus: 422, retryWithSameKey: false });
    const e500 = vi.fn(async () => ok({}, 503));
    await expect(mk(e500 as unknown as typeof fetch).getStatus('9c3f2a10-4b7e-4f1a-9d2e-9b6a7c1e4a02')).rejects.toMatchObject({ retryWithSameKey: true });
    const net = vi.fn(async () => { throw new Error('ECONNRESET'); });
    const err = await mk(net as unknown as typeof fetch).collect({ idempotencyKey: 'k', amount: 1000, payerMsisdn: '1', reference: 'r', channel: 'orange_money', customer }).catch((e) => e);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err).toMatchObject({ code: 'network', retryWithSameKey: true });
  });
  it('getStatus : endpoint selon le sens ; refuse un identifiant non UUID (anti-injection de chemin)', async () => {
    const f = vi.fn(async () => ok({ id: 'x', status: 'SUCCESS' }, 200));
    const g = mk(f as unknown as typeof fetch);
    const id = '9c3f2a10-4b7e-4f1a-9d2e-9b6a7c1e4a02';
    expect((await g.getStatus(id)).status).toBe('succeeded');
    await g.getStatus(id, 'disburse');
    expect((f.mock.calls[0] as unknown as [string])[0]).toMatch(/\/payments\/.+\/verify\/$/);
    expect((f.mock.calls[1] as unknown as [string])[0]).toMatch(/\/payouts\/.+\/verify\/$/);
    await expect(g.getStatus('../wallet')).rejects.toMatchObject({ code: 'invalid_reference' });
  });
  it('statuts : jamais de succès par défaut', () => {
    expect(['SUCCESS', 'FAILED', 'CANCELLED', 'PENDING', 'WHATEVER', undefined].map(mapStatus)).toEqual(['succeeded', 'failed', 'cancelled', 'pending', 'pending', 'pending']);
  });
});

describe('SasPayGateway — garde-fous', () => {
  it('sans clé / clé invalide / clé live non autorisée', () => {
    const prev = process.env.SASPAY_API_KEY; delete process.env.SASPAY_API_KEY;
    expect(() => new SasPayGateway({})).toThrow(NotConfiguredError);
    expect(() => new SasPayGateway({ apiKey: 'pk_123' })).toThrow(/invalide/);
    expect(() => new SasPayGateway({ apiKey: 'sk_live_xxx' })).toThrow(/refusée/);
    expect(() => new SasPayGateway({ apiKey: 'sk_live_xxx', allowLive: true })).not.toThrow();
    if (prev) process.env.SASPAY_API_KEY = prev;
  });
});

describe('SasPayGateway — webhook (HMAC(timestamp.corps), tolérance 5 min)', () => {
  const body = JSON.stringify({ event: 'transaction.success', data: { id: '7c1a0000-0000-4000-8000-000000000001', status: 'SUCCESS', amount: '25000.00', fee: '625.00', charged: '25625.00', net_amount: '25000.00' } });
  const sign = (ts: string, b = body, secret = 'whsec') => createHmac('sha256', secret).update(`${ts}.${b}`).digest('hex');
  const g = mk(vi.fn() as unknown as typeof fetch);
  const ts = '1800000000';
  it('accepte un webhook valide et construit la clé d’idempotence event:id', async () => {
    const ev = await g.verifyWebhook(body, { 'x-webhook-signature': sign(ts), 'x-webhook-timestamp': ts });
    expect(ev).toMatchObject({ eventId: 'transaction.success:7c1a0000-0000-4000-8000-000000000001', status: 'succeeded', amount: 25000 });
  });
  it('rejette : mauvaise signature, corps modifié, mauvais secret, horodatage trop ancien, en-têtes absents, événement non pris en charge', async () => {
    await expect(g.verifyWebhook(body, { 'x-webhook-signature': 'deadbeef', 'x-webhook-timestamp': ts })).rejects.toMatchObject({ code: 'webhook_signature' });
    await expect(g.verifyWebhook(body + ' ', { 'x-webhook-signature': sign(ts), 'x-webhook-timestamp': ts })).rejects.toMatchObject({ code: 'webhook_signature' });
    await expect(g.verifyWebhook(body, { 'x-webhook-signature': sign(ts, body, 'autre'), 'x-webhook-timestamp': ts })).rejects.toMatchObject({ code: 'webhook_signature' });
    const old = '1799999000'; // 1000 s plus tôt > 300 s
    await expect(g.verifyWebhook(body, { 'x-webhook-signature': sign(old), 'x-webhook-timestamp': old })).rejects.toMatchObject({ code: 'webhook_stale' });
    await expect(g.verifyWebhook(body, {})).rejects.toMatchObject({ code: 'webhook_headers' });
    const other = JSON.stringify({ event: 'wallet_transfer.completed', data: { id: 'x' } });
    await expect(g.verifyWebhook(other, { 'x-webhook-signature': sign(ts, other), 'x-webhook-timestamp': ts })).rejects.toMatchObject({ code: 'webhook_unsupported' });
  });
});
