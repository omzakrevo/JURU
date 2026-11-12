'use client';
import { useState } from 'react';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { formatCalendarDate } from '@/lib/dates';
import { formatFcfa } from '@/lib/money';

/** Carte de solde vert profond (inspiration fintech) : le montant peut être masqué. */
export function BalanceCard({ owed, lentOut, nextAmt, nextDate }: { owed: number; lentOut: number; nextAmt: number; nextDate: string | null }) {
  const [show, setShow] = useState(true);
  const hide = (v: string) => (show ? v : '••••••');
  return (
    <div className="relative overflow-hidden rounded-[30px] bg-[#14452F] p-5 text-white shadow-[0_22px_40px_-20px_rgb(15_51_36/.9)]">
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-white/75">Capital à rembourser
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Masquer les montants' : 'Afficher les montants'} className="rounded-full p-1 hover:bg-white/10">{show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button></p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><TrendingUp className="h-[18px] w-[18px]" /></span>
      </div>
      <p className="relative mt-2 text-[38px] font-semibold leading-none tracking-tight">{hide(formatFcfa(owed))}</p>
      <div className="relative mt-5 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-white/15 px-3 py-1.5">{nextDate ? `Prochaine échéance ${hide(formatFcfa(nextAmt))} · ${formatCalendarDate(nextDate)}` : 'Aucune échéance à venir'}</span>
        {lentOut > 0 && <span className="rounded-full bg-[#BFE8CF] px-3 py-1.5 text-[#0F3324]">Prêté {hide(formatFcfa(lentOut))}</span>}
      </div>
    </div>
  );
}
