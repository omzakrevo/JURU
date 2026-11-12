import { describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { buildSmsRequest, loadSmsConfig, sendSms, SmsNotConfiguredError, SmsSendError, toSmsBusNumber, DEFAULT_SMSBUS_URL } from '../../../../../supabase/functions/_shared/smsbus';
import { verifySasPayWebhook } from '../../../../../supabase/functions/_shared/saspay';

const cfg = loadSmsConfig((k) => ({ SMSBUS_ID: 'ID-SECRET-TEST', SMSBUS_SENDER_ID: 'JURU' } as Record<string, string>)[k]);

describe('SMS Bus (d’après sendSms.php)', () => {
  it('configuration : SMSBUS_ID obligatoire, expéditeur ≤ 12 alphanumériques, URL par défaut', () => {
    expect(() => loadSmsConfig(() => undefined)).toThrow(SmsNotConfiguredError);
    expect(() => loadSmsConfig((k) => ({ SMSBUS_ID: 'x', SMSBUS_SENDER_ID: 'TROP-LONG-EXPEDITEUR' } as Record<string, string>)[k])).toThrow(/invalide/);
    expect(cfg.baseUrl).toBe(DEFAULT_SMSBUS_URL);
    expect(cfg.from).toBe('JURU');
  });
  it('numéros au format international sans « + »', () => {
    expect(toSmsBusNumber('+226 70 12 34 56')).toBe('22670123456');
    expect(toSmsBusNumber('0022670123456')).toBe('22670123456');
    expect(() => toSmsBusNumber('123')).toThrow(SmsSendError);
  });
  it('requête : POST form-urlencoded avec from, id, text (encodé), to ; plusieurs numéros séparés par virgule', () => {
    const r = buildSmsRequest(cfg, ['+22670123456', '22678378417'], 'Code 123456 é & ok');
    expect(r.init.method).toBe('POST');
    const p = new URLSearchParams(r.init.body);
    expect(p.get('from')).toBe('JURU');
    expect(p.get('id')).toBe('ID-SECRET-TEST');
    expect(p.get('to')).toBe('22670123456,22678378417');
    expect(p.get('text')).toBe('Code 123456 é & ok');
    expect(() => buildSmsRequest(cfg, '22670123456', '')).toThrow();
    expect(() => buildSmsRequest(cfg, '22670123456', 'x'.repeat(481))).toThrow();
  });
  it('envoi : succès sur 2xx ; HTTP non-2xx et réseau ⇒ erreur SANS fuite de l’identifiant', async () => {
    expect(await sendSms(cfg, '22670123456', 'ok', vi.fn(async () => new Response('OK', { status: 200 })) as unknown as typeof fetch)).toBe('OK');
    await expect(sendSms(cfg, '22670123456', 'ok', vi.fn(async () => new Response('err', { status: 500 })) as unknown as typeof fetch)).rejects.toMatchObject({ status: 500 });
    const e = await sendSms(cfg, '22670123456', 'ok', vi.fn(async () => { throw new Error('boom ID-SECRET-TEST'); }) as unknown as typeof fetch).catch((x) => x);
    expect(String(e.message)).not.toContain('ID-SECRET-TEST');
  });
  it('SMSBUS_SUCCESS_REGEX durcit la détection de succès', async () => {
    const strict = { ...cfg, successRegex: /^OK/ };
    await expect(sendSms(strict, '22670123456', 'x', vi.fn(async () => new Response('ERREUR', { status: 200 })) as unknown as typeof fetch)).rejects.toThrow(/inattendue/);
  });
});

describe('Webhook SAS Pay côté Edge Function (module partagé)', () => {
  const body = JSON.stringify({ event: 'transaction.failed', data: { id: 'abc', status: 'FAILED' } });
  const ts = '1800000000';
  const sig = createHmac('sha256', 's3cret').update(`${ts}.${body}`).digest('hex');
  const hdr = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
  it('valide / rejette comme l’adaptateur Node', async () => {
    const good = await verifySasPayWebhook(body, hdr({ 'x-webhook-signature': sig, 'x-webhook-timestamp': ts }), 's3cret', 1_800_000_100);
    expect(good).toMatchObject({ ok: true, eventKey: 'transaction.failed:abc' });
    expect(await verifySasPayWebhook(body, hdr({ 'x-webhook-signature': sig, 'x-webhook-timestamp': ts }), 's3cret', 1_800_001_000)).toMatchObject({ ok: false, reason: 'stale_timestamp' });
    expect(await verifySasPayWebhook(body, hdr({ 'x-webhook-signature': 'aa', 'x-webhook-timestamp': ts }), 's3cret', 1_800_000_100)).toMatchObject({ ok: false, reason: 'bad_signature' });
    expect(await verifySasPayWebhook(body, hdr({}), 's3cret')).toMatchObject({ ok: false, reason: 'missing_headers' });
  });
});
