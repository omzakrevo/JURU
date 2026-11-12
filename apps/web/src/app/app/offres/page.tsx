import Link from 'next/link';
import { HandCoins } from 'lucide-react';
import { ButtonLink, EmptyState, PageHeader, Progress, StatusBadge, Table, Td } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatBps, formatFcfa } from '@/lib/money';
import type { FundingOffer } from '@/types';

export default async function Page() {
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from('funding_offers').select('*').eq('lender_id', s.userId).order('created_at', { ascending: false });
  const rows = (data ?? []) as FundingOffer[];
  return (
    <>
      <PageHeader title="Mes offres de financement" actions={<ButtonLink href="/app/offres/nouvelle" size="sm">Nouvelle offre</ButtonLink>} />
      {!s.profile.is_lender && <p className="mb-4 text-sm text-muted">Activez « Je peux prêter » dans votre <Link className="font-semibold text-primary" href="/app/profil">profil</Link>.</p>}
      {rows.length === 0 ? <EmptyState icon={<HandCoins className="h-6 w-6" />} title="Aucune offre" text="Publiez une offre pour recevoir des demandes compatibles." action={<ButtonLink href="/app/offres/nouvelle">Publier une offre</ButtonLink>} /> : (
        <Table head={['Offre', 'Disponible', 'Taux', 'Durées', 'Statut', '']}>
          {rows.map((o) => <tr key={o.id}><Td className="font-semibold">{o.title}</Td><Td className="min-w-40"><span className="text-xs">{formatFcfa(o.amount_available)} / {formatFcfa(o.initial_amount)}</span><Progress value={o.initial_amount - o.amount_available} max={o.initial_amount} /></Td><Td>{formatBps(o.annual_rate_bps)}</Td><Td>{o.min_duration_months}–{o.max_duration_months} mois</Td><Td><StatusBadge status={o.status} /></Td><Td><Link className="font-semibold text-primary" href={`/app/offres/${o.id}`}>Ouvrir</Link></Td></tr>)}
        </Table>)}
    </>
  );
}
