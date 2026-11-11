import Link from 'next/link';
import { ArrowRight, FileText, HandCoins, Briefcase, Wallet } from 'lucide-react';
import { ButtonLink, Card, EmptyState, PageHeader, Stat, StatusBadge } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatCalendarDate } from '@/lib/dates';
import { formatFcfa } from '@/lib/money';
import type { Loan, ScheduleRow } from '@/types';

export default async function Page() {
  const s = await requireSession();
  const supabase = await createClient();
  const [{ data: loans }, { data: reqs }, { data: offers }, { data: notifs }] = await Promise.all([
    supabase.from('loans').select('*').in('status', ['active', 'overdue', 'awaiting_disbursement']),
    supabase.from('loan_requests').select('id,amount,status').eq('borrower_id', s.userId).in('status', ['open', 'pending_review', 'in_negotiation', 'accepted']),
    supabase.from('funding_offers').select('id,amount_available,status').eq('lender_id', s.userId).in('status', ['active', 'pending_review']),
    supabase.from('notifications').select('id,title,body,created_at,read_at').eq('channel', 'in_app').order('created_at', { ascending: false }).limit(4),
  ]);
  const ls = (loans ?? []) as Loan[];
  const ids = ls.map((l) => l.id);
  const { data: sched } = ids.length
    ? await supabase.from('repayment_schedules').select('*').in('loan_id', ids).neq('status', 'paid').order('due_date').limit(50)
    : { data: [] };
  const rows = (sched ?? []) as ScheduleRow[];
  const borrowed = ls.filter((l) => l.borrower_id === s.userId);
  const lent = ls.filter((l) => l.lender_id === s.userId);
  const nextDue = rows.find((r) => borrowed.some((l) => l.id === r.loan_id));
  const owed = rows.filter((r) => borrowed.some((l) => l.id === r.loan_id)).reduce((a, r) => a + r.principal_due - r.principal_paid, 0);
  const lentOut = rows.filter((r) => lent.some((l) => l.id === r.loan_id)).reduce((a, r) => a + r.principal_due - r.principal_paid, 0);

  return (
    <>
      <PageHeader title={`Bonjour${s.profile.full_name ? ', ' + s.profile.full_name.split(' ')[0] : ''} 👋`} subtitle="Voici l’essentiel de votre activité."
        actions={<>{s.profile.is_borrower && <ButtonLink href="/app/demandes/nouvelle" size="sm">Nouvelle demande</ButtonLink>}{s.profile.is_lender && <ButtonLink href="/app/offres/nouvelle" size="sm" variant="outline">Nouvelle offre</ButtonLink>}</>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Capital que je dois" value={formatFcfa(owed)} icon={<Wallet className="h-4 w-4" />} hint={nextDue ? `Prochaine échéance : ${formatCalendarDate(nextDue.due_date)}` : 'Aucune échéance'} />
        <Stat label="Capital prêté en cours" value={formatFcfa(lentOut)} icon={<HandCoins className="h-4 w-4" />} />
        <Stat label="Demandes actives" value={reqs?.length ?? 0} icon={<Briefcase className="h-4 w-4" />} />
        <Stat label="Offres actives" value={offers?.length ?? 0} icon={<FileText className="h-4 w-4" />} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Mes crédits</h2><Link href="/app/credits" className="text-sm font-semibold text-primary">Tout voir</Link></div>
          {ls.length === 0 ? <EmptyState title="Aucun crédit en cours" text="Vos crédits apparaîtront ici après signature du contrat." /> : (
            <div className="space-y-3">{ls.slice(0, 4).map((l) => (
              <Link key={l.id} href={`/app/credits/${l.id}`}><Card className="flex items-center justify-between !p-4 transition hover:shadow-pop">
                <div><p className="font-semibold">Crédit n°{l.loan_no} · {formatFcfa(l.principal)}</p><p className="text-xs text-muted">{l.borrower_id === s.userId ? 'Emprunteur' : 'Prêteur'}</p></div>
                <div className="flex items-center gap-2"><StatusBadge status={l.status} /><ArrowRight className="h-4 w-4 text-muted" /></div></Card></Link>))}</div>)}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Notifications récentes</h2><Link href="/app/notifications" className="text-sm font-semibold text-primary">Tout voir</Link></div>
          {(notifs ?? []).length === 0 ? <EmptyState title="Rien de nouveau" /> : (
            <Card className="divide-y divide-border !p-0">{(notifs ?? []).map((n: { id: string; title: string; body: string; read_at: string | null }) => (
              <div key={n.id} className="p-4"><p className={`text-sm ${n.read_at ? '' : 'font-semibold'}`}>{n.title}</p><p className="text-xs text-muted">{n.body}</p></div>))}</Card>)}
        </section>
      </div>
    </>
  );
}
