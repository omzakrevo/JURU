import { Bell } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/dates';
import { markNotificationsRead } from '@/app/actions/app';
import type { Notification } from '@/types';

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from('notifications').select('*').eq('channel', 'in_app').order('created_at', { ascending: false }).limit(100);
  const rows = (data ?? []) as Notification[];
  return (
    <>
      <PageHeader title="Notifications" actions={rows.some((n) => !n.read_at) ? <form action={markNotificationsRead}><button className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Tout marquer comme lu</button></form> : undefined} />
      {rows.length === 0 ? <EmptyState icon={<Bell className="h-6 w-6" />} title="Aucune notification" /> : (
        <Card className="divide-y divide-border !p-0">{rows.map((n) => <div key={n.id} className="flex gap-3 p-4">{!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Non lue" />}<div><p className={`text-sm ${n.read_at ? '' : 'font-semibold'}`}>{n.title}</p><p className="text-sm text-muted">{n.body}</p><p className="mt-1 text-xs text-muted">{formatDateTime(n.created_at)}</p></div></div>)}</Card>)}
    </>
  );
}
