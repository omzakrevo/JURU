/**
 * PaymentGateway — abstraction des fournisseurs de paiement.
 *
 * AUCUNE API réelle n'est branchée. Orange Money et Moov Money ne seront implémentés qu'après :
 *  1) contractualisation avec l'opérateur / un partenaire agréé,
 *  2) obtention de la documentation officielle et des identifiants (stockés côté serveur uniquement),
 *  3) validation juridique et réglementaire (BCEAO / autorité nationale).
 * D'ici là, seul `SimulationGateway` est actif et toute écriture est marquée « MODE DÉMONSTRATION ».
 */
export type Provider = 'simulation' | 'orange_money' | 'moov_money';

export interface CollectRequest {
  idempotencyKey: string;      // obligatoire : empêche les doubles paiements
  amount: number;              // FCFA entiers
  payerMsisdn: string;         // E.164
  reference: string;           // ex. loan:<id>:installment:<n>
  callbackUrl?: string;
}
export interface DisburseRequest {
  idempotencyKey: string;
  amount: number;
  payeeMsisdn: string;
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
