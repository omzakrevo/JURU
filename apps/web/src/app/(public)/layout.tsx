import { DemoBanner } from '@/components/DemoBanner';
import { Footer } from '@/components/public/Footer';
import { Header } from '@/components/public/Header';
import { PublicMobileNav } from '@/components/public/MobileNav';
import { getSession } from '@/lib/session';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="flex h-dvh flex-col lg:block lg:h-auto">
      <DemoBanner compact />
      <Header loggedIn={!!session} />
      <main id="contenu" className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:overflow-visible">
        {children}
        <div className="hidden lg:block"><Footer /></div>
      </main>
      <PublicMobileNav />
    </div>
  );
}
