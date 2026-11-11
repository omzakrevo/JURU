'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Bell, Briefcase, FileText, HandCoins, LayoutDashboard, LifeBuoy, LogOut, ScanFace, Search, Send, Shield, User } from 'lucide-react';
import { Logo } from '@/components/Logo';
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
const MOBILE = ['/app', '/app/marche', '/app/credits', '/app/notifications', '/app/profil'];

export function AppShell({ children, name, unread, isStaff }: { children: React.ReactNode; name: string; unread: number; isStaff: boolean }) {
  const path = usePathname();
  const active = (h: string, exact?: boolean) => (exact ? path === h : path === h || path.startsWith(h + '/'));
  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr]">
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
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/85 px-4 py-2.5 backdrop-blur lg:hidden">
          <Link href="/app"><Logo /></Link>
          <div className="flex items-center gap-1"><ThemeToggle /><form action={signOut}><button aria-label="Déconnexion" className="rounded-full p-2 hover:bg-surface-2"><LogOut className="h-5 w-5" /></button></form></div>
        </header>
        <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navigation mobile">
          {NAV.filter((n) => MOBILE.includes(n.href)).map((n) => (
            <Link key={n.href} href={n.href} className={clsx('relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', active(n.href, n.exact) ? 'text-primary' : 'text-muted')}>
              <n.icon className="h-5 w-5" />{n.label.split(' ')[0]}
              {n.href === '/app/notifications' && unread > 0 && <span className="absolute right-[28%] top-1 h-2 w-2 rounded-full bg-accent" />}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
