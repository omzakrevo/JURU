import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CollectRequest, DisburseRequest, GatewayResult, PaymentGateway, WebhookEvent } from './gateway';

/** Passerelle de DÉMONSTRATION : aucun appel réseau, aucun argent réel. */
export class SimulationGateway implements PaymentGateway {
  readonly provider = 'simulation' as const;
  readonly simulated = true;
  private readonly seen = new Map<string, GatewayResult>();

  constructor(private readonly webhookSecret = 'demo-secret-not-for-production') {}

  private run(req: { idempotencyKey: string; amount: number }, kind: string): GatewayResult {
    const prior = this.seen.get(req.idempotencyKey);
    if (prior) return prior; // idempotence
    if (!Number.isInteger(req.amount) || req.amount <= 0) throw new Error('Montant invalide');
    const res: GatewayResult = {
      provider: 'simulation', simulated: true, status: 'succeeded',
      providerReference: `SIM-${kind}-${req.idempotencyKey}`, raw: { mode: 'MODE DÉMONSTRATION' },
    };
    this.seen.set(req.idempotencyKey, res);
    return res;
  }
  async collect(req: CollectRequest) { return this.run(req, 'COL'); }
  async disburse(req: DisburseRequest) { return this.run(req, 'DIS'); }
  async getStatus(providerReference: string): Promise<GatewayResult> {
    return { provider: 'simulation', simulated: true, status: 'succeeded', providerReference };
  }
  sign(body: string) { return createHmac('sha256', this.webhookSecret).update(body).digest('hex'); }
  async verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent> {
    const given = headers['x-signature'] ?? '';
    const expected = this.sign(rawBody);
    const a = Buffer.from(given, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Signature webhook invalide');
    const p = JSON.parse(rawBody) as { id: string; reference: string; status: WebhookEvent['status']; amount: number };
    return { provider: 'simulation', eventId: p.id, providerReference: p.reference, status: p.status, amount: p.amount, raw: p };
  }
}
