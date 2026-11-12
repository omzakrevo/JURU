import Link from 'next/link';
import { Briefcase, Calculator, HandCoins, ShieldCheck } from 'lucide-react';

/** Accueil « application » pour téléphone : un seul écran, des tuiles carrées. */
export function MobileHome() {
  const tiles = [
    { href: '/emprunter', cls: 'tile-coral', icon: Briefcase, t: 'Emprunter', d: '5 000 à 500 000 F' },
    { href: '/preter', cls: 'tile-sun', icon: HandCoins, t: 'Prêter', d: 'À vos conditions' },
    { href: '/simulateur', cls: 'tile-sky', icon: Calculator, t: 'Simuler', d: 'Coût total clair' },
    { href: '/securite', cls: 'tile-violet', icon: ShieldCheck, t: 'Sécurité', d: 'KYC & contrats' },
  ];
  return (
    <div className="flex flex-col gap-3 px-4 py-3 lg:hidden">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#19D38A] via-[#10B981] to-[#0E9F6E] p-5 text-night shadow-card">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
        <p className="text-xs font-extrabold uppercase tracking-wide opacity-70">Burkina Faso · bientôt UEMOA</p>
        <h1 className="mt-1 text-[26px] font-black leading-[1.05]">Le financement,<br />en toute confiance.</h1>
        <div className="mt-4 flex gap-2">
          <Link href="/inscription" className="flex-1 rounded-full bg-night px-4 py-3 text-center text-sm font-extrabold text-white active:scale-95">Créer mon compte</Link>
          <Link href="/connexion" className="rounded-full bg-white/80 px-4 py-3 text-sm font-extrabold active:scale-95">Connexion</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((x) => (
          <Link key={x.href} href={x.href} className={`tile ${x.cls} aspect-square [@media(max-height:760px)]:aspect-[4/3]`}>
            <x.icon className="h-9 w-9" strokeWidth={2.2} />
            <span><span className="block text-xl font-extrabold leading-tight">{x.t}</span><span className="text-xs font-bold opacity-85">{x.d}</span></span>
          </Link>
        ))}
      </div>
      <p className="text-center text-[11px] font-semibold text-muted">Plateforme de mise en relation — pas une banque. Aucun frais caché.</p>
    </div>
  );
}
