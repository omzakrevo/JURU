import type { MobileMoneyChannel, PaymentGateway } from './gateway';
import { GatewayError } from './sas-pay';

/** Données renvoyées par la RPC begin_collection. */
export interface BeginResult {
  txn_id: string; idempotency_key: string; amount: number; channel: string; payer_phone: string; reference: string;
  status: string; provider_reference: string | null; checkout_url: string | null;
}
export interface CollectDeps {
  begin(purpose: 'disbursement' | 'repayment', ref: string, channel: MobileMoneyChannel): Promise<BeginResult>;
  record(txnId: string, ref: string, status: string, checkoutUrl: string | null, raw: unknown): Promise<void>;
  fail(txnId: string, code: string, message: string, retryable: boolean): Promise<void>;
  gateway: PaymentGateway;
}
export interface CollectOutcome { ok: boolean; message?: string; checkoutUrl?: string; pending?: boolean }

/**
 * Lance une collecte (dépôt) initiée par l'utilisateur : crée la transaction en base (begin), appelle SAS Pay avec
 * la clé d'idempotence de la transaction, puis enregistre la réponse. Un rejeu (double clic, coupure) ne crée jamais
 * un second débit : même transaction, même clé. Si la collecte a déjà été soumise, on ne rappelle pas le fournisseur.
 */
export async function initiateCollection(deps: CollectDeps, a: {
  purpose: 'disbursement' | 'repayment'; refId: string; channel: MobileMoneyChannel; otp?: string; returnUrl?: string;
  customer: { email: string; firstName: string; lastName: string };
}): Promise<CollectOutcome> {
  const b = await deps.begin(a.purpose, a.refId, a.channel);
  if (b.provider_reference) return { ok: true, pending: true, checkoutUrl: b.checkout_url ?? undefined, message: 'Paiement déjà initié.' };
  try {
    const r = await deps.gateway.collect({
      idempotencyKey: b.idempotency_key, amount: Number(b.amount), payerMsisdn: '+' + b.payer_phone.replace(/\D/g, ''),
      channel: b.channel as MobileMoneyChannel, customer: a.customer, otp: a.otp, returnUrl: a.returnUrl, reference: b.reference,
      description: a.purpose === 'disbursement' ? 'JURU — financement (mode test)' : 'JURU — remboursement (mode test)',
    });
    await deps.record(b.txn_id, r.providerReference, r.status, r.checkoutUrl ?? null, r.raw);
    return { ok: true, pending: r.status === 'pending', checkoutUrl: r.checkoutUrl };
  } catch (e) {
    if (e instanceof GatewayError) {
      if (e.retryWithSameKey) return { ok: false, message: 'Connexion au service de paiement interrompue. Réessayez : aucune somme n’a été débitée en double.' };
      await deps.fail(b.txn_id, e.code, e.message, false);
      return { ok: false, message: friendly(e) };
    }
    throw e;
  }
}

const friendly = (e: GatewayError) =>
  ({ prepayment_otp_missing: 'Orange Money exige un code de paiement (OTP) : saisissez-le puis réessayez.', invalid_customer: 'Informations du client invalides.',
     no_route_available: 'Aucun opérateur disponible pour ce paiement. Réessayez plus tard.', invalid_method: 'Moyen de paiement indisponible.' } as Record<string, string>)[e.code]
  ?? 'Le paiement a été refusé par le service de paiement.';
