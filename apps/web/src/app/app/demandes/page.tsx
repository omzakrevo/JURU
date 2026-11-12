import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { ButtonLink, EmptyState, PageHeader, StatusBadge, Table, Td } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/dates';
import { formatBps, formatFcfa } from '@/lib/money';
import { PURPOSES } from '@/lib/constants';
import type { LoanRequest } from '@/types';

export default async function Page() {
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from('loan_requests').select('*').eq('borrower_id', s.userId).order('created_at', { ascending: false });
  const rows = (data ?? []) as LoanRequest[];
  return (
    <>
      <PageHeader title="Mes demandes de financement" actions={<ButtonLink href="/app/demandes/nouvelle" size="sm">Nouvelle demande</ButtonLink>} />
      {rows.length === 0 ? <EmptyState icon={<Briefcase className="h-6 w-6" />} title="Aucune demande" text="Créez votre première demande de financement." action={<ButtonLink href="/app/demandes/nouvelle">Faire une demande</ButtonLink>} /> : (
        <Table head={['Date', 'Montant', 'Durée', 'Motif', 'Taux max', 'Statut', '']}>
          {rows.map((r) => <tr key={r.id}><Td>{formatDate(r.created_at)}</Td><Td className="font-semibold">{formatFcfa(r.amount)}</Td><Td>{r.duration_months} mois</Td><Td>{PURPOSES[r.purpose]}</Td><Td>{formatBps(r.max_annual_rate_bps)}</Td><Td><StatusBadge status={r.status} /></Td><Td><Link className="font-semibold text-primary" href={`/app/demandes/${r.id}`}>Ouvrir</Link></Td></tr>)}
        </Table>)}
    </>
  );
}
