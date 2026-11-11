import { notFound } from 'next/navigation';
import { Alert, Card, KV, PageHeader, StatusBadge, ButtonLink } from '@/components/ui';
import { ApplicationCard } from '@/components/ApplicationCard';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatBps, formatFcfa } from '@/lib/money';
import { PURPOSES } from '@/lib/constants';
import { cancelRequest } from '@/app/actions/app';
import type { Application, LoanRequest } from '@/types';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const supabase = await createClient();
  const { data: r } = await supabase.from('loan_requests').select('*').eq('id', id).eq('borrower_id', s.userId).maybeSingle();
  if (!r) notFound();
  const req = r as LoanRequest;
  const [{ data: apps }, { data: matches }, { data: cards }] = await Promise.all([
    supabase.from('loan_applications').select('*').eq('request_id', id).order('created_at', { ascending: false }),
    req.status === 'open' ? supabase.rpc('find_matching_offers', { p_request_id: id }) : Promise.resolve({ data: [] }),
    supabase.from('counterparty_cards').select('id,display_name'),
  ]);
  const name = (uid: string) => cards?.find((c: { id: string; display_name: string }) => c.id === uid)?.display_name;
  return (
    <>
      <PageHeader title={`Demande de ${formatFcfa(req.amount)}`} subtitle={`${PURPOSES[req.purpose]} · ${req.duration_months} mois`} actions={<StatusBadge status={req.status} />} />
      {req.status === 'pending_review' && <div className="mb-4"><Alert tone="info" title="En cours d’examen">Un agent crédit examine votre demande{req.auto_review?.reasons?.length ? ` (${req.auto_review.reasons.join(', ')})` : ''}.</Alert></div>}
      {req.status === 'rejected' && <div className="mb-4"><Alert tone="danger" title="Demande refusée">{req.rejection_reason}</Alert></div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card><dl>
          <KV label="Taux annuel maximum accepté">{formatBps(req.max_annual_rate_bps)}</KV>
          <KV label="Revenus / charges">{formatFcfa(req.monthly_income)} / {formatFcfa(req.monthly_expenses)}</KV>
          <KV label="Capacité de remboursement">{formatFcfa(req.repayment_capacity)} / mois</KV>
          <KV label="Note de risque">{req.risk_score ?? '—'} / 100</KV>
        </dl>
          {req.purpose_details && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">{req.purpose_details}</p>}
          {['pending_review', 'open'].includes(req.status) && <form action={cancelRequest} className="mt-4"><input type="hidden" name="id" value={id} /><button className="text-sm font-semibold text-danger">Annuler cette demande</button></form>}
        </Card>
        <div className="space-y-4">
          <h2 className="font-semibold">Propositions reçues</h2>
          {(apps ?? []).length === 0 ? <Card className="text-sm text-muted">Aucune proposition pour le moment. Les prêteurs vérifiés voient votre demande et peuvent vous répondre.</Card>
            : (apps as Application[]).map((a) => <ApplicationCard key={a.id} a={a} lenderName={name(a.lender_id)} canRespond />)}
        </div>
      </div>
      {(matches ?? []).length > 0 && (<section className="mt-8"><h2 className="mb-3 font-semibold">Offres compatibles (matching)</h2>
        <div className="grid gap-3 sm:grid-cols-2">{(matches as { offer_id: string; title: string; lender_display: string; annual_rate_bps: number; match_score: number; quote: { monthly_payment: number; total_cost: number } }[]).map((m) => (
          <Card key={m.offer_id} className="!p-4"><div className="flex justify-between"><p className="font-semibold">{m.title}</p><span className="rounded-full bg-accent-soft px-2 text-xs font-bold text-primary">{m.match_score}% match</span></div>
            <p className="text-sm text-muted">{m.lender_display} · {formatBps(m.annual_rate_bps)} · mensualité {formatFcfa(m.quote.monthly_payment)} · coût total {formatFcfa(m.quote.total_cost)}</p>
            <p className="mt-2 text-xs text-muted">Le prêteur doit vous adresser une proposition ferme : vous la recevrez ci-dessus.</p></Card>))}</div></section>)}
      <div className="mt-6"><ButtonLink href="/app/demandes" variant="ghost" size="sm">← Retour</ButtonLink></div>
    </>
  );
}
