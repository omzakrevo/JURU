/**
 * PaymentGateway — abstraction des fournisseurs de paiement.
 *
 * Fournisseur retenu : SAS Pay (agrégateur Orange Money / Moov Money : dépôt = collect, retrait = disburse).
 * Adaptateur : `SasPayGateway` (d'après https://docs.saspay.me), IMPLÉMENTÉ mais INACTIF : la fabrique `getGateway`
 * ne le renvoie que si les paiements réels sont activés pour le pays (jamais avant validation juridique/réglementaire),
 * et une clé `sk_live_` exige en plus `allowLive` explicite. Identifiants : variables d'environnement SERVEUR uniquement.
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
  country?: string;            // ISO 2 lettres, défaut 'BF'
  description?: string;
  customer?: { email: string; firstName: string; lastName: string };
  /** OTP PRÉ-paiement exigé par Orange Money Burkina (le client compose un code USSD avant de payer). */
  otp?: string;
  returnUrl?: string;
  reference: string;           // ex. loan:<id>:installment:<n>
  callbackUrl?: string;
}
export interface DisburseRequest {
  idempotencyKey: string;
  amount: number;
  payeeMsisdn: string;
  channel?: MobileMoneyChannel;
  country?: string;
  description?: string;
  reference: string;
}
export type TxnStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled';
export interface GatewayResult {
  provider: Provider;
  providerReference: string;
  status: TxnStatus;
  simulated: boolean;
  /** Si renseignée, le client DOIT être redirigé vers cette page pour payer (aucun push téléphone). */
  checkoutUrl?: string;
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
  getStatus(providerReference: string, kind?: 'collect' | 'disburse'): Promise<GatewayResult>;
  /** Vérifie la signature du webhook (HMAC, comparaison à temps constant) puis normalise l'événement. */
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent>;
}

export class NotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} : API non contractualisée / non configurée. Aucune requête réelle n'est émise.`);
    this.name = 'NotConfiguredError';
  }
}
