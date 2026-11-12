import Link from 'next/link';
import clsx from 'clsx';
import { Children, cloneElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { statusInfo, type Tone } from '@/lib/constants';
import { Inbox } from 'lucide-react';

const btn = {
  primary: 'bg-primary text-primary-fg hover:brightness-110 shadow-[0_8px_20px_-10px_rgb(20_69_47/.8)]',
  accent: 'bg-accent text-night hover:brightness-105 shadow-[0_8px_20px_-10px_rgb(47_191_113/.8)]',
  secondary: 'bg-surface-2 text-fg hover:brightness-95 border border-border',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:brightness-110',
  outline: 'border border-border text-fg hover:bg-surface-2',
};
const sizes = { sm: 'px-3.5 py-2 text-sm', md: 'px-5 py-3 text-sm', lg: 'px-6 py-3.5 text-base' };

type BtnProps = { variant?: keyof typeof btn; size?: keyof typeof sizes; className?: string };
const btnClass = ({ variant = 'primary', size = 'md', className }: BtnProps) =>
  clsx('inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[.97] disabled:pointer-events-none disabled:opacity-50', btn[variant], sizes[size], className);

export function Button({ variant, size, className, ...p }: ComponentProps<'button'> & BtnProps) {
  return <button {...p} className={btnClass({ variant, size, className })} />;
}
export function ButtonLink({ variant, size, className, ...p }: ComponentProps<typeof Link> & BtnProps) {
  return <Link {...p} className={btnClass({ variant, size, className })} />;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted', success: 'bg-success/15 text-success', warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger', info: 'bg-info/15 text-info',
};
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}
export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = statusInfo(status);
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Card({ children, className, ...p }: ComponentProps<'div'>) {
  return <div {...p} className={clsx('card p-5 sm:p-6', className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2 lg:mb-6 lg:gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 max-w-2xl text-xs text-muted sm:text-sm lg:mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {icon && <span className="rounded-xl bg-primary-soft p-2 text-primary">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 rounded-2xl bg-primary-soft p-3 text-primary">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ tone = 'info', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={clsx('rounded-xl border px-4 py-3 text-sm', {
      'border-info/30 bg-info/10': tone === 'info', 'border-success/30 bg-success/10': tone === 'success',
      'border-warning/30 bg-warning/10': tone === 'warning', 'border-danger/30 bg-danger/10': tone === 'danger',
      'border-border bg-surface-2': tone === 'neutral' })}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={clsx(title && 'mt-0.5', 'text-fg/90')}>{children}</div>}
    </div>
  );
}

export function Field({ label, help, children, htmlFor }: { label: string; help?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {help && <p className="help">{help}</p>}
    </div>
  );
}
export const Input = (p: ComponentProps<'input'>) => <input {...p} className={clsx('input', p.className)} />;
export const Textarea = (p: ComponentProps<'textarea'>) => <textarea rows={3} {...p} className={clsx('input', p.className)} />;
export const Select = (p: ComponentProps<'select'>) => <select {...p} className={clsx('input pr-8', p.className)} />;

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: ReactNode }) {
  // Sur mobile, chaque ligne devient une carte : l'étiquette de colonne est injectée dans chaque cellule (data-label).
  const rows = Children.map(children, (row) =>
    isValidElement(row)
      ? cloneElement(row as ReactElement<any>, {}, Children.map((row as ReactElement<any>).props.children, (cell, i) =>
          isValidElement(cell) ? cloneElement(cell as ReactElement<any>, { 'data-label': head[i] ?? '' } as any) : cell))
      : row);
  return (
    <div className="card overflow-hidden p-0 max-md:border-0 max-md:bg-transparent max-md:shadow-none">
      <div className="md:overflow-x-auto">
        <table className="w-full text-left text-sm md:min-w-[640px] max-md:block">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted max-md:hidden">
            <tr>{head.map((h) => <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border max-md:block max-md:space-y-3 max-md:divide-y-0 [&>tr]:max-md:block [&>tr]:max-md:rounded-3xl [&>tr]:max-md:border [&>tr]:max-md:border-border [&>tr]:max-md:bg-surface [&>tr]:max-md:p-3 [&>tr]:max-md:shadow-card">{rows}</tbody>
        </table>
      </div>
      {empty}
    </div>
  );
}
export const Td = (p: ComponentProps<'td'>) => <td {...p} className={clsx('px-4 py-3 align-middle max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-2 max-md:py-1.5 max-md:text-right before:max-md:text-left before:max-md:text-xs before:max-md:font-semibold before:max-md:text-muted before:max-md:content-[attr(data-label)]', p.className)} />;

export function KV({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) { return <div className={clsx('skeleton', className)} />; }
