import { ActionForm } from '@/components/ActionForm';
import { Alert, Card, EmptyState, Field, Input, PageHeader, Select, StatusBadge, Table, Td } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatFcfa } from '@/lib/money';
import { formatDate } from '@/lib/dates';
import { requestDisbursement, setLoanStatus } from '@/app/actions/admin';
import type { Loan } from '@/types';

export default async function Page() {
  const { s, supabase } = await adminPage('credits');
  const { data } = await supabase.from('loans').select('*').order('created_at', { ascending: false }).limit(100);
  const rows = (data ?? []) as Loan[];
  const canDisburse = s.roles.some((r) => ['super_admin', 'finance_manager', 'credit_agent'].includes(r));
  const canQualify = s.roles.some((r) => ['super_admin', 'credit_agent', 'compliance_officer'].includes(r));
  return (
    <>
      <PageHeader title="Crédits" subtitle="Le décaissement exige une double validation (onglet « Double validation »)." />
      <div className="mb-4"><Alert tone="warning" title="MODE DÉMONSTRATION">Les décaissements sont simulés tant que les paiements réels ne sont pas activés pour le pays.</Alert></div>
      {rows.length === 0 ? <EmptyState title="Aucun crédit" /> : <Table head={['N°', 'Capital', 'Remboursé', 'Créé', 'Statut', 'Action']}>
        {rows.map((l) => <tr key={l.id}><Td>#{l.loan_no}</Td><Td className="font-semibold">{formatFcfa(l.principal)}</Td><Td>{formatFcfa(l.amount_repaid)}</Td><Td>{formatDate(l.created_at)}</Td><Td><StatusBadge status={l.status} /></Td>
          <Td>{l.status === 'awaiting_disbursement' && canDisburse ? <ActionForm action={requestDisbursement} submit="Demander le décaissement" variant="outline"><input type="hidden" name="id" value={l.id} /></ActionForm>
            : ['active', 'overdue'].includes(l.status) && canQualify ? <details><summary className="cursor-pointer text-sm font-semibold text-primary">Qualifier</summary><ActionForm action={setLoanStatus} submit="Appliquer" variant="secondary" className="mt-2 min-w-56"><input type="hidden" name="id" value={l.id} /><Select name="status" aria-label="Statut"><option value="defaulted">En défaut</option><option value="in_dispute">En litige</option><option value="overdue">En retard</option><option value="active">Actif</option></Select><Field label="Motif"><Input name="reason" required /></Field></ActionForm></details> : '—'}</Td></tr>)}</Table>}
      <Card className="mt-4 text-xs text-muted">Passer un crédit en « défaut » est une décision humaine tracée dans l’audit (jamais automatique).</Card>
    </>
  );
}
