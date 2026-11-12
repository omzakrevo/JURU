'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { BarChart3, Building2, FileText, Globe2, Inbox, LayoutDashboard, LifeBuoy, LogOut, Receipt, ScanFace, ScrollText, Shield, ShieldCheck, Users, Briefcase, HandCoins, BookOpen } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { signOut } from '@/app/actions/auth';

const ITEMS = [
  ['dashboard', '/admin', 'Tableau de bord', LayoutDashboard], ['kyc', '/admin/kyc', 'KYC', ScanFace], ['demandes', '/admin/demandes', 'Demandes', Briefcase],
  ['offres', '/admin/offres', 'Offres', HandCoins], ['credits', '/admin/credits', 'Crédits', FileText], ['validations', '/admin/validations', 'Double validation', ShieldCheck],
  ['transactions', '/admin/transactions', 'Transactions', Receipt], ['ledger', '/admin/ledger', 'Grand livre', BookOpen], ['litiges', '/admin/litiges', 'Litiges', LifeBuoy],
  ['utilisateurs', '/admin/utilisateurs', 'Utilisateurs', Users], ['partenaires', '/admin/partenaires', 'Partenaires', Building2], ['pays', '/admin/pays', 'Pays & règles', Globe2],
  ['audit', '/admin/audit', 'Audit', ScrollText], ['rapports', '/admin/rapports', 'Rapports', BarChart3], ['messages', '/admin/messages', 'Messages', Inbox],
] as const;

export function AdminShell({ children, sections, name, roles }: { children: React.ReactNode; sections: string[]; name: string; roles: string }) {
  const path = usePathname();
  const items = ITEMS.filter((i) => sections.includes(i[0]));
  return (
    <div className="lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-night p-4 text-white lg:flex">
        <Link href="/admin" className="flex items-center gap-2 px-2 py-2"><Logo light /><span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">Admin</span></Link>
        <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto">
          {items.map(([k, href, label, Icon]) => <Link key={k} href={href} className={clsx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-white/10', (href === '/admin' ? path === href : path.startsWith(href)) && 'bg-white/15 font-semibold')}><Icon className="h-4 w-4" />{label}</Link>)}
          <Link href="/app" className="mt-3 flex items-center gap-3 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10"><Shield className="h-4 w-4" />Mon espace</Link>
        </nav>
        <div className="border-t border-white/10 pt-3 text-sm"><p className="truncate font-semibold">{name}</p><p className="truncate text-xs text-white/60">{roles}</p>
          <div className="mt-2 flex items-center justify-between"><ThemeToggle /><form action={signOut}><button className="flex items-center gap-2 rounded-full px-3 py-2 text-white/70 hover:bg-white/10"><LogOut className="h-4 w-4" />Quitter</button></form></div></div>
      </aside>
      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex gap-1 overflow-x-auto border-b border-border bg-bg/90 px-3 py-2 backdrop-blur lg:hidden">
          {items.map(([k, href, label]) => <Link key={k} href={href} className={clsx('whitespace-nowrap rounded-full px-3 py-1.5 text-sm', (href === '/admin' ? path === href : path.startsWith(href)) ? 'bg-primary text-primary-fg' : 'bg-surface-2')}>{label}</Link>)}
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
