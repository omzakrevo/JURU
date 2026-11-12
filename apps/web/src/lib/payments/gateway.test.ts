import { describe, expect, it } from 'vitest';
import { getGateway, NotConfiguredError } from './index';
import { SimulationGateway } from './simulation';

describe('PaymentGateway', () => {
  it('simulation : idempotente et marquée simulée', async () => {
    const g = new SimulationGateway();
    const a = await g.collect({ idempotencyKey: 'k1', amount: 5000, payerMsisdn: '+22600000001', reference: 'r' });
    const b = await g.collect({ idempotencyKey: 'k1', amount: 5000, payerMsisdn: '+22600000001', reference: 'r' });
    expect(a).toBe(b);
    expect(a.simulated).toBe(true);
    await expect(g.collect({ idempotencyKey: 'k2', amount: 0, payerMsisdn: '', reference: '' })).rejects.toThrow();
  });
  it('webhook : signature HMAC vérifiée', async () => {
    const g = new SimulationGateway('s');
    const body = JSON.stringify({ id: 'e1', reference: 'SIM-1', status: 'succeeded', amount: 1000 });
    const ev = await g.verifyWebhook(body, { 'x-signature': g.sign(body) });
    expect(ev.eventId).toBe('e1');
    await expect(g.verifyWebhook(body, { 'x-signature': 'deadbeef' })).rejects.toThrow('Signature');
    await expect(g.verifyWebhook(body + ' ', { 'x-signature': g.sign(body) })).rejects.toThrow('Signature');
  });
  it('SAS Pay : non connecté, aucune API inventée', async () => {
    const live = getGateway('sas_pay', true);
    await expect(live.collect({ idempotencyKey: 'x', amount: 1000, payerMsisdn: '+22600000001', reference: 'r' })).rejects.toBeInstanceOf(NotConfiguredError);
    expect(live.provider).toBe('sas_pay');
    expect(live.simulated).toBe(false);
  });
  it('paiements réels désactivés => toujours simulation', () => {
    expect(getGateway('sas_pay', false).simulated).toBe(true);
    expect(getGateway('sas_pay', false).provider).toBe('simulation');
  });
});
