import clsx from 'clsx';
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={clsx('h-9 w-9', className)} aria-hidden="true">
      <defs><linearGradient id="kg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0B4D3A" /><stop offset="1" stopColor="#10B981" /></linearGradient></defs>
      <rect width="40" height="40" rx="11" fill="url(#kg)" />
      <path d="M13 10v20M13 21l11-11M16.5 18l9.5 12" stroke="#F7F5EF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="28.5" cy="12" r="2.4" fill="#F7F5EF" />
    </svg>
  );
}
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={clsx('text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-fg')}>KREDIA</span>
    </span>
  );
}
