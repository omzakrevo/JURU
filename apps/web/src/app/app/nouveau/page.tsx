import Link from 'next/link';
import { Briefcase, HandCoins, LifeBuoy, MailOpen, ScanFace, Send } from 'lucide-react';
import { requireSession } from '@/lib/session';

export default async function Page() {
  const s = await requireSession();
  const tiles = [
    s.profile.is_borrower && { href: '/app/demandes/nouvelle', cls: 'tile-coral', icon: Briefcase, t: 'Demander un financement', d: 'De 5 000 à 500 000 FCFA' },
    s.profile.is_lender && { href: '/app/offres/nouvelle', cls: 'tile-sun', icon: HandCoins, t: 'Publier une offre', d: 'Prêtez à vos conditions' },
    { href: '/app/marche', cls: 'tile-sky', icon: Send, t: 'Parcourir le marché', d: 'Offres et demandes' },
    { href: '/app/propositions', cls: 'tile-green', icon: MailOpen, t: 'Mes propositions', d: 'Reçues et envoyées' },
    { href: '/app/litiges', cls: 'tile-night', icon: LifeBuoy, t: 'Aide & litiges', d: 'Un souci ? Écrivez-nous' },
    s.profile.kyc_status !== 'approved' && { href: '/app/kyc', cls: 'tile-violet', icon: ScanFace, t: 'Vérifier mon identité', d: 'Obligatoire pour démarrer' },
  ].filter(Boolean) as { href: string; cls: string; icon: typeof Send; t: string; d: string }[];
  return (
    <div className="grid grid-cols-2 gap-4">
      {tiles.map((x) => (
        <Link key={x.href} href={x.href} className={`tile ${x.cls} aspect-[5/4]`}>
          <x.icon className="h-9 w-9" strokeWidth={2.2} />
          <span><span className="block text-lg font-semibold leading-tight">{x.t}</span><span className="mt-1 block text-xs font-semibold opacity-80">{x.d}</span></span>
        </Link>))}
    </div>
  );
}
