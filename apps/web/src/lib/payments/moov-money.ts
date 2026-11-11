import { NotConfiguredError, type PaymentGateway } from './gateway';

/**
 * Squelette Moov Money — NON CONNECTÉ.
 * Aucun endpoint, schéma de requête ni clé n'est inventé. À implémenter uniquement à partir de
 * la documentation officielle fournie par l'opérateur après contractualisation.
 * Credentials attendus (variables d'environnement SERVEUR, jamais NEXT_PUBLIC_) : définis par l'opérateur.
 */
export class MoovMoneyGateway implements PaymentGateway {
  readonly provider = 'moov_money' as const;
  readonly simulated = false;
  async collect(): Promise<never> { throw new NotConfiguredError('Moov Money'); }
  async disburse(): Promise<never> { throw new NotConfiguredError('Moov Money'); }
  async getStatus(): Promise<never> { throw new NotConfiguredError('Moov Money'); }
  async verifyWebhook(): Promise<never> { throw new NotConfiguredError('Moov Money'); }
}
