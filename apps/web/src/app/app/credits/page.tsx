import Link from 'next/link';
import { FileText } from 'lucide-react';
import { EmptyState, PageHeader, Progress, StatusBadge, Table, Td } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatFcfa } from '@/lib/money';
import { formatDate } from '@/lib/dates';
import type { Loan } from '@/types';

export default async function Page() {
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from('loans').select('*').order('created_at', { ascending: false });
  const rows = (data ?? []) as Loan[];
  return (
    <>
      <PageHeader title="Mes crédits" />
      {rows.length === 0 ? <EmptyState icon={<FileText className="h-6 w-6" />} title="Aucun crédit" text="Un crédit est créé lorsque le contrat est signé par les deux parties." /> : (
        <Table head={['N°', 'Rôle', 'Capital', 'Remboursé', 'Décaissé le', 'Statut', '']}>
          {rows.map((l) => <tr key={l.id}><Td>#{l.loan_no}</Td><Td>{l.borrower_id === s.userId ? 'Emprunteur' : 'Prêteur'}</Td><Td className="font-semibold">{formatFcfa(l.principal)}</Td>
            <Td className="min-w-32"><span className="text-xs">{formatFcfa(l.amount_repaid)}</span><Progress value={l.amount_repaid} max={l.total_repayable} /></Td><Td>{formatDate(l.disbursed_at)}</Td><Td><StatusBadge status={l.status} /></Td><Td><Link className="font-semibold text-primary" href={`/app/credits/${l.id}`}>Ouvrir</Link></Td></tr>)}
        </Table>)}
    </>
  );
}
