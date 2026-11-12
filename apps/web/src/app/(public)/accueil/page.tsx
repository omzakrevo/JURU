import type { Metadata } from 'next';
import Link from 'next/link';
import { MobileHome } from '@/components/public/MobileHome';

export const metadata: Metadata = { title: 'Accueil' };

/** Accueil « application » (téléphone) après la présentation : inscription, connexion, accès rapides. Sur ordinateur : retour au site. */
export default function Page() {
  return (
    <>
      <MobileHome />
      <div className="container-x hidden py-16 text-center lg:block"><p className="text-muted">Cette page est conçue pour téléphone.</p><Link href="/" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-fg">Aller à l’accueil du site</Link></div>
    </>
  );
}
