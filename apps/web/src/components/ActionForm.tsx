'use client';
import { useActionState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui';
import type { ActionState } from '@/lib/actions';
import clsx from 'clsx';

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** Formulaire branché sur une Server Action : état de chargement, erreur, confirmation. */
export function ActionForm({ action, children, submit, variant = 'primary', className, hideSubmit, fullWidth }:
  { action: Action; children?: ReactNode; submit: string; variant?: 'primary' | 'accent' | 'danger' | 'secondary' | 'outline'; className?: string; hideSubmit?: boolean; fullWidth?: boolean }) {
  const [state, run, pending] = useActionState(action, {} as ActionState);
  const v = { primary: 'bg-primary text-primary-fg', accent: 'bg-accent text-night', danger: 'bg-danger text-white', secondary: 'bg-surface-2 text-fg border border-border', outline: 'border border-border text-fg hover:bg-surface-2' }[variant];
  return (
    <form action={run} className={clsx('space-y-4', className)}>
      {children}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      {!hideSubmit && (
        <button type="submit" disabled={pending}
          className={clsx('inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition hover:brightness-110 active:scale-[.98] disabled:opacity-60', fullWidth && 'w-full py-3.5 text-base font-extrabold', v)}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pending ? 'Traitement…' : submit}
        </button>
      )}
    </form>
  );
}
