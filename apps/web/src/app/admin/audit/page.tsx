import { EmptyState, PageHeader, Table, Td, Badge } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatDateTime } from '@/lib/dates';

type A = { id: number; actor_id: string | null; actor_role: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string };
export default async function Page({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  const { entity } = await searchParams;
  const { supabase } = await adminPage('audit');
  let q = supabase.from('audit_logs').select('id,actor_id,actor_role,action,entity_type,entity_id,created_at').order('id', { ascending: false }).limit(200);
  if (entity) q = q.eq('entity_type', entity);
  const { data } = await q;
  const rows = (data ?? []) as A[];
  return (
    <>
      <PageHeader title="Journal d’audit" subtitle="Ajout seul : aucune ligne ne peut être modifiée ni supprimée." />
      <form className="mb-4 flex max-w-sm gap-2"><input name="entity" defaultValue={entity} placeholder="Filtrer par entité (ex. loans)" className="input" aria-label="Entité" /><button className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg">Filtrer</button></form>
      {rows.length === 0 ? <EmptyState title="Aucun événement" /> : <Table head={['#', 'Date', 'Acteur', 'Action', 'Entité']}>{rows.map((a) => <tr key={a.id}><Td className="font-mono text-xs">{a.id}</Td><Td>{formatDateTime(a.created_at)}</Td><Td className="text-xs">{a.actor_role ?? 'système'}<div className="font-mono text-[10px] text-muted">{a.actor_id?.slice(0, 8)}</div></Td><Td><Badge>{a.action}</Badge></Td><Td>{a.entity_type}<div className="font-mono text-[10px] text-muted">{a.entity_id?.slice(0, 13)}</div></Td></tr>)}</Table>}
    </>
  );
}
