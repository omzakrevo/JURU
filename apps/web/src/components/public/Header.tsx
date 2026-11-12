'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV = [
  { href: '/comment-ca-marche', label: 'Comment ça marche' },
  { href: '/emprunter', label: 'Emprunter' },
  { href: '/preter', label: 'Prêter' },
  { href: '/securite', label: 'Sécurité' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/faq', label: 'FAQ' },
];

export function Header({ loggedIn }: { loggedIn: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/85 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="JURU — accueil"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={clsx('rounded-full px-3 py-2 text-sm font-medium transition hover:bg-surface-2', path === n.href && 'bg-primary-soft text-primary')}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {loggedIn ? (
            <Link href="/app" className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg sm:inline-flex">Mon espace</Link>
          ) : (
            <>
              <Link href="/connexion" className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:bg-surface-2 sm:inline-flex">Connexion</Link>
              <Link href="/inscription" className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg sm:inline-flex">Créer un compte</Link>
            </>
          )}
          <button className="rounded-full p-2 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-bg lg:hidden">
          <nav className="container-x flex flex-col gap-1 py-3" aria-label="Navigation mobile">
            {NAV.map((n) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-surface-2">{n.label}</Link>)}
            <div className="mt-2 flex gap-2">
              {loggedIn ? <Link href="/app" className="flex-1 rounded-full bg-primary px-4 py-3 text-center font-semibold text-primary-fg">Mon espace</Link> : (
                <>
                  <Link href="/connexion" className="flex-1 rounded-full border border-border px-4 py-3 text-center font-semibold">Connexion</Link>
                  <Link href="/inscription" className="flex-1 rounded-full bg-primary px-4 py-3 text-center font-semibold text-primary-fg">Créer un compte</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
