import { Alert, EmptyState, PageHeader, StatusBadge, Table, Td, Badge } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { ActionForm } from '@/components/ActionForm';
import { runWorkerNow } from '@/app/actions/payments';
import { formatFcfa } from '@/lib/money';
import { formatDateTime } from '@/lib/dates';

type T = { id: string; mode: string; purpose: string | null; failure_reason: string | null; type: string; provider: string; status: string; amount: number; is_simulation: boolean; idempotency_key: string; reconciliation_status: string; created_at: string };
export default async function Page() {
  const { supabase } = await adminPage('transactions');
  const { data } = await supabase.from('payment_transactions').select('id,mode,purpose,failure_reason,type,provider,status,amount,is_simulation,idempotency_key,reconciliation_status,created_at').order('created_at', { ascending: false }).limit(200);
  const rows = (data ?? []) as T[];
  return (
    <>
      <PageHeader title="Transactions" subtitle="Journal des mouvements. Clé d’idempotence unique par opération (anti double paiement)." />
      <div className="mb-4"><Alert tone="warning" title="AUCUN ARGENT RÉEL">Transactions « SIMULATION » (rien n’est envoyé) ou « TEST SAS PAY » (environnement de test du fournisseur) : aucun mouvement d’argent réel.</Alert></div>
      <div className="mb-4 max-w-xl"><ActionForm action={runWorkerNow} submit="Traiter les paiements en attente (worker)" variant="outline" /></div>
      {rows.length === 0 ? <EmptyState title="Aucune transaction" /> : <Table head={['Date', 'Objet', 'Fournisseur', 'Montant', 'Statut', 'Rapprochement', 'Clé']}>
        {rows.map((t) => <tr key={t.id}><Td>{formatDateTime(t.created_at)}</Td><Td>{t.purpose ?? t.type}{t.failure_reason ? <div className="text-xs text-danger">{t.failure_reason}</div> : null}</Td><Td>{t.mode === 'sandbox' ? <Badge tone="info">TEST SAS PAY</Badge> : t.is_simulation ? <Badge tone="warning">SIMULATION</Badge> : t.provider}</Td><Td className="font-semibold">{formatFcfa(t.amount)}</Td><Td><StatusBadge status={t.status} /></Td><Td className="text-xs">{t.reconciliation_status}</Td><Td className="max-w-40 truncate font-mono text-xs">{t.idempotency_key}</Td></tr>)}</Table>}
    </>
  );
}
