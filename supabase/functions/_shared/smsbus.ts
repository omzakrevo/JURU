/**
 * Client SMS Bus (lesmsbus.com) — d'après le script d'exemple fourni (sendSms.php) :
 *   POST {base}/smsbusMt   (application/x-www-form-urlencoded)  champs : from, id, text, to
 *   - from : expéditeur alphanumérique, 12 caractères maximum
 *   - id   : identifiant fourni par SMS Bus (traité comme un SECRET : variable d'environnement serveur)
 *   - to   : numéro(s) au format international SANS « + » (ex. 22670123456), séparés par des virgules
 *   - text : message
 * Le format de la réponse n'est PAS documenté dans l'exemple : on considère l'envoi accepté sur HTTP 2xx, et on
 * peut durcir avec SMSBUS_SUCCESS_REGEX (ex. si la doc précise un corps de succès). Ne jamais journaliser `id`.
 * Fichier sans API spécifique à Deno (testable sous Node) : l'environnement est passé en paramètre.
 */
export interface SmsConfig {
  baseUrl: string;
  id: string;
  from: string;
  successRegex?: RegExp;
  timeoutMs: number;
}

export class SmsNotConfiguredError extends Error {
  constructor(public missing: string[]) { super('SMSBUS_NOT_CONFIGURED: ' + missing.join(', ')); }
}
export class SmsSendError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

export const DEFAULT_SMSBUS_URL = 'https://www.lesmsbus.com:7170/ines.smsbus/smsbusMt';

/** Lit la configuration depuis l'environnement ; lève SmsNotConfiguredError si SMSBUS_ID manque. */
export function loadSmsConfig(get: (k: string) => string | undefined): SmsConfig {
  const id = get('SMSBUS_ID');
  if (!id) throw new SmsNotConfiguredError(['SMSBUS_ID']);
  const from = (get('SMSBUS_SENDER_ID') ?? 'JURU').trim();
  if (!/^[A-Za-z0-9]{1,12}$/.test(from)) throw new SmsSendError('SMSBUS_SENDER_ID invalide (alphanumérique, 12 caractères max)');
  const rx = get('SMSBUS_SUCCESS_REGEX');
  return { baseUrl: get('SMSBUS_URL') ?? DEFAULT_SMSBUS_URL, id, from, successRegex: rx ? new RegExp(rx) : undefined, timeoutMs: 8000 };
}

/** +22670123456 / 22670123456 / 0022670123456 → 22670123456 (format international sans +). */
export function toSmsBusNumber(phone: string): string {
  let d = phone.replace(/[^\d]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (!/^\d{8,15}$/.test(d)) throw new SmsSendError('Numéro invalide');
  return d;
}

export function buildSmsRequest(cfg: SmsConfig, phones: string | string[], text: string) {
  const to = (Array.isArray(phones) ? phones : [phones]).map(toSmsBusNumber).join(',');
  if (text.length === 0 || text.length > 480) throw new SmsSendError('Message vide ou trop long (480 caractères max)');
  const body = new URLSearchParams({ from: cfg.from, id: cfg.id, text, to }).toString();
  return { url: cfg.baseUrl, init: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body } };
}

export async function sendSms(cfg: SmsConfig, phones: string | string[], text: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const { url, init } = buildSmsRequest(cfg, phones, text);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: ctl.signal });
    const body = (await res.text()).slice(0, 300);
    if (!res.ok) throw new SmsSendError(`SMS Bus a répondu HTTP ${res.status}`, res.status);
    if (cfg.successRegex && !cfg.successRegex.test(body)) throw new SmsSendError('Réponse SMS Bus inattendue');
    return body;
  } catch (e) {
    if (e instanceof SmsSendError) throw e;
    throw new SmsSendError('SMS Bus injoignable ou délai dépassé'); // message sans secret
  } finally {
    clearTimeout(timer);
  }
}
