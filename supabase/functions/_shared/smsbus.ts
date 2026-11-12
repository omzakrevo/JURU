/**
 * Adaptateur SMS Bus — SQUELETTE NON CONNECTÉ.
 * Aucun endpoint ni format de requête n'est inventé : à compléter d'après la documentation officielle SMS Bus.
 * Variables d'environnement SERVEUR (noms à confirmer d'après la doc) : SMSBUS_API_KEY, SMSBUS_SENDER_ID, SMSBUS_BASE_URL.
 * Contrat d'interface attendu par le reste du code : envoyer un texte à un numéro E.164, lever une erreur sinon.
 */
export class SmsNotConfiguredError extends Error {
  constructor() { super('SMSBUS_NOT_CONFIGURED'); }
}

export async function sendSms(phoneE164: string, text: string): Promise<void> {
  if (!Deno.env.get('SMSBUS_API_KEY')) throw new SmsNotConfiguredError();
  if (!/^\+\d{8,15}$/.test(phoneE164)) throw new Error('INVALID_PHONE');
  if (text.length === 0 || text.length > 480) throw new Error('INVALID_TEXT');
  // TODO(doc SMS Bus) : requête HTTP d'envoi + gestion des codes de réponse (succès / solde / numéro invalide).
  throw new Error('SMSBUS_API_NOT_IMPLEMENTED');
}
