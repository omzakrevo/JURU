import Link from 'next/link';
import { Search } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { Badge, ButtonLink, Card, EmptyState, Field, Input, PageHeader, Select } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatBps, formatFcfa } from '@/lib/money';
import { GUARANTEE_LABELS, PURPOSES } from '@/lib/constants';
import { proposeApplication } from '@/app/actions/app';
import type { FundingOffer, MarketRequest } from '@/types';

type SP = { purpose?: string; min?: string; max?: string; duration?: string; tab?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const supabase = await createClient();
  const tab = sp.tab === 'offres' || (!s.profile.is_lender && sp.tab !== 'demandes') ? 'offres' : 'demandes';
  const tabs = (
    <div className="mb-3 flex rounded-full bg-surface-2 p-1 text-sm font-semibold lg:mb-5 lg:inline-flex">
      <Link href="/app/marche?tab=demandes" className={`rounded-full px-4 py-1.5 ${tab === 'demandes' ? 'bg-surface shadow-card' : 'text-muted'}`}>Demandes (prêteurs)</Link>
      <Link href="/app/marche?tab=offres" className={`rounded-full px-4 py-1.5 ${tab === 'offres' ? 'bg-surface shadow-card' : 'text-muted'}`}>Offres (emprunteurs)</Link>
    </div>);
  const filters = (
    <form className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-5" method="get">
      <input type="hidden" name="tab" value={tab} />
      <Field label="Motif"><Select name="purpose" defaultValue={sp.purpose ?? ''}><option value="">Tous</option>{Object.entries(PURPOSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
      <Field label="Montant min"><Input name="min" inputMode="numeric" defaultValue={sp.min} /></Field>
      <Field label="Montant max"><Input name="max" inputMode="numeric" defaultValue={sp.max} /></Field>
      <Field label="Durée max (mois)"><Input name="duration" inputMode="numeric" defaultValue={sp.duration} /></Field>
      <div className="flex items-end"><button className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg">Filtrer</button></div>
    </form>);
  const filtersBlock = (<><details className="mb-3 rounded-2xl border border-border bg-surface p-3 lg:hidden"><summary className="cursor-pointer text-sm font-semibold">Filtres</summary><div className="mt-3">{filters}</div></details><div className="mb-5 hidden lg:block">{filters}</div></>);
  const min = parseInt(sp.min ?? '', 10), max = parseInt(sp.max ?? '', 10), dur = parseInt(sp.duration ?? '', 10);

  if (tab === 'demandes') {
    let q = supabase.from('marketplace_requests').select('*').order('published_at', { ascending: false }).limit(50);
    if (sp.purpose) q = q.eq('purpose', sp.purpose);
    if (min) q = q.gte('amount', min);
    if (max) q = q.lte('amount', max);
    if (dur) q = q.lte('duration_months', dur);
    const { data } = await q;
    const rows = (data ?? []) as MarketRequest[];
    const { data: myOffers } = await supabase.from('funding_offers').select('id,title,annual_rate_bps').eq('lender_id', s.userId).eq('status', 'active');
    return (<><PageHeader title="Marché" subtitle="Demandes de financement vérifiées, sans données d’identité sensibles." />{tabs}{filtersBlock}
      {!s.profile.is_lender || s.profile.kyc_status !== 'approved' ? <EmptyState title="Accès prêteur requis" text="Activez le profil prêteur et faites valider votre identité pour consulter les demandes." action={<ButtonLink href="/app/profil">Mon profil</ButtonLink>} />
        : rows.length === 0 ? <EmptyState icon={<Search className="h-6 w-6" />} title="Aucune demande" text="Modifiez vos filtres ou revenez plus tard." /> :
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0">{rows.map((r) => (
          <Card key={r.id} className="w-[88%] shrink-0 snap-center !p-5 md:w-auto"><div className="flex items-start justify-between"><div><p className="text-xl font-semibold">{formatFcfa(r.amount)}</p><p className="text-sm text-muted">{r.duration_months} mois · {PURPOSES[r.purpose]}</p></div>
            <div className="text-right"><Badge tone={r.risk_grade === 'A' ? 'success' : r.risk_grade === 'B' ? 'info' : 'warning'}>Risque {r.risk_grade}</Badge></div></div>
            <p className="mt-2 text-sm">{r.purpose_details}</p>
            <p className="mt-2 text-xs text-muted">{r.borrower_display}{r.borrower_kyc_verified ? ' · identité vérifiée' : ''} · taux max {formatBps(r.max_annual_rate_bps)} · garantie : {GUARANTEE_LABELS[r.guarantee_type]}</p>
            <details className="mt-3 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-semibold text-primary">Faire une proposition</summary>
              <ActionForm action={proposeApplication} submit="Envoyer la proposition" className="mt-3"><input type="hidden" name="request_id" value={r.id} />
                <Field label="Basée sur mon offre"><Select name="offer_id"><option value="">— Taux libre —</option>{(myOffers ?? []).map((o: { id: string; title: string; annual_rate_bps: number }) => <option key={o.id} value={o.id}>{o.title} ({formatBps(o.annual_rate_bps)})</option>)}</Select></Field>
                <Field label="Taux annuel % (si taux libre)" help={`Maximum accepté par l’emprunteur : ${formatBps(r.max_annual_rate_bps)}`}><Input name="rate" inputMode="decimal" /></Field>
                <Field label="Message"><Input name="message" maxLength={500} /></Field></ActionForm></details></Card>))}</div>}</>);
  }
  let q = supabase.from('funding_offers').select('*').eq('status', 'active').neq('lender_id', s.userId).order('annual_rate_bps').limit(50);
  if (min) q = q.lte('min_amount', min);
  if (max) q = q.gte('max_amount', max);
  if (dur) q = q.lte('min_duration_months', dur);
  const { data } = await q;
  const rows = ((data ?? []) as FundingOffer[]).filter((o) => !sp.purpose || o.accepted_purposes.length === 0 || o.accepted_purposes.includes(sp.purpose));
  return (<><PageHeader title="Marché" subtitle="Offres de financement actives. Pour en profiter, publiez une demande : les prêteurs vous adressent une proposition ferme." />{tabs}{filtersBlock}
    {rows.length === 0 ? <EmptyState title="Aucune offre" text="Modifiez vos filtres ou revenez plus tard." action={<ButtonLink href="/app/demandes/nouvelle">Faire une demande</ButtonLink>} /> :
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0">{rows.map((o) => <Card key={o.id} className="w-[88%] shrink-0 snap-center !p-5 md:w-auto"><p className="font-semibold">{o.title}</p><p className="mt-1 text-2xl font-semibold text-primary">{formatBps(o.annual_rate_bps)}<span className="text-sm font-normal text-muted"> par an</span></p>
        <p className="mt-2 text-sm text-muted">{formatFcfa(o.min_amount)} – {formatFcfa(o.max_amount)} · {o.min_duration_months}–{o.max_duration_months} mois</p>
        <p className="mt-1 text-xs text-muted">Motifs : {o.accepted_purposes.length ? o.accepted_purposes.map((p) => PURPOSES[p]).join(', ') : 'tous'} · garantie {o.requires_guarantee ? 'exigée' : 'non exigée'}</p></Card>)}</div>}</>);
}
