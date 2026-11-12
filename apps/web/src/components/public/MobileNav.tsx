'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Calculator, CircleHelp, Grid2x2, Home } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Accueil', icon: Home, exact: true },
  { href: '/simulateur', label: 'Simuler', icon: Calculator },
  { href: '/faq', label: 'Aide', icon: CircleHelp },
  { href: '/plus', label: 'Plus', icon: Grid2x2 },
];

/** Barre d'onglets du site public sur téléphone (style application). */
export function PublicMobileNav() {
  const path = usePathname();
  const on = (h: string, exact?: boolean) => (exact ? path === h : path === h || path.startsWith(h + '/'));
  return (
    <nav className="relative z-20 flex shrink-0 border-t border-border bg-surface px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1 shadow-[0_-8px_24px_-12px_rgb(30_41_110/.25)] lg:hidden" aria-label="Navigation mobile">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={clsx('flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-bold', on(t.href, t.exact) ? 'text-primary' : 'text-muted')}>
          <span className={clsx('flex h-8 w-14 items-center justify-center rounded-full transition', on(t.href, t.exact) && 'bg-primary-soft')}><t.icon className="h-[22px] w-[22px]" strokeWidth={on(t.href, t.exact) ? 2.6 : 2} /></span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
