import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/ActionForm';
import { Alert, ButtonLink, Card, Field, Input, KV, PageHeader, Progress, Select, StatusBadge, Table, Td, Textarea } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatFcfa } from '@/lib/money';
import { formatCalendarDate, formatDateTime } from '@/lib/dates';
import { openDispute, repay } from '@/app/actions/app';
import type { Loan, ScheduleRow } from '@/types';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from('loans').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const l = data as Loan;
  const isBorrower = l.borrower_id === s.userId;
  const [{ data: sched }, { data: reps }, payoff] = await Promise.all([
    supabase.from('repayment_schedules').select('*').eq('loan_id', id).order('installment_no'),
    supabase.from('repayments').select('id,amount,kind,created_at,is_simulation').eq('loan_id', id).order('created_at', { ascending: false }),
    isBorrower && ['active', 'overdue'].includes(l.status) ? supabase.rpc('get_payoff_amount', { p_loan_id: id }) : Promise.resolve({ data: null }),
  ]);
  const rows = (sched ?? []) as ScheduleRow[];
  const next = rows.find((r) => r.status !== 'paid');
  const due = (r: ScheduleRow) => r.principal_due - r.principal_paid + r.interest_due - r.interest_paid - r.interest_waived + r.penalty_due - r.penalty_paid;
  const key = crypto.randomUUID();
  return (
    <>
      <PageHeader title={`Crédit n°${l.loan_no}`} subtitle={isBorrower ? 'Vous êtes l’emprunteur.' : 'Vous êtes le prêteur.'} actions={<><StatusBadge status={l.status} /><ButtonLink href={`/app/contrats/${l.contract_id}`} variant="outline" size="sm">Contrat</ButtonLink></>} />
      {l.is_simulation && <div className="mb-4"><Alert tone="warning" title="MODE DÉMONSTRATION">Les décaissements et remboursements de ce crédit sont simulés : aucun argent réel n’est échangé.</Alert></div>}
      {l.status === 'overdue' && <div className="mb-4"><Alert tone="danger" title="Retard de paiement">Des pénalités s’appliquent. Régularisez dès que possible ou ouvrez un litige.</Alert></div>}
      {l.status === 'awaiting_disbursement' && <div className="mb-4"><Alert tone="info" title="Décaissement en attente">Le décaissement requiert une double validation interne.</Alert></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><dl><KV label="Capital">{formatFcfa(l.principal)}</KV><KV label="Total à rembourser">{formatFcfa(l.total_repayable)}</KV><KV label="Déjà remboursé">{formatFcfa(l.amount_repaid)}</KV>
          <KV label="Pénalités (dues / payées)">{formatFcfa(l.penalties_accrued)} / {formatFcfa(l.penalties_paid)}</KV><KV label="Décaissé le">{formatDateTime(l.disbursed_at)}</KV></dl>
          <div className="mt-3"><Progress value={l.amount_repaid} max={l.total_repayable} /></div></Card>
        {isBorrower && ['active', 'overdue'].includes(l.status) && next && (
          <Card><h2 className="mb-3 font-semibold">Rembourser <span className="ml-1 rounded bg-warning px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">Démo</span></h2>
            <ActionForm action={repay} submit="Payer (simulation)" variant="accent"><input type="hidden" name="loan_id" value={id} /><input type="hidden" name="key" value={key} />
              <Field label="Montant (FCFA)" htmlFor="amount" help={`Échéance n°${next.installment_no} : ${formatFcfa(due(next))}. Un paiement partiel est possible.`}><Input id="amount" name="amount" inputMode="numeric" defaultValue={due(next)} required /></Field></ActionForm>
            {payoff.data !== null && <div className="mt-4 border-t border-border pt-4"><p className="text-sm">Remboursement anticipé total : <strong>{formatFcfa(payoff.data as number)}</strong> <span className="text-muted">(capital restant + intérêts échus ; intérêts futurs non dus)</span></p>
              <ActionForm action={repay} submit="Tout rembourser maintenant (simulation)" variant="outline" className="mt-3"><input type="hidden" name="loan_id" value={id} /><input type="hidden" name="key" value={crypto.randomUUID()} /><input type="hidden" name="amount" value={payoff.data as number} /><input type="hidden" name="early" value="on" /></ActionForm></div>}
          </Card>)}
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Échéancier</h2>
      <Table head={['N°', 'Échéance', 'Capital', 'Intérêts', 'Pénalité', 'Reste dû', 'Statut']}>
        {rows.map((r) => <tr key={r.id}><Td>{r.installment_no}</Td><Td>{formatCalendarDate(r.due_date)}</Td><Td>{formatFcfa(r.principal_due)}</Td><Td>{formatFcfa(r.interest_due - r.interest_waived)}</Td><Td>{formatFcfa(r.penalty_due)}</Td><Td className="font-semibold">{r.status === 'paid' ? '—' : formatFcfa(due(r))}</Td><Td><StatusBadge status={r.status} /></Td></tr>)}
      </Table>
      <h2 className="mb-3 mt-8 font-semibold">Paiements</h2>
      {(reps ?? []).length === 0 ? <p className="text-sm text-muted">Aucun paiement enregistré.</p> : <Table head={['Date', 'Type', 'Montant']}>{(reps as { id: string; amount: number; kind: string; created_at: string; is_simulation: boolean }[]).map((r) => <tr key={r.id}><Td>{formatDateTime(r.created_at)}</Td><Td>{{ regular: 'Échéance', partial: 'Partiel', early_full: 'Anticipé total' }[r.kind]}{r.is_simulation ? ' · [DÉMO]' : ''}</Td><Td>{formatFcfa(r.amount)}</Td></tr>)}</Table>}
      <details className="mt-8 rounded-2xl border border-border p-4"><summary className="cursor-pointer font-semibold">Ouvrir un litige</summary>
        <ActionForm action={openDispute} submit="Envoyer" className="mt-3"><input type="hidden" name="loan_id" value={id} /><input type="hidden" name="against" value={isBorrower ? l.lender_id : l.borrower_id} />
          <Field label="Catégorie"><Select name="category"><option value="payment_not_received">Paiement non reçu</option><option value="wrong_amount">Montant erroné</option><option value="fraud">Fraude</option><option value="contract_terms">Conditions du contrat</option><option value="harassment">Harcèlement</option><option value="other">Autre</option></Select></Field>
          <Field label="Description (10 caractères minimum)"><Textarea name="description" required minLength={10} /></Field></ActionForm></details>
    </>
  );
}
