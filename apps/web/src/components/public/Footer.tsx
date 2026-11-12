import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function Footer() {
  const cols = [
    { t: 'Produit', l: [['/comment-ca-marche', 'Comment ça marche'], ['/emprunter', 'Emprunter'], ['/preter', 'Prêter'], ['/tarifs', 'Tarifs']] },
    { t: 'Confiance', l: [['/securite', 'Sécurité'], ['/faq', 'FAQ'], ['/contact', 'Contact']] },
    { t: 'Légal', l: [['/conditions', 'Conditions d’utilisation'], ['/confidentialite', 'Confidentialité']] },
  ];
  return (
    <footer className="mt-24 bg-night text-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo light />
          <p className="mt-3 max-w-xs text-sm text-white/70">Le financement, en toute confiance.</p>
          <p className="mt-4 text-xs text-white/50">Burkina Faso · bientôt UEMOA</p>
        </div>
        {cols.map((c) => (
          <div key={c.t}>
            <h3 className="text-sm font-semibold text-white">{c.t}</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {c.l.map(([h, label]) => <li key={h}><Link href={h!} className="hover:text-white">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="container-x py-6 text-xs leading-relaxed text-white/60">
          JURU est une plateforme de mise en relation entre emprunteurs et prêteurs. JURU n’est pas un établissement financier agréé
          et ne conserve pas les fonds des utilisateurs sur un compte ordinaire : les flux transitent par des partenaires autorisés.
          Emprunter engage et doit être remboursé. Le nom « JURU » est provisoire. © {new Date().getFullYear()} JURU.
        </p>
      </div>
    </footer>
  );
}
