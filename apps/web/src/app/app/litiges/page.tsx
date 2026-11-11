import { LifeBuoy } from 'lucide-react';
import { Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/dates';

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from('disputes').select('id,category,description,status,resolution,created_at').order('created_at', { ascending: false });
  return (
    <>
      <PageHeader title="Mes litiges" subtitle="Pour ouvrir un litige, rendez-vous sur la page du crédit concerné." />
      {(data ?? []).length === 0 ? <EmptyState icon={<LifeBuoy className="h-6 w-6" />} title="Aucun litige" /> : (
        <div className="space-y-3">{(data as { id: string; category: string; description: string; status: string; resolution: string | null; created_at: string }[]).map((d) => <Card key={d.id} className="!p-4"><div className="flex justify-between"><p className="font-semibold">{d.category}</p><StatusBadge status={d.status === 'open' ? 'open_dispute' : d.status} /></div>
          <p className="mt-1 text-sm">{d.description}</p>{d.resolution && <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm">Réponse : {d.resolution}</p>}<p className="mt-1 text-xs text-muted">{formatDateTime(d.created_at)}</p></Card>)}</div>)}
    </>
  );
}
