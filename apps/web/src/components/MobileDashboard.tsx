import Link from 'next/link';
import { Briefcase, FileText, HandCoins, Search } from 'lucide-react';
import { formatFcfa } from '@/lib/money';
import { formatCalendarDate } from '@/lib/dates';

export interface MobileDashboardProps {
  first: string; kycOk: boolean; nextAmt: number; nextDate: string | null; owed: number; lentOut: number;
  requests: number; offers: number; loans: number;
}

/** Accueil « application » (téléphone) : tout tient sur un écran, tuiles carrées + cartes à faire glisser. */
export function MobileDashboard({ first, kycOk, nextAmt, nextDate, owed, lentOut, requests, offers, loans }: MobileDashboardProps) {
  const sq = 'tile aspect-square [@media(max-height:760px)]:aspect-[4/3]';
  return (
    <div className="flex flex-col gap-5 pt-1 lg:hidden">
        <div className="flex items-center justify-between">
          <p className="text-lg font-extrabold">Bonjour{first ? `, ${first}` : ''} 👋</p>
          <Link href="/app/kyc" className={`rounded-full px-3 py-1 text-xs font-extrabold ${kycOk ? 'bg-success/15 text-success' : 'bg-sun text-night'}`}>{kycOk ? '✓ Identité validée' : 'Valider mon identité'}</Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4" aria-label="Résumé (faites glisser)">
          <Link href="/app/credits" className="tile tile-green breathe h-36 w-[80%] shrink-0 snap-center">
            <span className="text-sm font-bold opacity-80">Prochaine échéance</span>
            <span><span className="block text-3xl font-black leading-none">{nextDate ? formatFcfa(nextAmt) : '—'}</span><span className="mt-1 block text-xs font-bold opacity-80">{nextDate ? `le ${formatCalendarDate(nextDate)}` : 'Aucune échéance'}</span></span>
          </Link>
          <Link href="/app/credits" className="tile tile-night h-36 w-[80%] shrink-0 snap-center">
            <span className="text-sm font-bold opacity-80">Capital que je dois</span>
            <span className="text-3xl font-black leading-none">{formatFcfa(owed)}</span>
          </Link>
          <Link href="/app/credits" className="tile tile-violet h-36 w-[80%] shrink-0 snap-center">
            <span className="text-sm font-bold opacity-80">Capital prêté en cours</span>
            <span className="text-3xl font-black leading-none">{formatFcfa(lentOut)}</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/app/demandes/nouvelle" className={`${sq} tile-coral`}><Briefcase className="h-9 w-9" strokeWidth={2.2} /><span><span className="block text-xl font-extrabold leading-tight">Demander</span><span className="text-xs font-bold opacity-85">{requests} en cours</span></span></Link>
          <Link href="/app/offres/nouvelle" className={`${sq} tile-sun`}><HandCoins className="h-9 w-9" strokeWidth={2.2} /><span><span className="block text-xl font-extrabold leading-tight">Prêter</span><span className="text-xs font-bold opacity-85">{offers} offre(s)</span></span></Link>
          <Link href="/app/marche" className={`${sq} tile-sky`}><Search className="h-9 w-9" strokeWidth={2.2} /><span><span className="block text-xl font-extrabold leading-tight">Marché</span><span className="text-xs font-bold opacity-85">Glissez, choisissez</span></span></Link>
          <Link href="/app/credits" className={`${sq} tile-green`}><FileText className="h-9 w-9" strokeWidth={2.2} /><span><span className="block text-xl font-extrabold leading-tight">Crédits</span><span className="text-xs font-bold opacity-85">{loans} actif(s)</span></span></Link>
        </div>
          </div>
  );
}
