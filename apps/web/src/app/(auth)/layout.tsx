import Link from 'next/link';
import { DemoBanner } from '@/components/DemoBanner';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ShieldCheck } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <DemoBanner />
      <div className="grid min-h-[calc(100dvh-30px)] lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-night p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
          <Link href="/"><Logo light /></Link>
          <div className="relative">
            <h2 className="text-4xl font-extrabold leading-tight">Le financement,<br />en toute confiance.</h2>
            <p className="mt-4 max-w-md text-white/70">Emprunteurs et prêteurs vérifiés, contrats transparents, partenaires réglementés.</p>
            <p className="mt-8 flex items-center gap-2 text-sm text-white/60"><ShieldCheck className="h-4 w-4 text-accent" /> Vos données sont protégées. JURU ne détient pas vos fonds.</p>
          </div>
          <p className="relative text-xs text-white/40">Burkina Faso · UEMOA</p>
        </aside>
        <main className="flex flex-col">
          <div className="flex items-center justify-between p-4 lg:justify-end"><Link href="/" className="lg:hidden"><Logo /></Link><ThemeToggle /></div>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
