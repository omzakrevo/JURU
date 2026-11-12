import { NotConfiguredError, type PaymentGateway } from './gateway';

/**
 * Adaptateur SAS Pay (Orange Money / Moov Money : dépôt, retrait) — SQUELETTE NON CONNECTÉ.
 *
 * Aucun endpoint, en-tête d'authentification, schéma de requête ou format de webhook n'est inventé.
 * À compléter à partir de la documentation officielle SAS Pay. Contraintes déjà imposées par l'architecture :
 *  - `idempotencyKey` obligatoire sur collect/disburse (à transmettre comme référence marchand unique) ;
 *  - webhook : vérifier la signature du corps BRUT avant tout traitement, stocker (provider, event_id) de façon idempotente,
 *    puis confirmer le statut via `getStatus` (vérification serveur) avant toute écriture comptable ;
 *  - identifiants uniquement en variables d'environnement serveur : SASPAY_BASE_URL, SASPAY_API_KEY (noms à confirmer
 *    d'après la doc), WEBHOOK_SECRET_SAS_PAY ; jamais préfixés NEXT_PUBLIC_.
 */
export class SasPayGateway implements PaymentGateway {
  readonly provider = 'sas_pay' as const;
  readonly simulated = false;
  async collect(): Promise<never> { throw new NotConfiguredError('SAS Pay'); }
  async disburse(): Promise<never> { throw new NotConfiguredError('SAS Pay'); }
  async getStatus(): Promise<never> { throw new NotConfiguredError('SAS Pay'); }
  async verifyWebhook(): Promise<never> { throw new NotConfiguredError('SAS Pay'); }
}
