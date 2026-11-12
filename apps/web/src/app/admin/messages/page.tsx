import { ActionForm } from '@/components/ActionForm';
import { Card, EmptyState, PageHeader, Select, StatusBadge } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatDateTime } from '@/lib/dates';
import { setContactStatus } from '@/app/actions/admin';

type M = { id: string; name: string; email: string | null; phone: string | null; subject: string; message: string; status: string; created_at: string };
export default async function Page() {
  const { supabase } = await adminPage('messages');
  const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
  const rows = (data ?? []) as M[];
  return (
    <>
      <PageHeader title="Messages de contact" />
      {rows.length === 0 ? <EmptyState title="Aucun message" /> : <div className="space-y-3">{rows.map((m) => <Card key={m.id} className="!p-4"><div className="flex justify-between"><p className="font-semibold">{m.subject}</p><StatusBadge status={m.status === 'new' ? 'pending' : m.status === 'done' ? 'resolved' : 'investigating'} /></div>
        <p className="text-sm text-muted">{m.name} · {m.email ?? ''} {m.phone ?? ''} · {formatDateTime(m.created_at)}</p><p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
        <ActionForm action={setContactStatus} submit="Changer" variant="outline" className="mt-3 flex items-end gap-2 !space-y-0"><input type="hidden" name="id" value={m.id} /><Select name="status" defaultValue={m.status} aria-label="Statut" className="max-w-40"><option value="new">Nouveau</option><option value="in_progress">En cours</option><option value="done">Traité</option><option value="spam">Spam</option></Select></ActionForm></Card>)}</div>}
    </>
  );
}
