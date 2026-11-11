import { DemoBanner } from '@/components/DemoBanner';
import { Footer } from '@/components/public/Footer';
import { Header } from '@/components/public/Header';
import { getSession } from '@/lib/session';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <>
      <DemoBanner />
      <Header loggedIn={!!session} />
      <main id="contenu">{children}</main>
      <Footer />
    </>
  );
}
