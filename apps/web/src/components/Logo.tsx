import clsx from 'clsx';
import { useId } from 'react';
export function LogoMark({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, '');   // identifiant unique : plusieurs logos peuvent coexister dans la page
  return (
    <svg viewBox="0 0 40 40" className={clsx('h-9 w-9', className)} aria-hidden="true">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0B4D3A" /><stop offset="1" stopColor="#10B981" /></linearGradient></defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gid})`} />
      <path d="M24 9v14.5a6.5 6.5 0 0 1-13 0" stroke="#F7F5EF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="15" cy="12" r="0" fill="#F7F5EF" />
    </svg>
  );
}
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={clsx('text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-fg')}>JURU</span>
    </span>
  );
}
