'use server';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { str, type ActionState } from '@/lib/actions';
import { parseRpcError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSandboxGateway, type MobileMoneyChannel } from '@/lib/payments';
import { initiateCollection, type BeginResult } from '@/lib/payments/collect';
import { buildCustomer } from '@/lib/payments/customer';
import { supabaseStore } from '@/lib/payments/store';
import { runPaymentWorker } from '@/lib/payments/worker';
import { requireSession } from '@/lib/session';
import { rateLimit } from '@/lib/ratelimit';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const CHANNELS = ['orange_money', 'moov_money'];

/** Lance une collecte SAS Pay (MODE TEST) : begin (JWT utilisateur) → appel fournisseur → enregistrement (service_role). */
async function collect(purpose: 'disbursement' | 'repayment', refId: string, fd: FormData, returnPath: string): Promise<ActionState> {
  const s = await requireSession();
  const channel = str(fd, 'channel');
  if (!CHANNELS.includes(channel)) return { error: 'Choisissez Orange Money ou Moov Money.' };
  if (!(await rateLimit('collect', 10, 10 * 60_000, s.userId))) return { error: 'Trop de tentatives. Réessayez dans quelques minutes.' };
  const customer = buildCustomer(s.profile);
  if (!customer) return { error: 'Renseignez une adresse e-mail dans votre profil (exigée par le service de paiement).' };
  const user = await createClient();
  let admin, gateway;
  try { admin = createAdminClient(); gateway = getSandboxGateway(); }
  catch { return { error: 'Le service de paiement de test n’est pas configuré sur ce serveur.' }; }
  const rpc = async (fn: string, args: Record<string, unknown>) => { const { error } = await admin.rpc(fn, args); if (error) throw new Error(error.message); };
  try {
    const out = await initiateCollection({
      gateway,
      begin: async (p, ref, ch) => {
        const { data, error } = await user.rpc('begin_collection', { p_purpose: p, p_ref: ref, p_channel: ch });
        if (error) throw Object.assign(new Error(parseRpcError(error).message), { rpc: true });
        return data as BeginResult;
      },
      record: (txn, ref, status, url, raw) => rpc('record_gateway_response', { p_txn: txn, p_provider_reference: ref, p_status: status, p_checkout_url: url, p_raw: raw ?? null }),
      fail: (txn, code, message, retryable) => rpc('record_gateway_failure', { p_txn: txn, p_code: code, p_message: message, p_retryable: retryable }),
    }, { purpose, refId, channel: channel as MobileMoneyChannel, otp: str(fd, 'otp') || undefined, returnUrl: `${SITE}${returnPath}`, customer });
    revalidatePath('/app', 'layout');
    if (!out.ok) return { error: out.message };
    if (out.checkoutUrl) redirect(out.checkoutUrl);               // Orange Money : le client paie sur la page hébergée
    return { ok: true, message: '[TEST] Demande de paiement envoyée. Validez-la sur votre téléphone ; la page se met à jour automatiquement.' };
  } catch (e) {
    if ((e as Error & { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e;
    if ((e as { rpc?: boolean }).rpc) return { error: (e as Error).message };
    return { error: 'Erreur inattendue. Réessayez.' };
  }
}

export async function fundDisbursement(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, 'id');
  return collect('disbursement', id, fd, `/app/financement/${id}`);
}

export async function repaySandbox(_: ActionState, fd: FormData): Promise<ActionState> {
  const loanId = str(fd, 'loan_id');
  const amount = parseInt(str(fd, 'amount').replace(/[^\d]/g, ''), 10);
  const user = await createClient();
  const { data, error } = await user.rpc('start_repayment_intent', {
    p_loan_id: loanId, p_amount: amount, p_idempotency_key: str(fd, 'key') || randomUUID(), p_early_full: fd.get('early') === 'on',
  });
  if (error) return { error: parseRpcError(error).message };
  return collect('repayment', data as string, fd, `/app/credits/${loanId}`);
}

/** Exécution manuelle du worker par le personnel financier (même code que la route cron). */
export async function runWorkerNow(): Promise<ActionState> {
  const s = await requireSession();
  if (!s.roles.some((r) => ['super_admin', 'finance_manager'].includes(r))) return { error: 'Droits insuffisants.' };
  try {
    const r = await runPaymentWorker(supabaseStore(createAdminClient()), getSandboxGateway());
    revalidatePath('/admin', 'layout');
    const msg = `Webhooks traités : ${r.webhooks} · vérifiées : ${r.verified} · versements émis : ${r.payoutsSent} (échecs : ${r.payoutsFailed}) · expirées : ${r.expired}`;
    return r.errors.length ? { error: `${msg} — ${r.errors.join(' | ')}` } : { ok: true, message: msg };
  } catch {
    return { error: 'Service de paiement de test non configuré (SASPAY_API_KEY sk_test_, SUPABASE_SERVICE_ROLE_KEY).' };
  }
}
