'use client';
import { useActionState } from 'react';
import { Alert } from '@/components/ui';
import type { ActionState } from '@/lib/actions';
import { kycDocumentUrl } from '@/app/actions/admin';
import { useState } from 'react';

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;
export function DecisionForm({ action, id, yes = ['approve', 'Approuver'], no = ['reject', 'Refuser'], extra, reasonLabel = 'Motif (obligatoire en cas de refus)', field = 'reason' }:
  { action: Action; id: string; yes?: [string, string]; no?: [string, string]; extra?: [string, string]; reasonLabel?: string; field?: string }) {
  const [state, run, pending] = useActionState(action, {} as ActionState);
  return (
    <form action={run} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input name={field} placeholder={reasonLabel} aria-label={reasonLabel} className="input" />
      <div className="flex flex-wrap gap-2">
        <button name="decision" value={yes[0]} disabled={pending} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-50">{yes[1]}</button>
        {extra && <button name="decision" value={extra[0]} disabled={pending} className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">{extra[1]}</button>}
        <button name="decision" value={no[0]} disabled={pending} className="rounded-full border border-danger/40 px-4 py-2 text-sm font-semibold text-danger disabled:opacity-50">{no[1]}</button>
      </div>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.message}</Alert>}
    </form>
  );
}

export function KycDocs({ submissionId, paths }: { submissionId: string; paths: { label: string; path: string | null }[] }) {
  const [err, setErr] = useState<string | null>(null);
  async function open(path: string) {
    setErr(null);
    const url = await kycDocumentUrl(submissionId, path);
    if (url) window.open(url, '_blank', 'noopener,noreferrer'); else setErr('Accès refusé ou document introuvable.');
  }
  return (
    <div><div className="flex flex-wrap gap-2">{paths.filter((p) => p.path).map((p) => <button key={p.label} type="button" onClick={() => open(p.path!)} className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2">Voir {p.label}</button>)}</div>
      <p className="mt-1 text-xs text-muted">Lien valable 60 s — chaque consultation est journalisée.</p>{err && <p className="text-sm text-danger">{err}</p>}</div>
  );
}
