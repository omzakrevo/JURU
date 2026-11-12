'use client';
import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { Alert } from '@/components/ui';
import { DEFAULT_FEE, DEFAULT_RULES, quoteLoan, validateTerms } from '@/lib/loan';
import { formatBps, formatFcfa } from '@/lib/money';
import { GUARANTEE_LABELS, PURPOSES } from '@/lib/constants';
import { createLoanRequest } from '@/app/actions/app';
import { sliderStyle } from '@/lib/slider';

const EMOJI: Record<string, string> = { commerce: '🛒', agriculture: '🌾', education: '🎓', health: '🩺', housing: '🏠', equipment: '🛠️', emergency: '🚨', transport: '🚚', other: '✨' };
const COLORS = ['tile-coral', 'tile-sun', 'tile-sky', 'tile-violet', 'tile-green', 'tile-coral', 'tile-sky', 'tile-sun', 'tile-violet'];
const num = (s: string) => parseInt(s.replace(/[^\d]/g, ''), 10);
const STEPS = ['Montant', 'Durée', 'Motif', 'Revenus', 'Taux', 'Garantie', 'Récap'];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-base font-black text-[#08281A] shadow-[0_8px_20px_-10px_rgb(47_191_113/.9)] active:scale-95 disabled:opacity-60">
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" strokeWidth={3} />}{pending ? 'Envoi…' : 'Publier ma demande'}
    </button>
  );
}

const Tile = ({ on, children, cls, onClick, label }: { on: boolean; children: React.ReactNode; cls: string; onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick} aria-pressed={on} aria-label={label} className={clsx('tile items-center justify-center text-center transition', cls, on ? 'ring-4 ring-night scale-[1.03] shadow-pop' : '')}>{children}{on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-night text-white"><Check className="h-3 w-3" strokeWidth={4} /></span>}</button>
);

export function LoanWizard() {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(100000);
  const [months, setMonths] = useState(6);
  const [purpose, setPurpose] = useState('commerce');
  const [income, setIncome] = useState('');
  const [exp, setExp] = useState('');
  const [debt, setDebt] = useState('0');
  const [rate, setRate] = useState(18);
  const [g, setG] = useState('none');
  const [gDesc, setGDesc] = useState('');
  const [gVal, setGVal] = useState('');
  const [details, setDetails] = useState('');
  const err = validateTerms(DEFAULT_RULES, amount, months, Math.round(rate * 100));
  const q = useMemo(() => (err ? null : quoteLoan(amount, Math.round(rate * 100), months, DEFAULT_FEE)), [err, amount, months, rate]);
  const cap = num(income) - num(exp) - (num(debt) || 0);
  const last = step === STEPS.length - 1;
  const canNext = step === 3 ? Number.isFinite(num(income)) && Number.isFinite(num(exp)) && cap > 0 : step === 5 ? g === 'none' || gDesc.trim().length > 1 : true;

  return (
    <ActionForm action={createLoanRequest} submit="" hideSubmit className="flex min-h-full flex-1 flex-col !space-y-0">
      {/* champs réellement envoyés (toutes les étapes) */}
      <input type="hidden" name="amount" value={amount} /><input type="hidden" name="duration" value={months} /><input type="hidden" name="purpose" value={purpose} />
      <input type="hidden" name="income" value={num(income) || 0} /><input type="hidden" name="expenses" value={num(exp) || 0} /><input type="hidden" name="debt" value={num(debt) || 0} />
      <input type="hidden" name="max_rate" value={rate} /><input type="hidden" name="guarantee_type" value={g} /><input type="hidden" name="guarantee_desc" value={gDesc} />
      <input type="hidden" name="guarantee_value" value={gVal} /><input type="hidden" name="details" value={details} />

      <div className="mb-3 flex gap-1" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
        {STEPS.map((s, i) => <div key={s} className={clsx('h-1.5 flex-1 rounded-full transition-all', i <= step ? 'bg-primary' : 'bg-border')} />)}
      </div>
      <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted">{step + 1}/{STEPS.length} · {STEPS[step]}</p>

      <div className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter' && !last) e.preventDefault(); }}>
        {step === 0 && (
          <div className="flex h-full flex-col justify-center gap-5 text-center">
            <h2 className="text-xl font-extrabold">De combien avez-vous besoin ?</h2>
            <p className="text-5xl font-black tracking-tight text-primary">{formatFcfa(amount)}</p>
            <input type="range" aria-label="Montant" min={5000} max={500000} step={5000} value={amount} onChange={(e) => setAmount(+e.target.value)} style={sliderStyle(amount, 5000, 500000)} className="w-full" />
            <div className="grid grid-cols-4 gap-2">{[20000, 50000, 100000, 200000].map((v) => <button key={v} type="button" onClick={() => setAmount(v)} className={clsx('rounded-2xl py-3 text-sm font-extrabold', amount === v ? 'bg-night text-white' : 'bg-surface-2')}>{v / 1000}k</button>)}</div>
          </div>)}
        {step === 1 && (
          <div className="flex h-full flex-col justify-center gap-4">
            <h2 className="text-center text-xl font-extrabold">Sur combien de mois ?</h2>
            <div className="grid grid-cols-4 gap-2.5">{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <Tile key={m} on={months === m} cls={COLORS[m % COLORS.length]!} onClick={() => setMonths(m)} label={`${m} mois`}><span className="aspect-square flex items-center justify-center text-2xl font-black">{m}</span></Tile>)}</div>
            <p className="text-center text-sm font-bold text-muted">{months} mois</p>
          </div>)}
        {step === 2 && (
          <div className="flex h-full flex-col justify-center gap-4">
            <h2 className="text-center text-xl font-extrabold">C’est pour quoi ?</h2>
            <div className="grid grid-cols-3 gap-2.5">{Object.entries(PURPOSES).map(([k, v], i) => <Tile key={k} on={purpose === k} cls={COLORS[i]!} onClick={() => setPurpose(k)} label={v}><span className="flex aspect-square flex-col items-center justify-center gap-1"><span className="text-3xl">{EMOJI[k]}</span><span className="text-xs font-extrabold leading-tight">{v}</span></span></Tile>)}</div>
            <input value={details} onChange={(e) => setDetails(e.target.value)} maxLength={300} placeholder="Un mot sur votre projet (facultatif)" aria-label="Description" className="input" />
          </div>)}
        {step === 3 && (
          <div className="flex h-full flex-col justify-center gap-3">
            <h2 className="text-center text-xl font-extrabold">Vos revenus et charges</h2>
            {([['Revenus par mois', income, setIncome], ['Charges par mois', exp, setExp], ['Autres remboursements / mois', debt, setDebt]] as const).map(([l, v, set]) => (
              <label key={l} className="block"><span className="label">{l}</span><input inputMode="numeric" value={v} onChange={(e) => set(e.target.value)} className="input text-lg font-bold" placeholder="0 FCFA" /></label>))}
            {income && exp && <div className={clsx('rounded-2xl p-3 text-center text-sm font-bold', cap > 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>Capacité estimée : {formatFcfa(cap)} / mois{cap <= 0 ? ' — insuffisante' : ''}</div>}
          </div>)}
        {step === 4 && (
          <div className="flex h-full flex-col justify-center gap-5 text-center">
            <h2 className="text-xl font-extrabold">Taux annuel maximum accepté</h2>
            <p className="text-5xl font-black text-primary">{rate} %</p>
            <input type="range" aria-label="Taux maximum" min={0} max={24} step={0.5} value={rate} onChange={(e) => setRate(+e.target.value)} style={sliderStyle(rate, 0, 24)} className="w-full" />
            {q && <p className="rounded-2xl bg-surface-2 p-3 text-sm font-bold">Au maximum : <span className="text-primary">{formatFcfa(q.monthly_payment)}</span> / mois{cap > 0 && ` (${Math.round((q.monthly_payment / cap) * 100)} % de votre capacité)`}</p>}
            <p className="text-xs text-muted">Les prêteurs ne peuvent pas dépasser ce taux. Le taux réel vous est montré avant d’accepter.</p>
          </div>)}
        {step === 5 && (
          <div className="flex h-full flex-col justify-center gap-3">
            <h2 className="text-center text-xl font-extrabold">Une garantie ? <span className="text-sm font-semibold text-muted">(facultatif)</span></h2>
            <div className="grid grid-cols-2 gap-2.5">{Object.entries(GUARANTEE_LABELS).map(([k, v], i) => <Tile key={k} on={g === k} cls={COLORS[i + 1]!} onClick={() => setG(k)} label={v}><span className="py-5 text-base font-extrabold">{v}</span></Tile>)}</div>
            {g !== 'none' && <>
              <input value={gDesc} onChange={(e) => setGDesc(e.target.value)} placeholder="Décrivez la garantie" aria-label="Description de la garantie" className="input" />
              <input value={gVal} onChange={(e) => setGVal(e.target.value)} inputMode="numeric" placeholder="Valeur estimée (FCFA)" aria-label="Valeur estimée" className="input" />
              {g === 'guarantor' && <><input name="guarantor_name" placeholder="Nom du garant" aria-label="Nom du garant" className="input" /><input name="guarantor_phone" inputMode="tel" placeholder="Téléphone du garant" aria-label="Téléphone du garant" className="input" /></>}
            </>}
          </div>)}
        {step === 6 && (
          <div className="flex h-full flex-col justify-center gap-3">
            <h2 className="text-center text-xl font-extrabold">Tout est bon ?</h2>
            <div className="tile tile-night gap-2 !justify-start">
              <p className="text-3xl font-black">{formatFcfa(amount)}</p>
              <p className="text-sm font-bold opacity-80">{months} mois · {EMOJI[purpose]} {PURPOSES[purpose]} · taux max {formatBps(Math.round(rate * 100))}</p>
              {q && <dl className="mt-1 space-y-1 text-sm font-semibold"><div className="flex justify-between"><dt className="opacity-70">Mensualité max.</dt><dd>{formatFcfa(q.monthly_payment)}</dd></div><div className="flex justify-between"><dt className="opacity-70">Coût total max.</dt><dd>{formatFcfa(q.total_cost)}</dd></div><div className="flex justify-between"><dt className="opacity-70">TAEG max.</dt><dd>{formatBps(q.effective_annual_rate_bps)}</dd></div></dl>}
            </div>
            <p className="text-center text-xs text-muted">Aucune commission cachée. Validation automatique puis, si besoin, examen humain.</p>
            {err && <Alert tone="warning">{err}</Alert>}
          </div>)}
      </div>

      <div className="mt-4 flex gap-3 pb-1">
        {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-surface-2 py-3.5 text-sm font-extrabold active:scale-95"><ArrowLeft className="h-4 w-4" />Retour</button>}
        {!last ? <button type="button" disabled={!canNext || (step === 0 && Boolean(err))} onClick={() => setStep(step + 1)} className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-black text-primary-fg shadow-[0_8px_20px_-10px_rgb(20_69_47/.8)] active:scale-95 disabled:opacity-40">{step === 5 && g === 'none' ? 'Passer' : 'Continuer'}<ArrowRight className="h-5 w-5" strokeWidth={3} /></button> : <Submit />}
      </div>
    </ActionForm>
  );
}
