import type { ComponentProps, ReactNode } from 'react';

/** Champ de connexion (surface unie, liseré net, anneau au focus). */
export function AuthInput({ label, icon, lead, id, className, ...p }: { label: string; icon?: ReactNode; lead?: ReactNode } & ComponentProps<'input'>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
      <div className="field-lg">
        {icon}
        {lead && <><span className="flex shrink-0 items-center gap-1.5 text-lg font-semibold text-muted">{lead}</span><span className="h-7 w-px bg-border" aria-hidden /></>}
        <input id={id} {...p} />
      </div>
    </div>
  );
}
