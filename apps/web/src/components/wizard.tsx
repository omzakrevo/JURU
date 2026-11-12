'use client';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Check, GraduationCap, Home, Loader2, Siren, Sprout, Stethoscope, Store, Truck, Wrench, Circle, type LucideIcon } from 'lucide-react';
import { useFormStatus } from 'react-dom';

export const ICONS: Record<string, LucideIcon> = { commerce: Store, agriculture: Sprout, education: GraduationCap, health: Stethoscope, housing: Home, equipment: Wrench, emergency: Siren, transport: Truck, other: Circle };
export function PurposeIcon({ k, className = 'h-7 w-7' }: { k: string; className?: string }) { const I = ICONS[k] ?? Circle; return <I className={className} strokeWidth={1.5} aria-hidden />; }
export const COLORS = ['tile-coral', 'tile-sun', 'tile-sky', 'tile-violet', 'tile-green', 'tile-coral', 'tile-sky', 'tile-sun', 'tile-violet'];

export function SubmitButton({ label, pendingLabel = 'Envoi…', disabled = false }: { label: string; pendingLabel?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-medium text-primary-fg transition-transform active:scale-[.98] disabled:opacity-50">
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" strokeWidth={3} />}{pending ? pendingLabel : label}
    </button>
  );
}

export function Tile({ on, children, cls, onClick, label }: { on: boolean; children: React.ReactNode; cls: string; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label} className={clsx('tile items-center justify-center text-center transition', cls, on ? 'ring-2 ring-primary' : '')}>
      {children}{on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-night text-white"><Check className="h-3 w-3" strokeWidth={4} /></span>}
    </button>
  );
}

/** Cadre commun des parcours : progression, titre d'étape, boutons Retour / Continuer (ou envoi à la dernière étape). */
export function WizardFrame({ labels, step, setStep, canNext = true, canSubmit = true, submitLabel, children, skipLabel }: {
  labels: string[]; step: number; setStep: (n: number) => void; canNext?: boolean; canSubmit?: boolean; submitLabel: string; children: React.ReactNode; skipLabel?: string;
}) {
  const last = step === labels.length - 1;
  return (
    <>
      <div className="mb-3 flex gap-1" aria-label={`Étape ${step + 1} sur ${labels.length}`}>
        {labels.map((s, i) => <div key={s} className={clsx('h-1.5 flex-1 rounded-full transition-all', i <= step ? 'bg-primary' : 'bg-border')} />)}
      </div>
      <p className="mb-2 text-xs font-semibold text-muted">{step + 1}/{labels.length} · {labels[step]}</p>
      <div className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter' && !last && (e.target as HTMLElement).tagName !== 'BUTTON') e.preventDefault(); }}>{children}</div>
      <div className="mt-4 flex gap-3 pb-1">
        {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-surface-2 py-3.5 text-sm font-semibold active:scale-95"><ArrowLeft className="h-4 w-4" />Retour</button>}
        {!last
          ? <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-semibold text-primary-fg shadow-[0_8px_20px_-10px_rgb(20_69_47/.8)] active:scale-95 disabled:opacity-40">{skipLabel ?? 'Continuer'}<ArrowRight className="h-5 w-5" strokeWidth={3} /></button>
          : <SubmitButton label={submitLabel} disabled={!canSubmit} />}
      </div>
    </>
  );
}
