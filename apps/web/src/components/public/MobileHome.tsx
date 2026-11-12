import Link from 'next/link';
import { ArrowRight, Package, ShieldCheck, ShoppingBasket, Truck } from 'lucide-react';

const AMOUNTS = [20000, 50000, 100000, 200000];
const USES = [{ icon: Package, t: 'Acheter un équipement' }, { icon: ShoppingBasket, t: 'Renouveler le stock' }, { icon: Truck, t: 'Honorer une commande' }];

/** Accueil « application » (téléphone), après la présentation : accroche entrepreneur, montants rapides, inscription. */
export function MobileHome() {
  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pb-2 pt-1 lg:hidden">
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[34px] bg-[#14452F] px-6 pb-6 pt-7 text-white shadow-[0_28px_50px_-26px_rgb(15_51_36/.95)]">
        <p className="relative text-xs font-semibold text-[#BFE8CF]">Pour les entrepreneurs</p>
        <h1 className="display relative mt-2 text-[42px]">Votre activité<br />ne peut pas<br /><span className="text-[#BFE8CF]">attendre.</span></h1>
        <p className="relative mt-3 max-w-[19rem] text-[15px] leading-snug text-white/75">Un équipement à payer ? Un stock à renouveler ? Obtenez de 5 000 à 500 000 FCFA, puis remboursez à votre rythme.</p>
        <div className="relative mt-5"><p className="mb-2 text-xs font-semibold text-white/60">De combien avez-vous besoin ?</p>
          <div className="grid grid-cols-4 gap-2">{AMOUNTS.map((a) => <Link key={a} href={`/simulateur?montant=${a}`} className="rounded-2xl bg-white/12 py-3 text-center text-sm font-semibold ring-1 ring-white/15 active:scale-95 hover:bg-white/20">{a / 1000}k</Link>)}</div></div>
        <div className="relative mt-4 flex flex-wrap gap-2">{USES.map((u) => <span key={u.t} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold"><u.icon className="h-3.5 w-3.5 text-[#BFE8CF]" />{u.t}</span>)}</div>
        <div className="relative mt-auto pt-5">
          <Link href="/inscription" className="flex items-center justify-center gap-2 rounded-xl bg-[#F7F4EA] py-4 text-base font-semibold text-[#0F3324] shadow-[0_14px_28px_-14px_rgb(0_0_0/.6)] active:scale-[.98]">Créer mon compte <ArrowRight className="h-5 w-5" strokeWidth={2.8} /></Link>
          <Link href="/connexion" className="mt-3 block text-center text-sm font-semibold text-white/80">J’ai déjà un compte</Link>
        </div>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-muted"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Plateforme de mise en relation · pas une banque · aucun frais caché</p>
    </div>
  );
}
