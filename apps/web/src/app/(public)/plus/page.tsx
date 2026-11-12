import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, FileText, HandCoins, Lock, Mail, Receipt, Briefcase, ShieldCheck, Route } from 'lucide-react';

export const metadata: Metadata = { title: 'Plus' };
const T = [
  { href: '/comment-ca-marche', cls: 'tile-green', icon: Route, t: 'Comment ça marche' }, { href: '/emprunter', cls: 'tile-coral', icon: Briefcase, t: 'Emprunter' },
  { href: '/preter', cls: 'tile-sun', icon: HandCoins, t: 'Prêter' }, { href: '/securite', cls: 'tile-violet', icon: ShieldCheck, t: 'Sécurité' },
  { href: '/tarifs', cls: 'tile-sky', icon: Receipt, t: 'Tarifs' }, { href: '/contact', cls: 'tile-night', icon: Mail, t: 'Contact' },
  { href: '/conditions', cls: 'tile-night', icon: FileText, t: 'Conditions' }, { href: '/confidentialite', cls: 'tile-night', icon: Lock, t: 'Confidentialité' },
];
export default function Page() {
  return (
    <div className="container-x py-3 lg:py-12">
      <h1 className="mb-3 flex items-center gap-2 text-xl font-extrabold lg:text-3xl"><BookOpen className="h-6 w-6 text-primary" />Plus</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {T.map((x) => <Link key={x.href} href={x.href} className={`tile ${x.cls} aspect-[4/3]`}><x.icon className="h-7 w-7" strokeWidth={2.2} /><span className="text-base font-extrabold leading-tight">{x.t}</span></Link>)}
      </div>
    </div>
  );
}
