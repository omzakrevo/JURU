import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

/** Illustration abstraite : carte, pièce « J » et piédestal (aucune image externe). */
function Illustration() {
  return (
    <svg viewBox="0 0 260 200" className="mx-auto h-full max-h-[210px] w-full" aria-hidden="true">
      <ellipse cx="130" cy="176" rx="96" ry="14" fill="#06241A" opacity=".55" />
      <ellipse cx="130" cy="166" rx="84" ry="12" fill="#1F6B49" />
      <ellipse cx="130" cy="160" rx="84" ry="12" fill="#2A8A5E" />
      <g transform="rotate(-9 120 100)">
        <rect x="46" y="58" width="150" height="96" rx="18" fill="#0C2F22" />
        <rect x="46" y="58" width="150" height="96" rx="18" fill="none" stroke="#2F8F63" strokeWidth="2" />
        <rect x="60" y="82" width="34" height="26" rx="6" fill="#D8F0E2" opacity=".9" />
        <rect x="60" y="122" width="70" height="8" rx="4" fill="#2F8F63" />
        <rect x="60" y="136" width="44" height="6" rx="3" fill="#1F6B49" />
      </g>
      <g transform="rotate(8 170 70)">
        <rect x="110" y="34" width="112" height="70" rx="14" fill="#BFE8CF" />
        <rect x="110" y="48" width="112" height="14" fill="#8CCFA8" />
        <rect x="122" y="76" width="40" height="6" rx="3" fill="#5FAE85" />
        <rect x="122" y="88" width="24" height="6" rx="3" fill="#8CCFA8" />
      </g>
      <circle cx="198" cy="128" r="30" fill="#F4C84A" />
      <circle cx="198" cy="128" r="24" fill="none" stroke="#C99A1C" strokeWidth="2.5" />
      <text x="198" y="138" textAnchor="middle" fontSize="30" fontWeight="900" fill="#8A6500" fontFamily="Inter, sans-serif">J</text>
      <circle cx="46" cy="40" r="5" fill="#BFE8CF" opacity=".7" /><circle cx="228" cy="34" r="3.5" fill="#F4C84A" /><circle cx="30" cy="110" r="3" fill="#BFE8CF" opacity=".5" />
    </svg>
  );
}

/** Accueil « application » pour téléphone : un seul écran vert profond, un gros titre, un bouton. */
export function MobileHome() {
  return (
    <div className="flex min-h-full flex-col px-4 pb-2 pt-1 lg:hidden">
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[34px] bg-gradient-to-b from-[#1B5A3D] to-[#0C2D20] px-6 pb-6 pt-7 text-white shadow-[0_28px_50px_-26px_rgb(15_51_36/.95)]">
        <div className="drift pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#BFE8CF]/15 blur-3xl" />
        <div className="relative flex items-center gap-2" aria-hidden><span className="text-xs font-bold text-white/70">01 / 03</span><span className="h-1 w-16 rounded-full bg-white" /><span className="h-1 w-10 rounded-full bg-white/25" /><span className="h-1 w-10 rounded-full bg-white/25" /></div>
        <h1 className="relative mt-6 text-[40px] font-black leading-[1.02] tracking-tight">Votre argent,<br /><span className="text-[#BFE8CF]">en toute confiance.</span></h1>
        <p className="relative mt-3 max-w-[18rem] text-[15px] leading-snug text-white/75">Empruntez ou prêtez entre personnes vérifiées, avec un coût toujours affiché.</p>
        <div className="relative my-3 flex min-h-0 flex-1 items-center"><div className="breathe w-full"><Illustration /></div></div>
        <Link href="/inscription" className="relative flex items-center justify-center gap-2 rounded-full bg-[#F7F4EA] py-4 text-base font-extrabold text-[#0F3324] shadow-[0_14px_28px_-14px_rgb(0_0_0/.6)] active:scale-[.98]">Commencer <ArrowRight className="h-5 w-5" strokeWidth={2.8} /></Link>
        <Link href="/emprunter" className="relative mt-3 text-center text-sm font-bold text-white/80">Découvrir comment ça marche</Link>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-muted"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Plateforme de mise en relation · pas une banque · aucun frais caché</p>
    </div>
  );
}
