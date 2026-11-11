import { DecisionForm } from '@/components/DecisionForm';
import { Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatBps, formatFcfa } from '@/lib/money';
import { reviewOffer } from '@/app/actions/admin';
import type { FundingOffer } from '@/types';

export default async function Page() {
  const { supabase } = await adminPage('offres');
  const { data } = await supabase.from('funding_offers').select('*').order('created_at', { ascending: false }).limit(60);
  const rows = (data ?? []) as FundingOffer[];
  return (
    <>
      <PageHeader title="Offres de financement" />
      {rows.length === 0 ? <EmptyState title="Aucune offre" /> : <div className="space-y-4">{rows.map((o) => (
        <Card key={o.id}><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{o.title}</p><p className="text-sm text-muted">{formatFcfa(o.amount_available)} dispo · {formatFcfa(o.min_amount)}–{formatFcfa(o.max_amount)} · {formatBps(o.annual_rate_bps)} · {o.min_duration_months}–{o.max_duration_months} mois</p></div><StatusBadge status={o.status} /></div>
          {o.status === 'pending_review' && <div className="mt-4 border-t border-border pt-4"><DecisionForm action={reviewOffer} id={o.id} yes={['approve', 'Activer']} no={['reject', 'Refuser']} /></div>}</Card>))}</div>}
    </>
  );
}
