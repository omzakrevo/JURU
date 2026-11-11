import { Alert, Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { adminPage } from '@/lib/admin';

type P = { id: string; name: string; type: string; status: string; country_code: string; license_reference: string | null; contract_reference: string | null; api_provider: string | null; notes: string | null };
export default async function Page() {
  const { supabase } = await adminPage('partenaires');
  const { data } = await supabase.from('partner_accounts').select('*').order('name');
  const rows = (data ?? []) as P[];
  return (
    <>
      <PageHeader title="Partenaires financiers" subtitle="Banques, SFD, opérateurs Mobile Money. Un partenaire ne peut être « actif » sans agrément ni contrat référencés." />
      <div className="mb-4"><Alert tone="info" title="Intégrations paiement">Orange Money et Moov Money : <strong>non connectés</strong>. Ils ne seront branchés qu’après contractualisation et obtention des API officielles.</Alert></div>
      {rows.length === 0 ? <EmptyState title="Aucun partenaire" /> : <div className="grid gap-4 md:grid-cols-2">{rows.map((p) => <Card key={p.id}><div className="flex justify-between"><div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted">{p.type} · {p.country_code}</p></div><StatusBadge status={p.status} /></div>
        <p className="mt-2 text-sm">Agrément : {p.license_reference ?? '—'} · Contrat : {p.contract_reference ?? '—'} · API : {p.api_provider ?? 'aucune'}</p>{p.notes && <p className="mt-1 text-xs text-muted">{p.notes}</p>}</Card>)}</div>}
    </>
  );
}
