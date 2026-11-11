import { ActionForm } from '@/components/ActionForm';
import { Field, Input, PageHeader, Select, StatusBadge, Table, Td } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatDate } from '@/lib/dates';
import { setUserStatus } from '@/app/actions/admin';

type P = { id: string; full_name: string | null; phone: string | null; kyc_status: string; status: string; is_borrower: boolean; is_lender: boolean; created_at: string };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { s, supabase } = await adminPage('utilisateurs');
  let qb = supabase.from('profiles').select('id,full_name,phone,kyc_status,status,is_borrower,is_lender,created_at').order('created_at', { ascending: false }).limit(100);
  if (q) qb = qb.ilike('full_name', `%${q.replace(/[%_]/g, '')}%`);
  const { data } = await qb;
  const canSuspend = s.roles.some((r) => ['super_admin', 'support', 'compliance_officer'].includes(r));
  return (
    <>
      <PageHeader title="Utilisateurs" />
      <form className="mb-4 flex max-w-md gap-2"><Input name="q" defaultValue={q} placeholder="Rechercher par nom…" aria-label="Rechercher" /><button className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg">Chercher</button></form>
      <Table head={['Nom', 'Téléphone', 'Rôles métier', 'KYC', 'Statut', 'Inscrit', canSuspend ? 'Action' : '']}>
        {((data ?? []) as P[]).map((p) => <tr key={p.id}><Td className="font-semibold">{p.full_name ?? '—'}<div className="font-mono text-[10px] font-normal text-muted">{p.id}</div></Td><Td>{p.phone ?? '—'}</Td><Td>{[p.is_borrower && 'Emprunteur', p.is_lender && 'Prêteur'].filter(Boolean).join(' / ')}</Td><Td><StatusBadge status={p.kyc_status} /></Td><Td><StatusBadge status={p.status} /></Td><Td>{formatDate(p.created_at)}</Td>
          <Td>{canSuspend && p.id !== s.userId ? <details><summary className="cursor-pointer text-sm font-semibold text-primary">Modifier</summary><ActionForm action={setUserStatus} submit="Appliquer" variant="secondary" className="mt-2 min-w-52"><input type="hidden" name="id" value={p.id} /><Select name="status" aria-label="Statut" defaultValue={p.status}><option value="active">Actif</option><option value="suspended">Suspendu</option><option value="closed">Clos</option></Select><Field label="Motif"><Input name="reason" required /></Field></ActionForm></details> : null}</Td></tr>)}</Table>
    </>
  );
}
