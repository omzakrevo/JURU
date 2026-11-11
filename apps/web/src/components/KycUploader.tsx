'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ActionForm } from '@/components/ActionForm';
import { Alert, Field, Input, Select } from '@/components/ui';
import { submitKyc } from '@/app/actions/app';

/** Dépose les fichiers dans le bucket PRIVÉ (dossier = id utilisateur, imposé par RLS), puis soumet les chemins. */
export function KycUploader({ userId }: { userId: string }) {
  const [paths, setPaths] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [folder] = useState(() => crypto.randomUUID());

  async function upload(kind: 'front' | 'back' | 'selfie', file: File | undefined) {
    if (!file) return;
    setErr(null);
    if (file.size > 5 * 1024 * 1024) return setErr('Fichier trop volumineux (5 Mo maximum).');
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) return setErr('Formats acceptés : JPG, PNG, PDF.');
    setBusy(kind);
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
    const path = `${userId}/${folder}/${kind}.${ext}`;
    const { error } = await createClient().storage.from('kyc-documents').upload(path, file, { upsert: false, contentType: file.type });
    setBusy(null);
    if (error) return setErr('Envoi impossible : ' + error.message);
    setPaths((p) => ({ ...p, [kind]: path }));
  }
  const ready = paths.front && paths.selfie;
  return (
    <ActionForm action={submitKyc} submit="Envoyer pour vérification" hideSubmit={!ready}>
      <input type="hidden" name="front_path" value={paths.front ?? ''} /><input type="hidden" name="back_path" value={paths.back ?? ''} /><input type="hidden" name="selfie_path" value={paths.selfie ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type de pièce" htmlFor="document_type"><Select id="document_type" name="document_type"><option value="cnib">CNIB</option><option value="passport">Passeport</option><option value="driving_license">Permis de conduire</option><option value="residence_card">Carte de séjour</option></Select></Field>
        <Field label="4 derniers caractères du numéro" htmlFor="last4" help="Nous ne stockons jamais le numéro complet."><Input id="last4" name="last4" maxLength={4} /></Field>
        <Field label="Date d’expiration" htmlFor="expiry"><Input id="expiry" name="expiry" type="date" /></Field>
      </div>
      {(['front', 'back', 'selfie'] as const).map((k) => (
        <Field key={k} label={{ front: 'Pièce — recto (obligatoire)', back: 'Pièce — verso (sauf passeport)', selfie: 'Selfie tenant la pièce (obligatoire)' }[k]} htmlFor={k}>
          <input id={k} type="file" accept="image/jpeg,image/png,application/pdf" capture={k === 'selfie' ? 'user' : undefined} onChange={(e) => upload(k, e.target.files?.[0])} className="input file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-fg" />
          <p className="help">{busy === k ? 'Envoi…' : paths[k] ? '✓ Envoyé de façon sécurisée' : ' '}</p>
        </Field>
      ))}
      {err && <Alert tone="danger">{err}</Alert>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" />
        <span>Je consens explicitement à ce que KREDIA traite mes documents d’identité et mon selfie pour vérifier mon identité et prévenir la fraude (voir la politique de confidentialité).</span></label>
    </ActionForm>
  );
}
