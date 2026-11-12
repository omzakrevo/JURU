import Link from 'next/link';
import { Briefcase, ChevronRight, FileText, HandCoins, Bell, MoreHorizontal, Search } from 'lucide-react';
import { BalanceCard } from '@/components/BalanceCard';
import { formatFcfa } from '@/lib/money';
import { formatDate } from '@/lib/dates';

export interface ActivityItem { id: string; title: string; sub: string; when: string; kind: 'money' | 'alert' | 'info' }
export interface MobileDashboardProps {
  first: string; kycOk: boolean; nextAmt: number; nextDate: string | null; owed: number; lentOut: number;
  requests: number; offers: number; loans: number;
  loan: { no: number; repaid: number; total: number; href: string } | null;
  activity: ActivityItem[];
}

const KIND = { money: 'bg-[#E1F1E7] text-[#14452F]', alert: 'bg-[#FBE5DE] text-[#E5533C]', info: 'bg-[#E0EDFA] text-[#2F6FC9]' } as const;

/** Accueil « application » (téléphone) : carte de solde, actions rondes, progression, activité — calme et aéré. */
export function MobileDashboard({ kycOk, nextAmt, nextDate, owed, lentOut, loan, activity }: MobileDashboardProps) {
  const pct = loan && loan.total > 0 ? Math.min(100, Math.round((loan.repaid / loan.total) * 100)) : 0;
  const actions = [
    { href: '/app/demandes/nouvelle', label: 'Demander', icon: Briefcase }, { href: '/app/offres/nouvelle', label: 'Prêter', icon: HandCoins },
    { href: '/app/marche', label: 'Marché', icon: Search }, { href: '/app/nouveau', label: 'Plus', icon: MoreHorizontal },
  ];
  return (
    <div className="flex flex-col gap-4 lg:hidden">
      <BalanceCard owed={owed} lentOut={lentOut} nextAmt={nextAmt} nextDate={nextDate} />
      {!kycOk && <Link href="/app/kyc" className="flex items-center justify-between rounded-2xl bg-[#FAEFCB] px-4 py-3 text-sm font-extrabold text-[#6B4E00]">Validez votre identité pour démarrer <ChevronRight className="h-4 w-4" /></Link>}
      <div className="grid grid-cols-4 gap-2">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="flex flex-col items-center gap-2 active:scale-95">
            <span className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-border bg-surface shadow-card"><a.icon className="h-6 w-6 text-primary" strokeWidth={2.2} /></span>
            <span className="text-xs font-bold">{a.label}</span>
          </Link>))}
      </div>
      {loan && (
        <Link href={loan.href} className="breathe rounded-3xl border border-border bg-surface p-4 shadow-card active:scale-[.98]">
          <div className="flex items-center justify-between"><span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1F1E7] text-primary"><FileText className="h-5 w-5" /></span><span className="font-extrabold">Crédit n°{loan.no}</span></span><ChevronRight className="h-5 w-5 text-muted" /></div>
          <div className="mt-3 flex items-baseline justify-between text-sm"><span className="font-extrabold">{formatFcfa(loan.repaid)}</span><span className="text-muted">{formatFcfa(loan.total)}</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 text-right text-xs font-bold text-muted">{pct} % remboursé</p>
        </Link>)}
      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-base font-extrabold">Activité récente</h2><Link href="/app/notifications" className="text-xs font-bold text-primary">Tout voir</Link></div>
        {activity.length === 0 ? <p className="rounded-2xl border border-border bg-surface p-4 text-center text-sm text-muted">Rien de nouveau pour l’instant.</p> : (
          <ul className="divide-y divide-border rounded-3xl border border-border bg-surface shadow-card">
            {activity.slice(0, 2).map((x) => (
              <li key={x.id} className="flex items-center gap-3 p-3.5">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${KIND[x.kind]}`}>{x.kind === 'alert' ? <Bell className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{x.title}</span><span className="block truncate text-xs text-muted">{x.sub}</span></span>
                <span className="shrink-0 text-[11px] font-semibold text-muted">{formatDate(x.when)}</span>
              </li>))}
          </ul>)}
      </section>
    </div>
  );
}
