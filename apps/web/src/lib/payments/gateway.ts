/**
 * PaymentGateway — abstraction des fournisseurs de paiement.
 *
 * Fournisseur retenu : SAS Pay (agrégateur Orange Money / Moov Money : dépôt = collect, retrait = disburse).
 * Son adaptateur (`SasPayGateway`) n'est PAS encore implémenté : aucune requête n'est émise tant que :
 *  1) la documentation officielle SAS Pay (endpoints, authentification, signature des webhooks) n'est pas intégrée,
 *  2) les identifiants sont fournis (variables d'environnement SERVEUR uniquement),
 *  3) la validation juridique et réglementaire est faite (BCEAO / autorité nationale) et `payments_live_enabled` activé.
 * D'ici là, seul `SimulationGateway` est actif et toute écriture est marquée « MODE DÉMONSTRATION ».
 */
export type Provider = 'simulation' | 'sas_pay';
/** Canal Mobile Money acheminé par l'agrégateur. */
export type MobileMoneyChannel = 'orange_money' | 'moov_money';

export interface CollectRequest {
  idempotencyKey: string;      // obligatoire : empêche les doubles paiements
  amount: number;              // FCFA entiers
  payerMsisdn: string;         // E.164
  channel?: MobileMoneyChannel; // Orange Money / Moov Money (via l'agrégateur)
  reference: string;           // ex. loan:<id>:installment:<n>
  callbackUrl?: string;
}
export interface DisburseRequest {
  idempotencyKey: string;
  amount: number;
  payeeMsisdn: string;
  channel?: MobileMoneyChannel;
  reference: string;
}
export type TxnStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled';
export interface GatewayResult {
  provider: Provider;
  providerReference: string;
  status: TxnStatus;
  simulated: boolean;
  raw?: unknown;
}
export interface WebhookEvent {
  provider: Provider;
  eventId: string;             // unicité (provider,eventId) = idempotence en base
  providerReference: string;
  status: TxnStatus;
  amount: number;
  raw: unknown;
}

export interface PaymentGateway {
  readonly provider: Provider;
  readonly simulated: boolean;
  collect(req: CollectRequest): Promise<GatewayResult>;
  disburse(req: DisburseRequest): Promise<GatewayResult>;
  /** Vérification serveur du statut auprès du fournisseur (ne jamais croire un webhook seul). */
  getStatus(providerReference: string): Promise<GatewayResult>;
  /** Vérifie la signature du webhook (HMAC, comparaison à temps constant) puis normalise l'événement. */
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent>;
}

export class NotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} : API non contractualisée / non configurée. Aucune requête réelle n'est émise.`);
    this.name = 'NotConfiguredError';
  }
}
