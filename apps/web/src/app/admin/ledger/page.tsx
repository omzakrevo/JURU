import { Alert, Card, PageHeader, Table, Td } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatFcfa } from '@/lib/money';
import { formatDateTime } from '@/lib/dates';

type B = { code: string; name: string; type: string; total_debit: number; total_credit: number; balance: number };
type E = { debit: number; credit: number; ledger_accounts: { code: string; name: string }; ledger_journals: { journal_no: number; description: string; posted_at: string; is_simulation: boolean; reversal_of: string | null } };

export default async function Page() {
  const { supabase } = await adminPage('ledger');
  const [{ data: bal }, { data: ent }] = await Promise.all([
    supabase.from('ledger_balances').select('*').order('code'),
    supabase.from('ledger_entries').select('debit,credit,ledger_accounts(code,name),ledger_journals(journal_no,description,posted_at,is_simulation,reversal_of)').order('created_at', { ascending: false }).limit(120),
  ]);
  const b = (bal ?? []) as B[];
  const td = b.reduce((a, x) => a + Number(x.total_debit), 0), tc = b.reduce((a, x) => a + Number(x.total_credit), 0);
  return (
    <>
      <PageHeader title="Grand livre" subtitle="Partie double, écritures immuables ; toute correction passe par une extourne." />
      <div className="mb-4">{td === tc ? <Alert tone="success" title="Équilibre vérifié">Total débits = total crédits = {formatFcfa(td)}.</Alert> : <Alert tone="danger" title="DÉSÉQUILIBRE">Débits {formatFcfa(td)} ≠ crédits {formatFcfa(tc)} : alerte comptable.</Alert>}</div>
      <Table head={['Compte', 'Libellé', 'Débits', 'Crédits', 'Solde']}>{b.map((x) => <tr key={x.code}><Td className="font-mono">{x.code}</Td><Td>{x.name}</Td><Td>{formatFcfa(x.total_debit)}</Td><Td>{formatFcfa(x.total_credit)}</Td><Td className="font-semibold">{formatFcfa(x.balance)}</Td></tr>)}</Table>
      <h2 className="mb-3 mt-8 font-semibold">Dernières écritures</h2>
      <Table head={['Journal', 'Date', 'Libellé', 'Compte', 'Débit', 'Crédit']}>{((ent ?? []) as unknown as E[]).map((e, i) => <tr key={i}><Td>#{e.ledger_journals.journal_no}</Td><Td>{formatDateTime(e.ledger_journals.posted_at)}</Td><Td className="max-w-72 truncate">{e.ledger_journals.description}</Td><Td className="font-mono">{e.ledger_accounts.code}</Td><Td>{e.debit ? formatFcfa(e.debit) : ''}</Td><Td>{e.credit ? formatFcfa(e.credit) : ''}</Td></tr>)}</Table>
      <Card className="mt-4 text-xs text-muted">Rapprochement : comparez ces écritures avec les relevés du partenaire (colonne « Rapprochement » des transactions). Le compte 1010 représente des fonds détenus par le partenaire, jamais un compte ordinaire JURU.</Card>
    </>
  );
}
