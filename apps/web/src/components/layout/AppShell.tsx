'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ArrowLeft, Bell, Briefcase, FileText, HandCoins, Home, LayoutDashboard, LifeBuoy, LogOut, Plus, ScanFace, Search, Send, Shield, User, X } from 'lucide-react';
import { Logo, LogoMark } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { signOut } from '@/app/actions/auth';

const NAV = [
  { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/app/demandes', label: 'Mes demandes', icon: Briefcase },
  { href: '/app/offres', label: 'Mes offres', icon: HandCoins },
  { href: '/app/marche', label: 'Marché', icon: Search },
  { href: '/app/propositions', label: 'Propositions', icon: Send },
  { href: '/app/credits', label: 'Mes crédits', icon: FileText },
  { href: '/app/notifications', label: 'Notifications', icon: Bell },
  { href: '/app/litiges', label: 'Litiges', icon: LifeBuoy },
  { href: '/app/kyc', label: 'Identité (KYC)', icon: ScanFace },
  { href: '/app/profil', label: 'Profil', icon: User },
];

const TITLES: [string, string][] = [
  ['/app/demandes/nouvelle', 'Ma demande'], ['/app/offres/nouvelle', 'Mon offre'], ['/app/nouveau', 'Que voulez-vous faire ?'],
  ['/app/demandes', 'Mes demandes'], ['/app/offres', 'Mes offres'], ['/app/marche', 'Marché'], ['/app/propositions', 'Propositions'],
  ['/app/credits', 'Mes crédits'], ['/app/contrats', 'Contrat'], ['/app/financement', 'Financer'], ['/app/notifications', 'Alertes'],
  ['/app/litiges', 'Litiges'], ['/app/kyc', 'Mon identité'], ['/app/profil', 'Mon profil'],
];

type Tab = { href: string; label: string; icon: typeof Home; exact?: boolean };
const TABS_L: Tab[] = [{ href: '/app', label: 'Accueil', icon: Home, exact: true }, { href: '/app/marche', label: 'Marché', icon: Search }];
const TABS_R: Tab[] = [{ href: '/app/credits', label: 'Crédits', icon: FileText }, { href: '/app/profil', label: 'Profil', icon: User }];

export function AppShell({ children, name, unread, isStaff, banner, pathOverride }: { children: React.ReactNode; name: string; unread: number; isStaff: boolean; banner?: React.ReactNode; pathOverride?: string }) {
  const realPath = usePathname();
  const path = pathOverride ?? realPath;
  const router = useRouter();
  const active = (h: string, exact?: boolean) => (exact ? path === h : path === h || path.startsWith(h + '/'));
  const root = path === '/app';
  const immersive = path.endsWith('/nouvelle'); // parcours plein écran : pas de barre d'onglets
  const title = root ? 'JURU' : (TITLES.find(([p]) => path.startsWith(p))?.[1] ?? 'JURU');

  const TabLink = ({ t }: { t: Tab }) => (
    <Link href={t.href} className={clsx('flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-bold transition', active(t.href, t.exact) ? 'text-primary' : 'text-muted')}>
      <span className={clsx('flex h-8 w-14 items-center justify-center rounded-full transition', active(t.href, t.exact) && 'bg-primary-soft')}><t.icon className="h-[22px] w-[22px]" strokeWidth={active(t.href, t.exact) ? 2.6 : 2} /></span>
      {t.label}
    </Link>
  );

  return (
    <div className="flex h-dvh flex-col lg:block lg:h-auto">
      {banner}
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[260px_1fr]">
        {/* ----- Bureau : menu latéral ----- */}
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface p-4 lg:flex">
          <Link href="/app" className="px-2 py-2"><Logo /></Link>
          <nav className="mt-6 flex-1 space-y-1 overflow-y-auto" aria-label="Navigation de l'espace">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-surface-2', active(n.href, n.exact) && 'bg-primary-soft text-primary')}>
                <n.icon className="h-[18px] w-[18px]" />{n.label}
                {n.href === '/app/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-accent px-2 text-xs font-bold text-night">{unread}</span>}
              </Link>
            ))}
            {isStaff && <Link href="/admin" className="mt-3 flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm font-medium hover:bg-surface-2"><Shield className="h-[18px] w-[18px]" />Administration</Link>}
          </nav>
          <div className="border-t border-border pt-3">
            <p className="truncate px-2 text-sm font-semibold">{name}</p>
            <div className="mt-2 flex items-center justify-between"><ThemeToggle />
              <form action={signOut}><button className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted hover:bg-surface-2"><LogOut className="h-4 w-4" />Déconnexion</button></form></div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* ----- Mobile : barre du haut ----- */}
          <header className="relative z-20 flex h-14 shrink-0 items-center justify-between bg-gradient-to-r from-[#0F1B4C] to-[#2B3C9C] px-3 text-white lg:hidden">
            <div className="flex w-11 justify-start">
              {immersive ? <button aria-label="Fermer" onClick={() => router.push('/app')} className="rounded-full p-2 hover:bg-white/10"><X className="h-6 w-6" /></button>
                : root ? <LogoMark className="h-8 w-8" /> : <button aria-label="Retour" onClick={() => router.back()} className="rounded-full p-2 hover:bg-white/10"><ArrowLeft className="h-6 w-6" /></button>}
            </div>
            <h1 className="truncate text-base font-extrabold tracking-tight">{title}</h1>
            <div className="flex w-11 justify-end">
              <Link href="/app/notifications" aria-label={`Alertes${unread ? ` (${unread})` : ''}`} className="relative rounded-full p-2 hover:bg-white/10">
                <Bell className="h-6 w-6" />{unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFBE1E] px-1 text-[10px] font-extrabold text-night">{unread > 9 ? '9+' : unread}</span>}
              </Link>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-3 lg:block lg:overflow-visible lg:px-0 lg:py-0">
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col lg:block lg:px-6 lg:pb-12 lg:pt-8">{children}</div>
          </main>

          {/* ----- Mobile : barre d'onglets ----- */}
          {!immersive && (
            <nav className="relative z-20 flex shrink-0 items-end border-t border-border bg-surface px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1 shadow-[0_-8px_24px_-12px_rgb(30_41_110/.25)] lg:hidden" aria-label="Navigation mobile">
              {TABS_L.map((t) => <TabLink key={t.href} t={t} />)}
              <div className="flex flex-1 justify-center">
                <Link href="/app/nouveau" aria-label="Nouveau" className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD43B] to-[#FF7A1C] text-night shadow-[0_10px_24px_-8px_rgb(255_122_28/.9)] ring-4 ring-surface transition active:scale-90"><span aria-hidden className="halo absolute inset-0 rounded-full bg-[#FFB01E]" /><Plus className="relative h-8 w-8" strokeWidth={3} /></Link>
              </div>
              {TABS_R.map((t) => <TabLink key={t.href} t={t} />)}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
