import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { DemoBanner } from '@/components/DemoBanner';
import { LogoMark } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';


export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner compact />
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative overflow-hidden bg-[#14452F] px-6 pb-14 pt-4 text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
          <div className="relative z-10 flex items-center justify-between"><Link href="/accueil" aria-label="Retour" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 lg:hidden"><ArrowLeft className="h-5 w-5" /></Link><span className="hidden lg:block" /><ThemeToggle /></div>
          <div className="relative z-10 mt-3 flex flex-col items-center text-center lg:mt-0 lg:items-start lg:text-left">
            <div><LogoMark className="h-16 w-16 lg:h-20 lg:w-20" /></div>
            <p className="mt-3 text-2xl font-semibold tracking-tight lg:mt-6 lg:text-5xl lg:leading-[1.05]">JURU<span className="hidden lg:inline"><br />Votre activité ne peut pas attendre.</span></p>
            <p className="mt-1 text-sm text-white/70 lg:mt-4 lg:max-w-sm lg:text-base">Le financement rapide des entrepreneurs.</p>
          </div>
          <p className="relative hidden items-center gap-2 text-sm text-white/60 lg:flex"><ShieldCheck className="h-4 w-4 text-[#BFE8CF]" /> Vos données sont protégées. JURU ne détient pas vos fonds.</p>
        </aside>
        <main className="relative -mt-8 flex flex-1 flex-col rounded-t-[36px] bg-bg px-6 pb-10 pt-9 shadow-[0_-24px_44px_-22px_rgb(0_0_0/.55)] lg:mt-0 lg:justify-center lg:rounded-none lg:px-14 lg:shadow-none">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
