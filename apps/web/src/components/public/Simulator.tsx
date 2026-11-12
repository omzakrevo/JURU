'use client';
import { useMemo, useState } from 'react';
import { DEFAULT_FEE, DEFAULT_RULES, quoteLoan, validateTerms } from '@/lib/loan';
import { formatBps, formatFcfa } from '@/lib/money';
import { Alert } from '@/components/ui';
import { sliderStyle } from '@/lib/slider';

/** Simulateur public : estimation indicative, calcul identique à celui du serveur. */
export function Simulator({ compact }: { compact?: boolean }) {
  const [amount, setAmount] = useState(100000);
  const [months, setMonths] = useState(6);
  const [rate, setRate] = useState(18);
  const rateBps = Math.round(rate * 100);
  const err = validateTerms(DEFAULT_RULES, amount, months, rateBps);
  const q = useMemo(() => (err ? null : quoteLoan(amount, rateBps, months, DEFAULT_FEE)), [err, amount, rateBps, months]);

  return (
    <div className="card p-4 sm:p-7">
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="space-y-4 max-md:order-2 md:space-y-5">
          <div>
            <div className="flex items-baseline justify-between"><label htmlFor="sim-amount" className="label !mb-0">Montant</label><output className="text-lg font-bold">{formatFcfa(amount)}</output></div>
            <input id="sim-amount" type="range" min={5000} max={500000} step={5000} value={amount} onChange={(e) => setAmount(+e.target.value)} style={sliderStyle(amount, 5000, 500000)} className="mt-2 w-full" />
            <div className="flex justify-between text-xs text-muted"><span>5 000</span><span>500 000</span></div>
          </div>
          <div>
            <div className="flex items-baseline justify-between"><label htmlFor="sim-months" className="label !mb-0">Durée</label><output className="text-lg font-bold">{months} mois</output></div>
            <input id="sim-months" type="range" min={1} max={12} value={months} onChange={(e) => setMonths(+e.target.value)} style={sliderStyle(months, 1, 12)} className="mt-2 w-full" />
          </div>
          <div>
            <div className="flex items-baseline justify-between"><label htmlFor="sim-rate" className="label !mb-0">Taux annuel (exemple)</label><output className="text-lg font-bold">{rate} %</output></div>
            <input id="sim-rate" type="range" min={0} max={24} step={0.5} value={rate} onChange={(e) => setRate(+e.target.value)} style={sliderStyle(rate, 0, 24)} className="mt-2 w-full" />
            <p className="help">Le taux réel est fixé par le prêteur et affiché avant toute acceptation.</p>
          </div>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-[#2B3C9C] to-[#0F1B4C] p-4 text-white max-md:order-1 md:p-5">
          {q ? (
            <>
              <p className="text-sm text-white/70">Mensualité estimée</p>
              <p className="text-3xl font-black text-[#FFD43B] md:text-accent">{formatFcfa(q.monthly_payment)}</p>
              <dl className="mt-3 space-y-1.5 text-sm md:mt-4 md:space-y-2">
                {([['Intérêts', formatFcfa(q.interest_total), false], ['Commission JURU (unique)', formatFcfa(q.fee_total), false], ['Coût total du crédit', formatFcfa(q.total_cost), false],
                  ['Total à rembourser', formatFcfa(q.total_repayable), true], ['Net reçu', formatFcfa(q.net_disbursed), true], ['TAEG indicatif', formatBps(q.effective_annual_rate_bps), false]] as const).map(([k, v, desktopOnly]) => (
                  <div key={k} className={`flex justify-between gap-3 border-b border-white/10 pb-1 md:pb-1.5 ${desktopOnly ? 'max-md:hidden' : ''}`}><dt className="text-white/70">{k}</dt><dd className="font-semibold">{v}</dd></div>
                ))}
              </dl>
            </>
          ) : <Alert tone="warning">{err}</Alert>}
        </div>
      </div>
      {!compact && q && (
        <details className="mt-5 rounded-xl border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold">Voir l’échéancier</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm"><thead className="text-left text-xs uppercase text-muted"><tr><th className="py-1">N°</th><th>Capital</th><th>Intérêts</th><th className="text-right">Échéance</th></tr></thead>
              <tbody>{q.installments.map((i) => <tr key={i.no} className="border-t border-border"><td className="py-1.5">{i.no}</td><td>{formatFcfa(i.principal)}</td><td>{formatFcfa(i.interest)}</td><td className="text-right font-semibold">{formatFcfa(i.total)}</td></tr>)}</tbody></table>
          </div>
        </details>
      )}
      <p className="mt-4 text-xs text-muted">Estimation indicative, non contractuelle. Aucune commission cachée : le coût total est présenté avant toute acceptation.</p>
    </div>
  );
}
