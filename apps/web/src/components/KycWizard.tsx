'use client';
import { useMemo, useState } from 'react';
import { Camera, Check, IdCard, Loader2, Smile } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { Alert } from '@/components/ui';
import { Tile, WizardFrame } from '@/components/wizard';
import { createClient } from '@/lib/supabase/client';
import { submitKyc } from '@/app/actions/app';

type Kind = 'front' | 'back' | 'selfie';
const DOCS = [['cnib', 'CNIB', 'tile-green'], ['passport', 'Passeport', 'tile-sky'], ['driving_license', 'Permis de conduire', 'tile-sun'], ['residence_card', 'Carte de séjour', 'tile-violet']] as const;
const COPY: Record<Kind, { title: string; hint: string; icon: typeof Camera }> = {
  front: { title: 'Recto de la pièce', hint: 'Posez la pièce à plat, bien éclairée, tous les coins visibles.', icon: IdCard },
  back: { title: 'Verso de la pièce', hint: 'Même chose pour le dos de la pièce.', icon: IdCard },
  selfie: { title: 'Un selfie avec la pièce', hint: 'Tenez la pièce à côté de votre visage, sans lunettes ni masque.', icon: Smile },
};

/** Vérification d'identité en parcours étape par étape : les fichiers partent dans le stockage PRIVÉ (dossier = id utilisateur). */
export function KycWizard({ userId }: { userId: string }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState('cnib');
  const [paths, setPaths] = useState<Partial<Record<Kind, string>>>({});
  const [previews, setPreviews] = useState<Partial<Record<Kind, string>>>({});
  const [busy, setBusy] = useState<Kind | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [last4, setLast4] = useState('');
  const [expiry, setExpiry] = useState('');
  const [consent, setConsent] = useState(false);
  const [folder] = useState(() => crypto.randomUUID());

  const photos: Kind[] = useMemo(() => (type === 'passport' ? ['front', 'selfie'] : ['front', 'back', 'selfie']), [type]);
  const labels = ['Pièce', ...photos.map((k) => ({ front: 'Recto', back: 'Verso', selfie: 'Selfie' }[k])), 'Détails', 'Envoi'];
  const kindAt = (i: number): Kind | null => (i >= 1 && i <= photos.length ? photos[i - 1]! : null);
  const kind = kindAt(step);

  async function upload(k: Kind, file: File | undefined) {
    if (!file) return;
    setErr(null);
    if (file.size > 5 * 1024 * 1024) return setErr('Fichier trop volumineux (5 Mo maximum).');
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) return setErr('Formats acceptés : JPG, PNG, PDF.');
    setBusy(k);
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
    const path = `${userId}/${folder}/${k}.${ext}`;
    const { error } = await createClient().storage.from('kyc-documents').upload(path, file, { upsert: false, contentType: file.type });
    setBusy(null);
    if (error) return setErr('Envoi impossible. Vérifiez votre connexion et réessayez.');
    setPaths((p) => ({ ...p, [k]: path }));
    if (file.type !== 'application/pdf') setPreviews((p) => ({ ...p, [k]: URL.createObjectURL(file) }));
  }

  const canNext = kind ? Boolean(paths[kind]) && busy === null : step === photos.length + 1 ? /^[A-Za-z0-9]{0,4}$/.test(last4) : true;
  const lastStep = labels.length - 1;
  const isDetails = step === photos.length + 1;

  return (
    <ActionForm action={submitKyc} submit="" hideSubmit className="flex min-h-full flex-1 flex-col !space-y-0">
      <input type="hidden" name="document_type" value={type} /><input type="hidden" name="last4" value={last4} /><input type="hidden" name="expiry" value={expiry} />
      <input type="hidden" name="front_path" value={paths.front ?? ''} /><input type="hidden" name="back_path" value={paths.back ?? ''} /><input type="hidden" name="selfie_path" value={paths.selfie ?? ''} />
      {consent && <input type="hidden" name="consent" value="on" />}
      <WizardFrame labels={labels} step={step} setStep={setStep} canNext={canNext} canSubmit={consent && Boolean(paths.front && paths.selfie && (type === 'passport' || paths.back))} submitLabel="Envoyer mon dossier">
        {step === 0 && (
          <div className="flex h-full flex-col justify-center gap-4">
            <h2 className="text-center text-xl font-semibold">Quelle pièce utilisez-vous ?</h2>
            <div className="grid grid-cols-2 gap-3">{DOCS.map(([k, v, c]) => <Tile key={k} on={type === k} cls={c} onClick={() => { setType(k); setPaths({}); setPreviews({}); }} label={v}><span className="py-5 text-base font-semibold">{v}</span></Tile>)}</div>
            <p className="text-center text-xs text-muted">Nous ne gardons jamais le numéro complet : seulement les 4 derniers caractères.</p>
          </div>)}
        {kind && (() => { const C = COPY[kind]; return (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-xl font-semibold">{C.title}</h2>
            <p className="max-w-[18rem] text-sm text-muted">{C.hint}</p>
            <label className="relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed border-primary/40 bg-surface shadow-card active:scale-[.98]">
              {previews[kind] ? (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), next/image ne s'applique pas
                <img src={previews[kind]} alt={`Aperçu : ${C.title}`} className="absolute inset-0 h-full w-full object-cover" />
              ) : <><span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">{busy === kind ? <Loader2 className="h-7 w-7 animate-spin" /> : <C.icon className="h-7 w-7" />}</span><span className="mt-3 text-sm font-semibold">{busy === kind ? 'Envoi sécurisé…' : 'Appuyez pour prendre la photo'}</span></>}
              {paths[kind] && <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[#08281A]"><Check className="h-5 w-5" strokeWidth={3} /></span>}
              <input type="file" accept="image/jpeg,image/png,application/pdf" capture={kind === 'selfie' ? 'user' : 'environment'} onChange={(e) => upload(kind, e.target.files?.[0])} className="sr-only" aria-label={C.title} />
            </label>
            {paths[kind] && <p className="text-xs font-semibold text-success">Envoyé de façon sécurisée · touchez pour reprendre</p>}
            {err && <Alert tone="danger">{err}</Alert>}
          </div>); })()}
        {isDetails && (
          <div className="flex h-full flex-col justify-center gap-4">
            <h2 className="text-center text-xl font-semibold">Derniers détails</h2>
            <label className="block"><span className="label">4 derniers caractères du numéro</span><input value={last4} onChange={(e) => setLast4(e.target.value.slice(0, 4))} maxLength={4} className="input text-center text-2xl font-semibold tracking-[0.4em]" placeholder="••••" /></label>
            <label className="block"><span className="label">Date d’expiration</span><input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="input" /></label>
          </div>)}
        {step === lastStep && (
          <div className="flex h-full flex-col justify-center gap-4">
            <h2 className="text-center text-xl font-semibold">Dernière étape</h2>
            <div className="rounded-3xl bg-surface p-4 shadow-card"><ul className="space-y-1.5 text-sm font-semibold">
              {([['Pièce', DOCS.find((d) => d[0] === type)![1]], ...photos.map((k) => [COPY[k].title, paths[k] ? '✓ envoyé' : '—']), ['Numéro', last4 ? `•••${last4}` : '—']] as string[][]).map(([k, v]) => <li key={k} className="flex justify-between"><span className="text-muted">{k}</span><span>{v}</span></li>)}</ul></div>
            <label className="flex items-start gap-3 rounded-3xl border border-border bg-surface p-4 text-sm shadow-card"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--primary))]" /><span>Je consens explicitement à ce que JURU traite mes documents et mon selfie pour vérifier mon identité et prévenir la fraude.</span></label>
          </div>)}
      </WizardFrame>
    </ActionForm>
  );
}
