'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  return (
    <>
      {/* Mobile : en-tête clair */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between px-4 lg:hidden">
        <Link href="/accueil" aria-label="JURU — accueil"><Logo /></Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {loggedIn ? <Link href="/app" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg">Mon espace</Link>
            : <Link href="/connexion" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg">Connexion</Link>}
        </div>
      </header>
      {/* Bureau */}
      <header className="sticky top-0 z-40 hidden border-b border-border/70 bg-bg/85 backdrop-blur-md lg:block">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="JURU — accueil"><Logo /></Link>
          <nav className="flex items-center gap-1" aria-label="Navigation principale">
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
              <Link href="/app" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Mon espace</Link>
            ) : (
              <>
                <Link href="/connexion" className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-surface-2">Connexion</Link>
                <Link href="/inscription" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Créer un compte</Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
