import type { ComponentProps, ReactNode } from 'react';

/** Champ de connexion en relief (dégradé, profondeur, halo vert au focus). */
export function AuthInput({ label, icon, lead, id, className, ...p }: { label: string; icon?: ReactNode; lead?: ReactNode } & ComponentProps<'input'>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-extrabold">{label}</label>
      <div className="field-lg">
        {icon}
        {lead && <><span className="flex shrink-0 items-center gap-1.5 text-lg font-extrabold text-muted">{lead}</span><span className="h-7 w-px bg-border" aria-hidden /></>}
        <input id={id} {...p} />
      </div>
    </div>
  );
}
