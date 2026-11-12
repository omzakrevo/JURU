import { Send } from 'lucide-react';
import { ApplicationCard } from '@/components/ApplicationCard';
import { Card, EmptyState, PageHeader } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { withdrawApplication } from '@/app/actions/app';
import type { Application } from '@/types';

export default async function Page() {
  const s = await requireSession();
  const supabase = await createClient();
  const [{ data }, { data: cards }, { data: contracts }] = await Promise.all([
    supabase.from('loan_applications').select('*').order('created_at', { ascending: false }),
    supabase.from('counterparty_cards').select('id,display_name'),
    supabase.from('loan_contracts').select('id,application_id,status'),
  ]);
  const apps = (data ?? []) as Application[];
  const name = (uid: string) => cards?.find((c: { id: string; display_name: string }) => c.id === uid)?.display_name;
  const contractOf = (id: string) => contracts?.find((c: { application_id: string }) => c.application_id === id) as { id: string; status: string } | undefined;
  const received = apps.filter((a) => a.borrower_id === s.userId);
  const sent = apps.filter((a) => a.lender_id === s.userId);
  return (
    <>
      <PageHeader title="Propositions" subtitle="Comparez, acceptez en connaissance du coût total, puis signez le contrat." />
      {apps.length === 0 && <EmptyState icon={<Send className="h-6 w-6" />} title="Aucune proposition" text="Les propositions reçues ou envoyées apparaîtront ici." />}
      {received.length > 0 && <section className="mb-8 space-y-4"><h2 className="font-semibold">Reçues</h2>{received.map((a) => <div key={a.id}><ApplicationCard a={a} lenderName={name(a.lender_id)} canRespond />{contractOf(a.id) && <a className="mt-2 inline-block text-sm font-semibold text-primary" href={`/app/contrats/${contractOf(a.id)!.id}`}>→ Voir le contrat</a>}</div>)}</section>}
      {sent.length > 0 && <section className="space-y-4"><h2 className="font-semibold">Envoyées</h2>{sent.map((a) => <div key={a.id}><ApplicationCard a={a} lenderName="Ma proposition" canRespond={false} />
        <div className="mt-2 flex gap-4 text-sm">{a.status === 'proposed' && <form action={withdrawApplication}><input type="hidden" name="id" value={a.id} /><button className="font-semibold text-danger">Retirer</button></form>}
          {contractOf(a.id) && <a className="font-semibold text-primary" href={`/app/contrats/${contractOf(a.id)!.id}`}>→ Voir le contrat</a>}</div></div>)}</section>}
      <Card className="mt-8 text-xs text-muted">Un prêteur ne peut pas financer sa propre demande. Une proposition expire après 7 jours.</Card>
    </>
  );
}
