import { ActionForm } from '@/components/ActionForm';
import { Card, EmptyState, Field, PageHeader, Select, StatusBadge, Textarea } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatDateTime } from '@/lib/dates';
import { updateDispute } from '@/app/actions/admin';

type D = { id: string; loan_id: string; category: string; description: string; status: string; resolution: string | null; created_at: string };
export default async function Page() {
  const { supabase } = await adminPage('litiges');
  const { data } = await supabase.from('disputes').select('*').order('created_at', { ascending: false }).limit(100);
  const rows = (data ?? []) as D[];
  return (
    <>
      <PageHeader title="Litiges" />
      {rows.length === 0 ? <EmptyState title="Aucun litige" /> : <div className="space-y-4">{rows.map((d) => (
        <Card key={d.id}><div className="flex justify-between"><p className="font-semibold">{d.category}</p><StatusBadge status={d.status === 'open' ? 'open_dispute' : d.status} /></div><p className="mt-1 text-sm">{d.description}</p><p className="text-xs text-muted">{formatDateTime(d.created_at)}</p>
          {!['resolved', 'rejected'].includes(d.status) && <ActionForm action={updateDispute} submit="Mettre à jour" variant="outline" className="mt-3"><input type="hidden" name="id" value={d.id} />
            <Field label="Statut"><Select name="status"><option value="investigating">En instruction</option><option value="escalated">Escaladé</option><option value="resolved">Résolu</option><option value="rejected">Rejeté</option></Select></Field>
            <Field label="Réponse / résolution (obligatoire pour clore)"><Textarea name="resolution" /></Field></ActionForm>}
          {d.resolution && <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm">{d.resolution}</p>}</Card>))}</div>}
    </>
  );
}
