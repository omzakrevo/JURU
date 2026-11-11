import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/ActionForm';
import { Card, Field, Input, KV, PageHeader, StatusBadge } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatBps, formatFcfa } from '@/lib/money';
import { PURPOSES } from '@/lib/constants';
import { proposeApplication, setOfferStatus } from '@/app/actions/app';
import type { FundingOffer } from '@/types';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from('funding_offers').select('*').eq('id', id).eq('lender_id', s.userId).maybeSingle();
  if (!data) notFound();
  const o = data as FundingOffer;
  const { data: matches } = o.status === 'active' ? await supabase.rpc('find_matching_requests', { p_offer_id: id }) : { data: [] };
  return (
    <>
      <PageHeader title={o.title} actions={<StatusBadge status={o.status} />} />
      {o.status === 'rejected' && <p className="mb-4 text-sm text-danger">Refusée : {o.rejection_reason}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card><dl><KV label="Disponible">{formatFcfa(o.amount_available)} / {formatFcfa(o.initial_amount)}</KV><KV label="Par prêt">{formatFcfa(o.min_amount)} – {formatFcfa(o.max_amount)}</KV>
          <KV label="Durées">{o.min_duration_months}–{o.max_duration_months} mois</KV><KV label="Taux annuel">{formatBps(o.annual_rate_bps)}</KV>
          <KV label="Motifs">{o.accepted_purposes.length ? o.accepted_purposes.map((p) => PURPOSES[p]).join(', ') : 'Tous'}</KV><KV label="Garantie exigée">{o.requires_guarantee ? 'Oui' : 'Non'}</KV></dl>
          {['active', 'paused'].includes(o.status) && <div className="mt-4 flex gap-2">
            <form action={setOfferStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={o.status === 'active' ? 'paused' : 'active'} /><button className="rounded-full border border-border px-4 py-2 text-sm font-semibold">{o.status === 'active' ? 'Mettre en pause' : 'Réactiver'}</button></form>
            <form action={setOfferStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="closed" /><button className="rounded-full px-4 py-2 text-sm font-semibold text-danger">Clôturer</button></form></div>}
        </Card>
        <div className="space-y-3"><h2 className="font-semibold">Demandes compatibles</h2>
          {(matches ?? []).length === 0 ? <Card className="text-sm text-muted">Aucune demande compatible pour l’instant.</Card> :
            (matches as { request_id: string; amount: number; purpose: string; duration_months: number; max_annual_rate_bps: number; risk_grade: string; borrower_display: string; match_score: number }[]).map((m) => (
              <Card key={m.request_id} className="!p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{formatFcfa(m.amount)} · {m.duration_months} mois · {PURPOSES[m.purpose]}</p>
                <span className="text-xs font-bold">Risque {m.risk_grade} · {m.match_score}% match</span></div>
                <p className="text-sm text-muted">{m.borrower_display} · taux max {formatBps(m.max_annual_rate_bps)}</p>
                <ActionForm action={proposeApplication} submit="Proposer ce financement" className="mt-3"><input type="hidden" name="request_id" value={m.request_id} /><input type="hidden" name="offer_id" value={id} />
                  <Field label="Message (facultatif)"><Input name="message" maxLength={500} /></Field></ActionForm></Card>))}</div>
      </div>
    </>
  );
}
