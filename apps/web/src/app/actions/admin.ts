'use server';
import { revalidatePath } from 'next/cache';
import { callRpc, str, type ActionState } from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';

const refresh = () => revalidatePath('/admin', 'layout');

export async function reviewKyc(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await callRpc('review_kyc', { p_submission: str(fd, 'id'), p_decision: str(fd, 'decision'), p_reason: str(fd, 'reason') || null, p_notes: str(fd, 'notes') || null });
  if (r.error) return { error: r.error.message };
  refresh(); return { ok: true, message: 'Décision enregistrée.' };
}
export async function reviewRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await callRpc('review_loan_request', { p_id: str(fd, 'id'), p_approve: str(fd, 'decision') === 'approve', p_reason: str(fd, 'reason') || null });
  if (r.error) return { error: r.error.message };
  refresh(); return { ok: true, message: 'Décision enregistrée.' };
}
export async function reviewOffer(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await callRpc('review_funding_offer', { p_id: str(fd, 'id'), p_approve: str(fd, 'decision') === 'approve', p_reason: str(fd, 'reason') || null });
  if (r.error) return { error: r.error.message };
  refresh(); return { ok: true, message: 'Décision enregistrée.' };
}
export async function requestDisbursement(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await callRpc('request_disbursement', { p_loan_id: str(fd, 'id') });
  if (r.error) return { error: r.error.message };
  refresh(); return { ok: true, message: 'Décaissement soumis à double validation.' };
}
export async function decideApproval(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await callRpc('decide_approval', { p_approval_id: str(fd, 'id'), p_approve: str(fd, 'decision') === 'approve', p_note: str(fd, 'note') || null });
  if (r.error) return { error: r.error.message };
  refresh(); return { ok: true, message: 'Décision enregistrée.' };
}
export async function requestRoleGrant(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await callRpc('request_role_grant', { p_user: str(fd, 'user_id'), p_role: str(fd, 'role') });
  if (r.error) return { error: r.error.message };
  refresh(); return { ok: true, message: 'Demande soumise : un autre super administrateur doit la valider.' };
}
export async function updateDispute(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await callRpc('update_dispute', { p_id: str(fd, 'id'), p_status: str(fd, 'status'), p_resolution: str(fd, 'resolution') || null });
  if (r.error) return { error: r.error.message };
  refresh(); return { ok: true, message: 'Litige mis à jour.' };
}
export async function setUserStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await callRpc('admin_set_user_status', { p_user: str(fd, 'id'), p_status: str(fd, 'status'), p_reason: str(fd, 'reason') });
  if (r.error) return { error: r.error.message };
  refresh(); return { ok: true, message: 'Statut mis à jour.' };
}
export async function setLoanStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await callRpc('set_loan_status', { p_loan_id: str(fd, 'id'), p_status: str(fd, 'status'), p_reason: str(fd, 'reason') });
  if (r.error) return { error: r.error.message };
  refresh(); return { ok: true, message: 'Statut du crédit mis à jour (audité).' };
}
export async function runOverdueJob(): Promise<ActionState> {
  const a = await callRpc<number>('refresh_overdue', {});
  if (a.error) return { error: a.error.message };
  const b = await callRpc<number>('send_installment_reminders', {});
  refresh(); return { ok: true, message: `${a.data} échéance(s) passée(s) en retard, ${b.data ?? 0} rappel(s) créé(s).` };
}
export async function setContactStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await callRpc('set_contact_status', { p_id: str(fd, 'id'), p_status: str(fd, 'status') });
  if (r.error) return { error: r.error.message };
  refresh(); return { ok: true, message: 'OK' };
}
/** URL signée courte (60 s) vers un document KYC ; l'accès est journalisé AVANT génération. */
export async function kycDocumentUrl(submissionId: string, path: string): Promise<string | null> {
  const log = await callRpc('log_kyc_document_access', { p_submission: submissionId });
  if (log.error) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}
