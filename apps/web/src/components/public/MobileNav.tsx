'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Calculator, CircleHelp, Grid2x2, Home } from 'lucide-react';

const TABS: { href: string; label: string; icon: typeof Home; exact?: boolean }[] = [
  { href: '/accueil', label: 'Accueil', icon: Home },
  { href: '/simulateur', label: 'Simuler', icon: Calculator },
  { href: '/faq', label: 'Aide', icon: CircleHelp },
  { href: '/plus', label: 'Plus', icon: Grid2x2 },
];

/** Barre d'onglets du site public sur téléphone (style application). */
export function PublicMobileNav() {
  const path = usePathname();
  const on = (h: string, exact?: boolean) => (exact ? path === h : path === h || path.startsWith(h + '/'));
  return (
    <nav className="relative z-20 shrink-0 px-5 pb-[max(env(safe-area-inset-bottom),12px)] pt-1 lg:hidden" aria-label="Navigation mobile">
      <div className="mx-auto flex max-w-sm items-center justify-between rounded-full bg-[#0F1F18] p-1.5 shadow-[0_18px_34px_-14px_rgb(15_31_24/.7)]">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} aria-label={t.label} title={t.label} className={clsx('flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-extrabold transition', on(t.href, t.exact) ? 'bg-white px-4 text-[#0F1F18]' : 'text-white/60')}>
            <t.icon className="h-[22px] w-[22px] shrink-0" strokeWidth={on(t.href, t.exact) ? 2.6 : 2} />
            {on(t.href, t.exact) && <span>{t.label}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}
