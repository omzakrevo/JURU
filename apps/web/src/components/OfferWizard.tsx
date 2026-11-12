'use client';
import { useState } from 'react';
import { Alert } from '@/components/ui';
import { ActionForm } from '@/components/ActionForm';
import { COLORS, EMOJI, Tile, WizardFrame } from '@/components/wizard';
import { GUARANTEE_LABELS, PURPOSES } from '@/lib/constants';
import { formatBps, formatFcfa } from '@/lib/money';
import { sliderStyle } from '@/lib/slider';
import { createOffer } from '@/app/actions/app';

const LABELS = ['Montant', 'Par prêt', 'Durée', 'Taux', 'Motifs', 'Conditions', 'Récap'];

function Range({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; fmt: (n: number) => string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between"><span className="text-sm font-bold text-muted">{label}</span><span className="text-xl font-black text-primary">{fmt(value)}</span></div>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} style={sliderStyle(value, min, max)} className="mt-2 w-full" />
    </div>
  );
}

/** Publication d'une offre de financement — parcours étape par étape (téléphone). */
export function OfferWizard() {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(300000);
  const [minL, setMinL] = useState(10000);
  const [maxL, setMaxL] = useState(150000);
  const [minD, setMinD] = useState(1);
  const [maxD, setMaxD] = useState(6);
  const [rate, setRate] = useState(15);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [guarantee, setGuarantee] = useState(false);
  const [title, setTitle] = useState('');
  const effTitle = title.trim().length >= 3 ? title.trim() : `Offre ${Math.round(amount / 1000)}k · ${minD}-${maxD} mois`;
  const canNext = step === 0 ? amount >= minL : true;
  const toggle = (k: string) => setPurposes((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <ActionForm action={createOffer} submit="" hideSubmit className="flex min-h-full flex-1 flex-col !space-y-0">
      <input type="hidden" name="title" value={effTitle} /><input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="min_amount" value={minL} /><input type="hidden" name="max_amount" value={maxL} />
      <input type="hidden" name="min_duration" value={minD} /><input type="hidden" name="max_duration" value={maxD} /><input type="hidden" name="rate" value={rate} />
      {purposes.map((p) => <input key={p} type="hidden" name="purposes" value={p} />)}
      {guarantee && <input type="hidden" name="requires_guarantee" value="on" />}
      <WizardFrame labels={LABELS} step={step} setStep={setStep} canNext={canNext} submitLabel="Publier mon offre">
        {step === 0 && (
          <div className="flex h-full flex-col justify-center gap-5 text-center">
            <h2 className="text-xl font-extrabold">Combien voulez-vous mettre à disposition ?</h2>
            <p className="text-5xl font-black tracking-tight text-primary">{formatFcfa(amount)}</p>
            <input type="range" aria-label="Montant disponible" min={20000} max={2000000} step={10000} value={amount} onChange={(e) => setAmount(+e.target.value)} style={sliderStyle(amount, 20000, 2000000)} className="w-full" />
            <div className="grid grid-cols-4 gap-2">{[100000, 300000, 500000, 1000000].map((v) => <button key={v} type="button" onClick={() => setAmount(v)} className={`rounded-2xl py-3 text-sm font-extrabold ${amount === v ? 'bg-night text-white' : 'bg-surface-2'}`}>{v >= 1000000 ? '1M' : `${v / 1000}k`}</button>)}</div>
            <p className="text-xs text-muted">Prêter comporte un risque de perte en capital. Ne mettez que ce que vous pouvez vous permettre de perdre.</p>
          </div>)}
        {step === 1 && (
          <div className="flex h-full flex-col justify-center gap-7">
            <h2 className="text-center text-xl font-extrabold">Montant de chaque prêt</h2>
            <Range label="Au minimum" value={minL} min={5000} max={Math.min(500000, amount)} step={5000} onChange={(n) => { setMinL(n); if (maxL < n) setMaxL(n); }} fmt={formatFcfa} />
            <Range label="Au maximum" value={maxL} min={5000} max={500000} step={5000} onChange={(n) => { setMaxL(n); if (minL > n) setMinL(n); }} fmt={formatFcfa} />
            <p className="text-center text-xs text-muted">Entre 5 000 et 500 000 FCFA par prêt.</p>
          </div>)}
        {step === 2 && (
          <div className="flex h-full flex-col justify-center gap-7">
            <h2 className="text-center text-xl font-extrabold">Durée des prêts</h2>
            <Range label="Au moins" value={minD} min={1} max={12} step={1} onChange={(n) => { setMinD(n); if (maxD < n) setMaxD(n); }} fmt={(n) => `${n} mois`} />
            <Range label="Au plus" value={maxD} min={1} max={12} step={1} onChange={(n) => { setMaxD(n); if (minD > n) setMinD(n); }} fmt={(n) => `${n} mois`} />
          </div>)}
        {step === 3 && (
          <div className="flex h-full flex-col justify-center gap-5 text-center">
            <h2 className="text-xl font-extrabold">Votre taux annuel</h2>
            <p className="text-5xl font-black text-primary">{rate} %</p>
            <input type="range" aria-label="Taux annuel" min={0} max={24} step={0.5} value={rate} onChange={(e) => setRate(+e.target.value)} style={sliderStyle(rate, 0, 24)} className="w-full" />
            <p className="rounded-2xl bg-surface-2 p-3 text-xs font-semibold text-muted">Plafond de démonstration : 24 % par an (à valider juridiquement). La commission JURU est payée par l’emprunteur, une seule fois.</p>
          </div>)}
        {step === 4 && (
          <div className="flex h-full flex-col justify-center gap-4">
            <h2 className="text-center text-xl font-extrabold">Quels projets financez-vous ?</h2>
            <div className="grid grid-cols-3 gap-2.5">{Object.entries(PURPOSES).map(([k, v], i) => <Tile key={k} on={purposes.includes(k)} cls={COLORS[i]!} onClick={() => toggle(k)} label={v}><span className="flex aspect-square flex-col items-center justify-center gap-1"><span className="text-3xl">{EMOJI[k]}</span><span className="text-xs font-extrabold leading-tight">{v}</span></span></Tile>)}</div>
            <p className="text-center text-xs font-semibold text-muted">{purposes.length === 0 ? 'Aucun choix = tous les motifs acceptés' : `${purposes.length} motif(s) choisi(s)`}</p>
          </div>)}
        {step === 5 && (
          <div className="flex h-full flex-col justify-center gap-4">
            <h2 className="text-center text-xl font-extrabold">Vos conditions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Tile on={!guarantee} cls="tile-green" onClick={() => setGuarantee(false)} label="Garantie non exigée"><span className="py-4 text-base font-extrabold">Sans garantie</span></Tile>
              <Tile on={guarantee} cls="tile-sun" onClick={() => setGuarantee(true)} label="Garantie exigée"><span className="py-4 text-base font-extrabold">Garantie exigée<span className="mt-1 block text-[11px] font-semibold opacity-70">{Object.values(GUARANTEE_LABELS).slice(1).join(' · ')}</span></span></Tile>
            </div>
            <label className="block"><span className="label">Nom de l’offre</span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={effTitle} className="input font-bold" /></label>
          </div>)}
        {step === 6 && (
          <div className="flex h-full flex-col justify-center gap-3">
            <h2 className="text-center text-xl font-extrabold">Tout est bon ?</h2>
            <div className="tile tile-night gap-2 !justify-start">
              <p className="text-sm font-bold opacity-80">{effTitle}</p>
              <p className="text-3xl font-black">{formatFcfa(amount)}</p>
              <dl className="mt-1 space-y-1 text-sm font-semibold">
                {[['Par prêt', `${formatFcfa(minL)} – ${formatFcfa(maxL)}`], ['Durée', `${minD} – ${maxD} mois`], ['Taux annuel', formatBps(Math.round(rate * 100))], ['Motifs', purposes.length ? purposes.map((p) => PURPOSES[p]).join(', ') : 'Tous'], ['Garantie', guarantee ? 'Exigée' : 'Non exigée']].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="opacity-70">{k}</dt><dd className="text-right">{v}</dd></div>)}
              </dl>
            </div>
            <Alert tone="info">Les emprunteurs voient le coût total avant d’accepter. Une offre importante peut passer par un examen humain.</Alert>
          </div>)}
      </WizardFrame>
    </ActionForm>
  );
}
