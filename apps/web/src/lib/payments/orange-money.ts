import { NotConfiguredError, type PaymentGateway } from './gateway';

/**
 * Squelette Orange Money — NON CONNECTÉ.
 * Aucun endpoint, schéma de requête ni clé n'est inventé. À implémenter uniquement à partir de
 * la documentation officielle fournie par l'opérateur après contractualisation.
 * Credentials attendus (variables d'environnement SERVEUR, jamais NEXT_PUBLIC_) : définis par l'opérateur.
 */
export class OrangeMoneyGateway implements PaymentGateway {
  readonly provider = 'orange_money' as const;
  readonly simulated = false;
  async collect(): Promise<never> { throw new NotConfiguredError('Orange Money'); }
  async disburse(): Promise<never> { throw new NotConfiguredError('Orange Money'); }
  async getStatus(): Promise<never> { throw new NotConfiguredError('Orange Money'); }
  async verifyWebhook(): Promise<never> { throw new NotConfiguredError('Orange Money'); }
}
