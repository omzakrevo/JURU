import clsx from 'clsx';
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={clsx('h-9 w-9', className)} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#14452F" />
      <path d="M24 9v14.5a6.5 6.5 0 0 1-13 0" stroke="#F7F5EF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={clsx('text-xl font-semibold tracking-tight', light ? 'text-white' : 'text-fg')}>JURU</span>
    </span>
  );
}
