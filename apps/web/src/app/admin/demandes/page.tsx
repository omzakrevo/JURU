import { DecisionForm } from '@/components/DecisionForm';
import { Card, EmptyState, KV, PageHeader, StatusBadge } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatBps, formatFcfa } from '@/lib/money';
import { PURPOSES } from '@/lib/constants';
import { formatDate } from '@/lib/dates';
import { reviewRequest } from '@/app/actions/admin';
import type { LoanRequest } from '@/types';

export default async function Page() {
  const { supabase } = await adminPage('demandes');
  const { data } = await supabase.from('loan_requests').select('*').order('created_at', { ascending: false }).limit(60);
  const rows = (data ?? []) as LoanRequest[];
  const { data: profs } = rows.length ? await supabase.from('profiles').select('id,full_name,kyc_status').in('id', rows.map((r) => r.borrower_id)) : { data: [] };
  const who = (id: string) => profs?.find((p: { id: string }) => p.id === id) as { full_name: string; kyc_status: string } | undefined;
  return (
    <>
      <PageHeader title="Demandes de financement" subtitle="Les demandes à risque élevé ou de montant important arrivent ici pour examen humain." />
      {rows.length === 0 ? <EmptyState title="Aucune demande" /> : <div className="space-y-4">{rows.map((r) => (
        <Card key={r.id}><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{formatFcfa(r.amount)} · {r.duration_months} mois · {PURPOSES[r.purpose]}</p><p className="text-sm text-muted">{who(r.borrower_id)?.full_name} (KYC {who(r.borrower_id)?.kyc_status}) · {formatDate(r.created_at)}</p></div><StatusBadge status={r.status} /></div>
          <dl className="mt-3 grid gap-x-8 sm:grid-cols-2"><KV label="Revenus / charges">{formatFcfa(r.monthly_income)} / {formatFcfa(r.monthly_expenses)}</KV><KV label="Capacité">{formatFcfa(r.repayment_capacity)}</KV><KV label="Score de risque">{r.risk_score}</KV><KV label="Taux max">{formatBps(r.max_annual_rate_bps)}</KV></dl>
          {r.auto_review?.reasons?.length ? <p className="mt-2 text-sm text-warning">Alertes auto : {r.auto_review.reasons.join(' · ')}</p> : null}
          {r.status === 'pending_review' && <div className="mt-4 border-t border-border pt-4"><DecisionForm action={reviewRequest} id={r.id} yes={['approve', 'Publier']} no={['reject', 'Refuser']} /></div>}</Card>))}</div>}
    </>
  );
}
