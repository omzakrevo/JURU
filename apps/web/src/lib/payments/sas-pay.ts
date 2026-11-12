import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  type CollectRequest, type DisburseRequest, type GatewayResult, type MobileMoneyChannel, NotConfiguredError,
  type PaymentGateway, type TxnStatus, type WebhookEvent,
} from './gateway';

/**
 * Adaptateur SAS Pay — https://docs.saspay.me (API REST, base https://api.saspay.me/api/v1).
 *  - Auth : Authorization: Bearer sk_test_… | sk_live_…  (SERVEUR uniquement)
 *  - Encaissement (dépôt)  : POST /payments/softpay/       → { id, status, checkout_url }  (checkout_url ≠ vide ⇒ rediriger le client)
 *  - Retrait (décaissement): POST /payouts/initialize/     → { id }   ⚠ IP du serveur à whitelister dans le tableau de bord SAS Pay
 *  - Vérification serveur  : GET  /payments/{id}/verify/ , GET /payouts/{id}/verify/   (jamais se fier à un webhook seul)
 *  - Idempotence           : en-tête Idempotency-Key, TOUJOURS envoyé ici (un retry sans clé = second débit réel)
 *  - Webhook               : X-Webhook-Signature = HMAC-SHA256(`${X-Webhook-Timestamp}.${corps brut}`), âge ≤ 5 min
 * Réseaux Burkina Faso : orange_bf, moov_bf (XOF). Orange BF peut exiger un OTP USSD pré-paiement (champ `otp`).
 */
export const SASPAY_BASE_URL = 'https://api.saspay.me/api/v1';
const NETWORKS: Record<string, Record<MobileMoneyChannel, string>> = {
  BF: { orange_money: 'orange_bf', moov_money: 'moov_bf' },
};
export const WEBHOOK_TOLERANCE_SECONDS = 300;

export class GatewayError extends Error {
  constructor(message: string, public code: string, public httpStatus?: number, public retryWithSameKey = false) {
    super(message);
    this.name = 'GatewayError';
  }
}

export interface SasPayConfig {
  apiKey: string;
  webhookSecret?: string;
  baseUrl?: string;
  /** Autorise une clé sk_live_ — à ne passer à true QUE lorsque les paiements réels sont officiellement activés. */
  allowLive?: boolean;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  nowSeconds?: () => number;
}

const toDecimal = (n: number) => {
  if (!Number.isInteger(n) || n <= 0) throw new GatewayError('Montant invalide (entier FCFA > 0 requis)', 'invalid_amount');
  return `${n}.00`;
};

export function mapStatus(s: unknown): TxnStatus {
  switch (String(s ?? '').toUpperCase()) {
    case 'SUCCESS': return 'succeeded';
    case 'FAILED': return 'failed';
    case 'CANCELLED': return 'cancelled';
    default: return 'pending'; // PENDING et tout statut inconnu : on reste prudent (jamais de succès par défaut)
  }
}

export class SasPayGateway implements PaymentGateway {
  readonly provider = 'sas_pay' as const;
  readonly simulated = false;
  private readonly cfg: Required<Pick<SasPayConfig, 'baseUrl' | 'timeoutMs'>> & SasPayConfig;

  constructor(cfg: Partial<SasPayConfig> = {}) {
    const apiKey = cfg.apiKey ?? process.env.SASPAY_API_KEY ?? '';
    if (!apiKey) throw new NotConfiguredError('SAS Pay (SASPAY_API_KEY manquante)');
    if (!/^sk_(test|live)_/.test(apiKey)) throw new GatewayError('Clé SAS Pay invalide (attendu sk_test_… ou sk_live_…)', 'invalid_key');
    if (apiKey.startsWith('sk_live_') && !cfg.allowLive)
      throw new GatewayError('Clé sk_live_ refusée : les paiements réels ne sont pas activés', 'live_not_allowed');
    this.cfg = { ...cfg, apiKey, baseUrl: cfg.baseUrl ?? process.env.SASPAY_BASE_URL ?? SASPAY_BASE_URL, timeoutMs: cfg.timeoutMs ?? 15000,
      webhookSecret: cfg.webhookSecret ?? process.env.WEBHOOK_SECRET_SAS_PAY };
  }

  private network(channel: MobileMoneyChannel | undefined, country: string): string {
    const n = channel && NETWORKS[country]?.[channel];
    if (!n) throw new GatewayError(`Canal ${channel ?? '(absent)'} non supporté pour ${country}`, 'unsupported_network');
    return n;
  }

  private async call(method: 'GET' | 'POST', path: string, body?: unknown, idempotencyKey?: string): Promise<Record<string, any>> {
    const f = this.cfg.fetchImpl ?? fetch;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.cfg.timeoutMs);
    try {
      const res = await f(this.cfg.baseUrl + path, {
        method, signal: ctl.signal,
        headers: { Authorization: `Bearer ${this.cfg.apiKey}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, any>;
      if (!res.ok) {
        const e = json.error ?? json;
        const code = typeof e?.code === 'string' ? e.code : `http_${res.status}`;
        throw new GatewayError(String(e?.message ?? `SAS Pay HTTP ${res.status}`), code, res.status, res.status >= 500);
      }
      return (json.data ?? json) as Record<string, any>; // enveloppe { success, data } ou corps direct selon l'endpoint
    } catch (e) {
      if (e instanceof GatewayError) throw e;
      // Timeout / coupure : l'opération a PEUT-ÊTRE abouti → rejouer avec la MÊME clé d'idempotence, jamais avec une nouvelle.
      throw new GatewayError('SAS Pay injoignable ou délai dépassé : rejouer avec la même Idempotency-Key', 'network', undefined, true);
    } finally {
      clearTimeout(timer);
    }
  }

  async collect(req: CollectRequest): Promise<GatewayResult> {
    if (!req.idempotencyKey) throw new GatewayError('Idempotency-Key obligatoire', 'idempotency_required');
    const country = req.country ?? 'BF';
    const c = req.customer;
    if (!c) throw new GatewayError('Informations client requises (e-mail, prénom, nom)', 'customer_required');
    const d = await this.call('POST', '/payments/softpay/', {
      amount: toDecimal(req.amount), currency: 'XOF', country, description: req.description ?? req.reference,
      customer: { email: c.email, first_name: c.firstName, last_name: c.lastName, phone: req.payerMsisdn },
      network: this.network(req.channel, country), metadata: { reference: req.reference },
      ...(req.otp ? { otp: req.otp } : {}), ...(req.returnUrl ? { return_url: req.returnUrl } : {}),
    }, req.idempotencyKey);
    return { provider: 'sas_pay', simulated: false, providerReference: String(d.id), status: mapStatus(d.status ?? 'PENDING'),
      checkoutUrl: d.checkout_url ? String(d.checkout_url) : undefined, raw: d };
  }

  async disburse(req: DisburseRequest): Promise<GatewayResult> {
    if (!req.idempotencyKey) throw new GatewayError('Idempotency-Key obligatoire', 'idempotency_required');
    const country = req.country ?? 'BF';
    const d = await this.call('POST', '/payouts/initialize/', {
      amount: toDecimal(req.amount), currency: 'XOF', country, description: req.description ?? req.reference,
      customer: { phone: req.payeeMsisdn }, method: this.network(req.channel, country),
      recipient: { msisdn: req.payeeMsisdn }, metadata: { reference: req.reference },
    }, req.idempotencyKey);
    return { provider: 'sas_pay', simulated: false, providerReference: String(d.id), status: mapStatus(d.status ?? 'PENDING'), raw: d };
  }

  /** Vérification SERVEUR : SAS Pay revérifie l'état réel auprès du gateway quand la transaction est PENDING. */
  async getStatus(providerReference: string, kind: 'collect' | 'disburse' = 'collect'): Promise<GatewayResult> {
    if (!/^[0-9a-f-]{36}$/i.test(providerReference)) throw new GatewayError('Identifiant de transaction invalide', 'invalid_reference');
    const path = kind === 'collect' ? `/payments/${providerReference}/verify/` : `/payouts/${providerReference}/verify/`;
    const d = await this.call('GET', path);
    return { provider: 'sas_pay', simulated: false, providerReference, status: mapStatus(d.status), raw: d };
  }

  async verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent> {
    const secret = this.cfg.webhookSecret;
    if (!secret) throw new NotConfiguredError('SAS Pay (secret de webhook manquant)');
    const h = (k: string) => headers[k] ?? headers[k.toLowerCase()] ?? '';
    const sig = h('x-webhook-signature').toLowerCase();
    const ts = h('x-webhook-timestamp');
    const now = (this.cfg.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();
    if (!sig || !/^\d{9,12}$/.test(ts)) throw new GatewayError('En-têtes de webhook manquants', 'webhook_headers');
    if (Math.abs(now - Number(ts)) > WEBHOOK_TOLERANCE_SECONDS) throw new GatewayError('Webhook trop ancien (rejeu possible)', 'webhook_stale');
    const expected = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new GatewayError('Signature webhook invalide', 'webhook_signature');
    const p = JSON.parse(rawBody) as { event: string; data: Record<string, any> };
    if (!p.event?.startsWith('transaction.') || typeof p.data?.id !== 'string')
      throw new GatewayError('Événement non pris en charge', 'webhook_unsupported');
    return { provider: 'sas_pay', eventId: `${p.event}:${p.data.id}`, providerReference: p.data.id,
      status: mapStatus(p.data.status), amount: Math.round(Number(p.data.amount)), raw: p };
  }
}
