'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { callRpc, bool, intOf, str, type ActionState } from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';
import { percentToBps } from '@/lib/money';
import { rateLimit } from '@/lib/ratelimit';

const done = (message: string): ActionState => ({ ok: true, message });

export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Connexion requise.' };
  const birth = str(fd, 'birth_date');
  const { error } = await supabase.from('profiles').update({
    full_name: str(fd, 'full_name'), birth_date: birth || null, city: str(fd, 'city') || null, address: str(fd, 'address') || null,
    account_type: str(fd, 'account_type') === 'business' ? 'business' : 'individual',
    business_name: str(fd, 'business_name') || null, is_borrower: bool(fd, 'is_borrower'), is_lender: bool(fd, 'is_lender'),
  }).eq('id', user.id);
  if (error) return { error: 'Mise à jour impossible : ' + error.message };
  if (bool(fd, 'is_lender')) {
    const { error: e2 } = await supabase.from('lender_profiles').upsert({
      user_id: user.id, source_of_funds: str(fd, 'source_of_funds') || null,
      risk_appetite: str(fd, 'risk_appetite') || 'moderate', investment_experience: str(fd, 'investment_experience') || null,
    });
    if (e2) return { error: e2.message };
  }
  revalidatePath('/app', 'layout');
  return done('Profil enregistré.');
}

export async function submitKyc(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit('kyc', 5, 60 * 60_000, undefined))) return { error: 'Trop de tentatives.' };
  const r = await callRpc('submit_kyc', {
    p_document_type: str(fd, 'document_type'), p_document_last4: str(fd, 'last4'), p_document_expiry: str(fd, 'expiry') || null,
    p_front_path: str(fd, 'front_path'), p_back_path: str(fd, 'back_path') || null, p_selfie_path: str(fd, 'selfie_path'),
    p_consent: bool(fd, 'consent'), p_consent_version: 'v1-demo',
  });
  if (r.error) return { error: r.error.message };
  revalidatePath('/app', 'layout');
  return done('Documents reçus. Vérification en cours.');
}

export async function createLoanRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const gt = str(fd, 'guarantee_type') || 'none';
  const r = await callRpc<{ id: string }>('submit_loan_request', {
    p_amount: intOf(fd, 'amount'), p_purpose: str(fd, 'purpose'), p_details: str(fd, 'details') || null,
    p_duration: intOf(fd, 'duration'), p_max_rate_bps: percentToBps(str(fd, 'max_rate')),
    p_income: intOf(fd, 'income'), p_expenses: intOf(fd, 'expenses'), p_existing_debt: intOf(fd, 'debt') || 0,
    p_guarantee_type: gt, p_guarantee_desc: str(fd, 'guarantee_desc') || null,
    p_guarantee_value: gt === 'none' ? null : intOf(fd, 'guarantee_value') || null,
    p_guarantor_name: str(fd, 'guarantor_name') || null, p_guarantor_phone: str(fd, 'guarantor_phone') || null,
  });
  if (r.error) return { error: r.error.message };
  revalidatePath('/app/demandes');
  redirect(`/app/demandes/${r.data?.id}`);
}

export async function cancelRequest(fd: FormData) {
  await callRpc('cancel_loan_request', { p_id: str(fd, 'id') });
  revalidatePath('/app/demandes');
  redirect('/app/demandes');
}

export async function createOffer(_: ActionState, fd: FormData): Promise<ActionState> {
  const purposes = fd.getAll('purposes').map(String);
  const r = await callRpc<{ id: string }>('publish_funding_offer', {
    p_title: str(fd, 'title'), p_amount: intOf(fd, 'amount'), p_min_amount: intOf(fd, 'min_amount'), p_max_amount: intOf(fd, 'max_amount'),
    p_min_duration: intOf(fd, 'min_duration'), p_max_duration: intOf(fd, 'max_duration'), p_rate_bps: percentToBps(str(fd, 'rate')),
    p_purposes: purposes, p_requires_guarantee: bool(fd, 'requires_guarantee'),
  });
  if (r.error) return { error: r.error.message };
  revalidatePath('/app/offres');
  redirect(`/app/offres/${r.data?.id}`);
}

export async function setOfferStatus(fd: FormData) {
  await callRpc('set_offer_status', { p_id: str(fd, 'id'), p_status: str(fd, 'status') });
  revalidatePath('/app/offres', 'layout');
}

export async function proposeApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const offer = str(fd, 'offer_id');
  const rate = str(fd, 'rate');
  const r = await callRpc('propose_application', {
    p_request_id: str(fd, 'request_id'), p_offer_id: offer || null, p_rate_bps: rate ? percentToBps(rate) : null, p_message: str(fd, 'message') || null,
  });
  if (r.error) return { error: r.error.message };
  revalidatePath('/app', 'layout');
  redirect('/app/propositions');
}

export async function withdrawApplication(fd: FormData) {
  await callRpc('withdraw_application', { p_id: str(fd, 'id') });
  revalidatePath('/app/propositions');
}

export async function respondApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const accept = str(fd, 'decision') === 'accept';
  if (accept && !bool(fd, 'ack')) return { error: 'Cochez la case pour confirmer que vous avez pris connaissance du coût total.' };
  const r = await callRpc<string | null>('respond_application', { p_id: str(fd, 'id'), p_accept: accept, p_ack_total_cost: accept ? intOf(fd, 'total_cost') : null });
  if (r.error) return { error: r.error.message };
  revalidatePath('/app', 'layout');
  redirect(accept && r.data ? `/app/contrats/${r.data}` : '/app/propositions');
}

export async function signContract(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!bool(fd, 'consent')) return { error: 'Vous devez accepter explicitement le contrat pour le signer.' };
  const h = await headers();
  const r = await callRpc('sign_contract', {
    p_contract_id: str(fd, 'id'), p_consent: true,
    p_evidence: { ip: h.get('x-forwarded-for')?.split(',')[0] ?? null, user_agent: h.get('user-agent'), channel: 'web', otp_verified: false, nonce: randomUUID() },
  });
  if (r.error) return { error: r.error.message };
  revalidatePath('/app', 'layout');
  return done('Contrat signé.');
}

export async function cancelContract(fd: FormData) {
  await callRpc('cancel_contract', { p_contract_id: str(fd, 'id') });
  revalidatePath('/app', 'layout');
  redirect('/app/propositions');
}

export async function repay(_: ActionState, fd: FormData): Promise<ActionState> {
  const early = bool(fd, 'early');
  const r = await callRpc('record_repayment', {
    p_loan_id: str(fd, 'loan_id'), p_amount: intOf(fd, 'amount'), p_idempotency_key: str(fd, 'key') || randomUUID(), p_early_full: early,
  });
  if (r.error) return { error: r.error.message };
  revalidatePath('/app', 'layout');
  return done(early ? '[DÉMO] Crédit soldé par remboursement anticipé (simulation).' : '[DÉMO] Remboursement enregistré (simulation).');
}

export async function openDispute(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Connexion requise.' };
  const { error } = await supabase.from('disputes').insert({
    loan_id: str(fd, 'loan_id'), opened_by: user.id, category: str(fd, 'category'), description: str(fd, 'description'),
    against_user_id: str(fd, 'against') || null,
  });
  if (error) return { error: 'Litige non enregistré (description de 10 caractères minimum).' };
  revalidatePath('/app/litiges');
  return done('Litige ouvert. Le support vous répondra.');
}

export async function markNotificationsRead() {
  await callRpc('mark_notifications_read', {});
  revalidatePath('/app', 'layout');
}
